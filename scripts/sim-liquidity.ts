import { createClient } from "../lib/supabase/admin";
import { scorePair } from "../lib/match";
import { userFromRow } from "../lib/userRow";
import { canonAll } from "../lib/canon";
import type { User } from "../types";

// Liquidity / convergence simulation over the SEED pool. Answers: how big does a
// cluster need to be to keep a friendship cohort overlapping across a journey of
// plans? For each host we simulate R rounds of managed turnover: keep the people
// you click with, drop a churn fraction (lowest pairwise affinity), refill
// vacated seats from the rest of the cluster who share availability. We sweep
// the available cluster size N and report, per N: how often every round can be
// filled (liquidity) and how large a stable core forms by the end
// (convergence).
//
// Caveat: seed availability is synthetic and "vibe" is modeled as pairwise match
// score, so this validates the MECHANISM and yields a target threshold, not
// real-world proof. Run: npm run sim:liquidity

const K = 5; // cohort size (5 + host = a table of 6, matching TARGET_ATTENDEES)
const ROUNDS = 5; // a friendship journey is ~5 plans
const HOSTS_PER_CLUSTER = 6; // sampled hosts per cluster
const N_SWEEP = [6, 8, 10, 12, 15, 20, 25]; // available candidates in the cluster
const CHURN_RATES = [0.2, 0.4]; // fraction of the cohort dropped each round
const SUCCESS = { fillRate: 0.8, core: 3 }; // threshold: filled >=80%, stable core >=3

function availOverlap(a: string[] | undefined, b: string[] | undefined): boolean {
  const A = canonAll(a);
  const B = canonAll(b);
  if (!A.length || !B.length) return true;
  if (A.includes("anytime") || B.includes("anytime") || A.includes("flexible") || B.includes("flexible")) return true;
  return A.some((x) => B.includes(x));
}

interface Cand {
  id: string;
  user: User;
  avail: string[];
}

// One host's journey at a given available-pool size. Returns whether every round
// stayed full and the size of the stable core (present in the last two rounds).
function simulateJourney(host: User, poolSorted: Cand[], n: number, churn: number): { filledAll: boolean; core: number; unique: number } {
  const available = poolSorted
    .slice(0, n)
    .filter((c) => availOverlap(host.selfExtracted.availability, c.avail));

  // Pre-rank the available pool by affinity to the host (our proxy for vibe).
  const ranked = available
    .map((c) => ({ c, score: scorePair(host, c.user) }))
    .sort((a, b) => b.score - a.score);

  const dropPerRound = Math.floor(churn * K);
  const used = new Set<string>();
  const dropped = new Set<string>();
  let cohort: { c: Cand; score: number }[] = [];
  let filledAll = true;
  const lastTwo: Set<string>[] = [];

  for (let round = 0; round < ROUNDS; round++) {
    if (round === 0) {
      cohort = ranked.slice(0, K);
    } else {
      // Drop the lowest-affinity members (the ones you didn't click with).
      cohort.sort((a, b) => a.score - b.score);
      for (let d = 0; d < dropPerRound && cohort.length > 0; d++) {
        const out = cohort.shift()!;
        dropped.add(out.c.id);
      }
      // Refill vacated seats from the cluster: not currently in, not dropped.
      const inCohort = new Set(cohort.map((m) => m.c.id));
      const fresh = ranked.filter((r) => !inCohort.has(r.c.id) && !dropped.has(r.c.id));
      for (const r of fresh) {
        if (cohort.length >= K) break;
        cohort.push(r);
      }
    }
    for (const m of cohort) used.add(m.c.id);
    if (cohort.length < K) filledAll = false;
    const ids = new Set(cohort.map((m) => m.c.id));
    lastTwo.push(ids);
    if (lastTwo.length > 2) lastTwo.shift();
  }

  // Stable core: people present in BOTH of the last two rounds.
  let core = 0;
  if (lastTwo.length === 2) {
    for (const id of lastTwo[1]) if (lastTwo[0].has(id)) core++;
  }
  return { filledAll, core, unique: used.size };
}

async function main() {
  const sb = createClient();
  const { data, error } = await sb.from("users").select("*").not("archetype", "is", null);
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  // Group by cluster; build User objects + availability.
  const byCluster = new Map<string, Cand[]>();
  for (const r of rows) {
    const arch = r.archetype as string;
    const cand: Cand = { id: r.id, user: userFromRow(r), avail: (r.self_extracted?.availability ?? []) as string[] };
    const list = byCluster.get(arch) ?? [];
    list.push(cand);
    byCluster.set(arch, list);
  }

  console.log(`Clusters: ${[...byCluster.entries()].map(([a, l]) => `${a}(${l.length})`).join(", ")}`);
  console.log(`Sim: cohort K=${K}, rounds=${ROUNDS}, hosts/cluster=${HOSTS_PER_CLUSTER}; success = filled>=${SUCCESS.fillRate * 100}% & core>=${SUCCESS.core}\n`);

  for (const churn of CHURN_RATES) {
    console.log(`── churn ${churn * 100}% per round (drop ${Math.floor(churn * K)} of ${K}) ──`);
    console.log(`   N | filled% | avg core | avg unique seen`);
    let thresholdN: number | null = null;
    for (const n of N_SWEEP) {
      let runs = 0;
      let filled = 0;
      let coreSum = 0;
      let uniqueSum = 0;
      for (const [, members] of byCluster) {
        const hosts = members.slice(0, HOSTS_PER_CLUSTER);
        for (const h of hosts) {
          // Pool = the rest of this cluster, deterministic order by id.
          const pool = members.filter((m) => m.id !== h.id).sort((a, b) => a.id.localeCompare(b.id));
          const res = simulateJourney(h.user, pool, n, churn);
          runs++;
          if (res.filledAll) filled++;
          coreSum += res.core;
          uniqueSum += res.unique;
        }
      }
      const fillRate = filled / runs;
      const avgCore = coreSum / runs;
      const ok = fillRate >= SUCCESS.fillRate && avgCore >= SUCCESS.core;
      if (ok && thresholdN === null) thresholdN = n;
      console.log(
        `  ${String(n).padStart(2)} |  ${(fillRate * 100).toFixed(0).padStart(4)}% |   ${avgCore.toFixed(1)}   |   ${(uniqueSum / runs).toFixed(1)}${ok ? "   <= meets threshold" : ""}`,
      );
    }
    console.log(`   => minimum cluster pool that converges: ${thresholdN ?? "none in sweep"}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
