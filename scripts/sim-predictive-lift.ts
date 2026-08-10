// Stage 0 of the predictive-lift experiment (technical/10-predictive-lift-experiment.md).
//
// PURPOSE: this does NOT prove Aura has a data moat. It cannot: there is no real
// behavioral ground truth in the system, and sim-liquidity's "vibe" is the
// stated score predicting itself (circular). What this DOES do is answer the
// only question we can answer cheaply today:
//
//   "IF revealed behavior carries compatibility signal that the stated-preference
//    score can't see, how many labeled pairs (≈ real plans) would we need before
//    that signal is even statistically detectable?"
//
// It is a power analysis + a working measurement harness, run on real seed
// profiles (so scorePair's overlap distribution is realistic) but a SYNTHETIC
// hidden truth (so we control how much revealed-beyond-stated signal exists and
// sweep it).
//
// Method:
//   trueCompat(A,B) = wS·statedScoreN(A,B) + wL·latentCompat(A,B) + wN·noise
//     - statedScoreN: normalized scorePair(A,B)  -> what the product sees today
//     - latentCompat : from a hidden per-user trait vector NOT in the profile
//                      -> the "revealed" signal only behavior can surface
//     - wL is the knob: "how much of who-clicks is predictable beyond what people
//       state." Unknown in reality (future-considerations §3 suggests it's small),
//       so we sweep it.
//   clicked ~ Bernoulli(sigmoid(K·(trueCompat − μ)))       (noisy thin-slice label)
//
//   Baseline A: predict with statedScoreN. No training. What Aura does now.
//   Model    C: logistic matrix factorization on OBSERVED clicks — learns a
//               per-user embedding + the stated score as a feature, i.e. a
//               recommender that can recover latent structure A is blind to.
//   Baseline B (frontier LLM): intentionally omitted here. On synthetic latent
//               traits an LLM has nothing to read, so B is meaningless in Stage 0.
//               It is the decisive control in Stage 1 (real data) only.
//
//   We sweep M (observed pairs) × wL (latent signal), fit C many times over
//   fresh latent draws + observation samples, and report AUC(C) − AUC(A) with a
//   bootstrap-across-seeds 95% CI. The smallest M whose CI clears 0 is the
//   data-volume gate for that wL assumption.
//
// Honest limit: if the real world's wL is ~0 (who-clicks truly isn't predictable
// beyond stated prefs), no M helps and only Stage 1 can reveal that. This script
// tells you the cost of the bet under each assumption, not whether the bet wins.
//
// Run: npm run sim:predictive-lift        (optionally: -- --seeds=12 --r=8)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scorePair } from "../lib/match";
import type { User } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ----- config (CLI-overridable: --key=value) -------------------------------
const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.replace(/^--/, "").split("=");
    return [m[0], m[1] ?? "true"];
  }),
);
const num = (k: string, d: number) => (argv[k] !== undefined ? Number(argv[k]) : d);

const M_SWEEP = (argv.M ? argv.M.split(",").map(Number) : [200, 1000, 5000, 20000]);
const WL_SWEEP = (argv.wL ? argv.wL.split(",").map(Number) : [0.1, 0.25, 0.4]);
const SEEDS = num("seeds", 10); // latent+sample redraws -> across-seed CI
const R = num("r", 8); // MF embedding dim
const LATENT_DIM = num("latentDim", 6); // hidden true-trait dim
const TEST_FRAC = num("testFrac", 0.3);
const EPOCHS = num("epochs", 25);
const LR = num("lr", 0.05);
const L2 = num("l2", 0.02);
const K_SHARP = num("k", 6); // logistic sharpness of the click label
const OBS_PER_PLAN = num("obsPerPlan", 30); // ~6 people each rating ~5 others

// ----- tiny seeded PRNG (reproducible; avoids Math.random nondeterminism) ---
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rnd: () => number) {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// ----- load real seed profiles ---------------------------------------------
const users: User[] = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "users.json"), "utf8"),
);
const N = users.length;

// Precompute normalized stated score for every ordered pair (A != B).
// scorePair already lands in ~[0,1]; we standardize to mean0/sd1 then squash so
// A and C see the same feature scale.
const pairs: { a: number; b: number }[] = [];
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) pairs.push({ a: i, b: j });
const rawStated = pairs.map((p) => scorePair(users[p.a], users[p.b]));
const sMean = rawStated.reduce((x, y) => x + y, 0) / rawStated.length;
const sSd = Math.sqrt(rawStated.reduce((x, y) => x + (y - sMean) ** 2, 0) / rawStated.length) || 1;
const statedN = rawStated.map((v) => (v - sMean) / sSd); // z-scored stated feature
const pairIndex = new Map<number, number>();
pairs.forEach((p, i) => pairIndex.set(p.a * N + p.b, i));

// ----- metrics --------------------------------------------------------------
// ROC-AUC via Mann–Whitney U with average ranks for ties.
function auc(scores: number[], labels: number[]): number {
  const idx = scores.map((_, i) => i).sort((i, j) => scores[i] - scores[j]);
  const ranks = new Array(scores.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && scores[idx[j + 1]] === scores[idx[i]]) j++;
    const avg = (i + j) / 2 + 1; // 1-based average rank
    for (let k = i; k <= j; k++) ranks[idx[k]] = avg;
    i = j + 1;
  }
  let rankPos = 0, nPos = 0, nNeg = 0;
  for (let k = 0; k < labels.length; k++) {
    if (labels[k] === 1) { rankPos += ranks[k]; nPos++; } else nNeg++;
  }
  if (nPos === 0 || nNeg === 0) return NaN;
  return (rankPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

function pct(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// ----- one seed: build truth, sample obs, fit A & C, return AUCs ------------
function runSeed(seed: number, M: number, wL: number): { aucA: number; aucC: number } | null {
  const rnd = mulberry32(seed * 2654435761);
  const wS = 1 - wL - 0.15; // fixed 0.15 irreducible noise weight
  const wN = 0.15;

  // Hidden per-user latent traits (unit-ish), NOT visible to scorePair.
  const L: number[][] = users.map(() => Array.from({ length: LATENT_DIM }, () => gauss(rnd)));
  // latentCompat = cosine-ish alignment, z-scored across sampled pairs below.

  // Sample M unique ordered observed pairs.
  const chosen = new Set<number>();
  const total = pairs.length;
  const take = Math.min(M, total);
  while (chosen.size < take) chosen.add(Math.floor(rnd() * total));
  const obs = [...chosen];

  // latentCompat raw for the observed pairs, then z-score for scale parity.
  const latRaw = obs.map((pi) => {
    const { a, b } = pairs[pi];
    let dot = 0, na = 0, nb = 0;
    for (let d = 0; d < LATENT_DIM; d++) { dot += L[a][d] * L[b][d]; na += L[a][d] ** 2; nb += L[b][d] ** 2; }
    return dot / (Math.sqrt(na * nb) + 1e-9);
  });
  const lMean = latRaw.reduce((x, y) => x + y, 0) / latRaw.length;
  const lSd = Math.sqrt(latRaw.reduce((x, y) => x + (y - lMean) ** 2, 0) / latRaw.length) || 1;

  // Build labels.
  const rows = obs.map((pi, t) => {
    const s = statedN[pi];
    const lat = (latRaw[t] - lMean) / lSd;
    const noise = gauss(rnd);
    const trueC = wS * s + wL * lat + wN * noise;
    const clicked = rnd() < sigmoid(K_SHARP * trueC) ? 1 : 0;
    return { pi, a: pairs[pi].a, b: pairs[pi].b, s, clicked };
  });

  // Split (per-observation holdout: predict an unseen pairing for users you
  // already have history on — the real product question. Fully-cold users are a
  // separate, harder question out of scope for this power curve.)
  for (let t = rows.length - 1; t > 0; t--) { const k = Math.floor(rnd() * (t + 1)); [rows[t], rows[k]] = [rows[k], rows[t]]; }
  const nTest = Math.floor(rows.length * TEST_FRAC);
  const test = rows.slice(0, nTest);
  const train = rows.slice(nTest);
  if (train.length < 20 || test.length < 10) return null;

  // Baseline A: stated score only.
  const aucA = auc(test.map((r) => r.s), test.map((r) => r.clicked));

  // Model C: logistic MF.  logit = b0 + bS·s + <e_a,e_b> + ba + bb
  const e = users.map(() => Array.from({ length: R }, () => gauss(rnd) * 0.1));
  const bias = new Array(N).fill(0);
  let b0 = 0, bS = 0;
  for (let ep = 0; ep < EPOCHS; ep++) {
    // shuffle train each epoch
    for (let t = train.length - 1; t > 0; t--) { const k = Math.floor(rnd() * (t + 1)); [train[t], train[k]] = [train[k], train[t]]; }
    for (const r of train) {
      let dot = 0;
      for (let d = 0; d < R; d++) dot += e[r.a][d] * e[r.b][d];
      const logit = b0 + bS * r.s + dot + bias[r.a] + bias[r.b];
      const err = sigmoid(logit) - r.clicked; // dL/dlogit
      b0 -= LR * err;
      bS -= LR * (err * r.s);
      bias[r.a] -= LR * (err + L2 * bias[r.a]);
      bias[r.b] -= LR * (err + L2 * bias[r.b]);
      for (let d = 0; d < R; d++) {
        const ea = e[r.a][d], eb = e[r.b][d];
        e[r.a][d] -= LR * (err * eb + L2 * ea);
        e[r.b][d] -= LR * (err * ea + L2 * eb);
      }
    }
  }
  const aucC = auc(
    test.map((r) => {
      let dot = 0;
      for (let d = 0; d < R; d++) dot += e[r.a][d] * e[r.b][d];
      return b0 + bS * r.s + dot + bias[r.a] + bias[r.b];
    }),
    test.map((r) => r.clicked),
  );
  if (Number.isNaN(aucA) || Number.isNaN(aucC)) return null;
  return { aucA, aucC };
}

// ----- sweep ----------------------------------------------------------------
console.log(`Predictive-lift power analysis (Stage 0, SYNTHETIC truth)`);
console.log(`users=${N}  latentDim=${LATENT_DIM}  MF-dim=${R}  seeds=${SEEDS}  testFrac=${TEST_FRAC}`);
console.log(`Baseline A = stated score (scorePair). Model C = logistic MF on observed clicks.`);
console.log(`Baseline B (frontier LLM) is Stage-1-only; omitted here (nothing to read on synthetic traits).`);
console.log(`wL = fraction of who-clicks that is REVEALED-beyond-stated signal (the unknown; swept).\n`);

type Cell = { M: number; wL: number; meanA: number; meanC: number; lift: number; lo: number; hi: number; detectable: boolean };
const cells: Cell[] = [];

for (const wL of WL_SWEEP) {
  for (const M of M_SWEEP) {
    const lifts: number[] = [];
    const aA: number[] = [], aC: number[] = [];
    for (let s = 0; s < SEEDS; s++) {
      const r = runSeed(s + 1, M, wL);
      if (!r) continue;
      lifts.push(r.aucC - r.aucA);
      aA.push(r.aucA); aC.push(r.aucC);
    }
    if (!lifts.length) continue;
    const sorted = [...lifts].sort((x, y) => x - y);
    const lo = pct(sorted, 0.025), hi = pct(sorted, 0.975);
    cells.push({
      M, wL,
      meanA: aA.reduce((x, y) => x + y, 0) / aA.length,
      meanC: aC.reduce((x, y) => x + y, 0) / aC.length,
      lift: lifts.reduce((x, y) => x + y, 0) / lifts.length,
      lo, hi,
      detectable: lo > 0,
    });
  }
}

// ----- report ---------------------------------------------------------------
const f = (x: number) => (x >= 0 ? " " : "") + x.toFixed(3);
for (const wL of WL_SWEEP) {
  console.log(`── wL=${wL}  (assume ${Math.round(wL * 100)}% of who-clicks is behavior-only signal) ──`);
  console.log(`   M (pairs)  ≈plans   AUC_A   AUC_C    lift    95% CI            detectable`);
  for (const c of cells.filter((c) => c.wL === wL)) {
    const plans = Math.round(c.M / OBS_PER_PLAN);
    console.log(
      `   ${String(c.M).padStart(7)}  ${String(plans).padStart(6)}   ${c.meanA.toFixed(3)}   ${c.meanC.toFixed(3)}  ${f(c.lift)}   [${f(c.lo)}, ${f(c.hi)}]   ${c.detectable ? "YES" : "no"}`,
    );
  }
  const firstDetect = cells.filter((c) => c.wL === wL && c.detectable).sort((a, b) => a.M - b.M)[0];
  if (firstDetect)
    console.log(`   -> gate: ~${firstDetect.M} labeled pairs (≈${Math.round(firstDetect.M / OBS_PER_PLAN)} plans) before a moat at this wL is detectable.\n`);
  else
    console.log(`   -> gate: not detectable within the swept M. Need more data, or wL this low is effectively no moat.\n`);
}

console.log(`Reading it: pick the wL you actually believe (§3 argues it's LOW). The ≈plans`);
console.log(`gate at that wL is the real cost of the intelligence bet — how many real, rated`);
console.log(`plans you must run before Stage 1 could even prove a moat. Underpowered Stage 1`);
console.log(`runs below that gate produce a noisy null, not a real "no moat".`);
