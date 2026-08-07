"use client";

// Aura public landing page. Shown to logged-out / not-yet-onboarded visitors at
// "/". The hero + nav CTA ("Get your first plan") route into onboarding at
// "/start". The bottom city-picker form is the density waitlist / demand signal;
// for now it confirms locally (a real waitlist store is a later slice).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./Landing.module.css";

const STEPS = [
  { n: "First", h: "Show up.", p: "Tell Ora your vibe. Ora picks the activity, the place, and a few people who fit, and handles everything. You just come." },
  { n: "Then", h: "Say who you clicked with.", p: "After each plan, one tap: who did you want to see again? That is all we ask.", faces: ["A", "N", "R"] },
  { n: "Every time", h: "We bring them back.", p: "Your next plan keeps the people you liked and adds a fresh face or two. It compounds instead of resetting.", faces: ["A", "N", "+1"] },
];

const FOR = [
  { c: "var(--persimmon)", b: "New to the city.", s: "You moved, and your people are still three time zones away." },
  { c: "var(--plum)", b: "Rebuilding your crew.", s: "Life shifted, and the old one drifted. You want a new one." },
  { c: "var(--teal)", b: "Done with the group-chat graveyard.", s: "Plans that die in “we should hang out soon.” You want them to actually happen." },
  { c: "var(--sage)", b: "Real friends, no logistics.", s: "No swiping, no awkward intros, no being the one who plans everything." },
];

export function Landing() {
  const [city, setCity] = useState("toronto");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // scroll reveals
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll(`.${styles.reveal}`));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add(styles.revealIn));
      return;
    }
    const io = new IntersectionObserver(
      (ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add(styles.revealIn); io.unobserve(en.target); } }),
      { threshold: 0.14 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  // Non-Toronto only: capture a waitlist email (local confirm for now). Toronto
  // visitors go straight into onboarding via the link, no email needed.
  const handleWaitlist = () => {
    if (!/.+@.+\..+/.test(email.trim())) return;
    setConfirm("Thanks. We'll tell you the moment Aura reaches your city.");
    setEmail("");
  };

  return (
    <div className={styles.page} ref={rootRef}>
      <nav className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navRow}`}>
          <div className={`${styles.brand} ${styles.serif}`}><b>a</b>ura</div>
          <div className={styles.navRight}>
            <span className={styles.cityPill}><span className={styles.dot} /> Now in Toronto</span>
            <Link href="/auth/login" className={styles.signIn}>Sign in</Link>
            <Link href="/start" className={`${styles.btn} ${styles.navCta}`}>Get your first plan</Link>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <h1 className={`${styles.h1} ${styles.serif}`}>Meet people you click with. Then <em>keep</em> seeing them.</h1>
            <p className={styles.sub}>Aura plans real nights out with a few people who actually fit you, then brings the ones you clicked with back. A few plans in, you have a crew, not a contact list.</p>
            <div className={styles.ctaRow}>
              <Link href="/start" className={`${styles.btn} ${styles.btnPlum}`}>Get your first plan</Link>
              <a href="#how" className={`${styles.btn} ${styles.btnOutline}`}>See how it works</a>
            </div>
            <p className={styles.microtrust}>No swiping. No profiles to browse. You just show up.</p>
          </div>
          <div className={`${styles.ringWrap} ${styles.heroRing}`}>
            <div className={styles.bloom} />
            <div className={styles.ring} />
          </div>
        </div>
      </section>

      <section className={styles.band} id="how">
        <div className={styles.wrap}>
          <span className={`${styles.lbl} ${styles.eyebrow} ${styles.reveal}`}>How it works</span>
          <h2 className={`${styles.h2} ${styles.serif} ${styles.reveal}`}>Three easy steps, and your crew comes together.</h2>
          <div className={styles.steps}>
            {STEPS.map((s) => (
              <div key={s.h} className={`${styles.step} ${styles.reveal}`}>
                <div className={styles.stepN}>{s.n}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
                {s.faces && (
                  <div className={styles.faces}>
                    {s.faces.map((f, i) => (
                      <span key={i} className={`${styles.face} ${f === "+1" ? styles.faceNew : ""}`}
                        style={f === "+1" ? undefined : { background: [ "var(--persimmon)", "var(--sage)", "var(--teal)" ][i] }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className={`${styles.arcNote} ${styles.serif} ${styles.reveal}`}>Plan by plan, the same faces keep showing up. <b>That is how a crew forms.</b></p>
        </div>
      </section>

      <section className={styles.band} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <span className={`${styles.lbl} ${styles.eyebrow} ${styles.reveal}`}>Why it&apos;s different</span>
          <h2 className={`${styles.h2} ${styles.serif} ${styles.reveal}`}>Not roulette. A crew that grows.</h2>
          <div className={styles.contrast}>
            <div className={`${styles.cbox} ${styles.cboxDim} ${styles.reveal}`}>
              <h4>The usual night out</h4>
              <p>A one-off dinner with strangers is fun once. Then you do it again with all-new strangers, and again. Nice evenings that never add up to anyone.</p>
              <div className={styles.scatter}>
                {Array.from({ length: 7 }).map((_, i) => <span key={i} className={styles.face} style={{ background: "var(--mut)" }}>·</span>)}
              </div>
            </div>
            <div className={`${styles.cbox} ${styles.cboxHot} ${styles.reveal}`}>
              <h4>The Aura way</h4>
              <p>Ora remembers who you clicked with and keeps bringing them back. Every plan compounds on the last, so the same people become familiar, then become yours.</p>
              <div className={styles.rowfaces}>
                {["Y", "A", "N", "R"].map((f, i) => (
                  <span key={f} className={styles.face} style={{ background: ["var(--plum)", "var(--persimmon)", "var(--sage)", "var(--teal)"][i] }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.band} ${styles.forBand}`}>
        <div className={styles.wrap}>
          <span className={`${styles.lbl} ${styles.eyebrow} ${styles.reveal}`}>Who it&apos;s for</span>
          <h2 className={`${styles.h2} ${styles.serif} ${styles.reveal}`}>If you&apos;re starting over socially, this is for you.</h2>
          <div className={styles.forGrid}>
            {FOR.map((f) => (
              <div key={f.b} className={`${styles.forItem} ${styles.reveal}`}>
                <span className={styles.forK} style={{ background: f.c }} />
                <p><b>{f.b}</b><small>{f.s}</small></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.band} ${styles.promise}`}>
        <div className={styles.wrap}>
          <p className={`${styles.promiseLine} ${styles.serif} ${styles.reveal}`}>Every plan is a great night, or we <span>make it right</span>. We handle the what, the where, and the when. You just show up.</p>
          <div className={`${styles.pledges} ${styles.reveal}`}>
            <span className={styles.pledge}><span className={styles.tick}>&#10003;</span> We plan everything</span>
            <span className={styles.pledge}><span className={styles.tick}>&#10003;</span> Small groups, people who fit</span>
            <span className={styles.pledge}><span className={styles.tick}>&#10003;</span> Your number stays private</span>
          </div>
        </div>
      </section>

      <section className={`${styles.band} ${styles.final}`} id="join">
        <div className={styles.wrap}>
          <div className={styles.ringWrap}><div className={styles.bloom} /><div className={styles.ring} /></div>
          <span className={`${styles.lbl} ${styles.eyebrow}`}>Aura is starting in Toronto</span>
          <h2 className={`${styles.h2} ${styles.serif}`} style={{ margin: "10px auto 0" }}>Be one of the first.</h2>
          <p className={styles.bandSub} style={{ marginInline: "auto" }}>
            {city === "toronto"
              ? "Tell Ora your vibe and get your first plan. Takes about a minute."
              : "Not in Toronto yet? Leave your email and we'll come to you."}
          </p>

          <div className={styles.signup}>
            <div className={styles.field}>
              <select aria-label="Your city" className={styles.select} value={city} onChange={(e) => { setCity(e.target.value); setConfirm(""); }}>
                <option value="toronto">Toronto</option>
                <option value="other">Somewhere else</option>
              </select>
            </div>
            {city === "toronto" ? (
              <Link href="/start" className={`${styles.btn} ${styles.btnPlum}`} style={{ flex: 1, justifyContent: "center" }}>
                Get your first plan
              </Link>
            ) : confirm ? (
              <div className={styles.confirm} style={{ flex: 1, margin: 0 }}>{confirm}</div>
            ) : (
              <>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" className={styles.email} style={{ flex: 1 }} />
                <button className={`${styles.btn} ${styles.btnPlum}`} type="button" onClick={handleWaitlist}>Join the waitlist</button>
              </>
            )}
          </div>
          <small className={styles.fine}>
            {city === "toronto" ? "No account to set up first, you just start." : "We'll only email you when Aura reaches your city."}
          </small>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerRow}`}>
          <div className={`${styles.brand} ${styles.serif}`}><b>a</b>ura</div>
          <p>Made for people who want their people. Your number always stays private.</p>
        </div>
      </footer>
    </div>
  );
}
