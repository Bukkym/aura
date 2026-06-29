"use client";

import { useState } from "react";

// Minimal in-app "Ask Ora" chat. Posts to /api/ora/chat, which authenticates
// the user, grounds the answer in the knowledge base, and may run plan tools
// (the hero being natural-language refinement). Renders the reply and, when a
// tool produced or read a plan, a compact plan card.

type Role = "user" | "assistant";
interface Msg {
  role: Role;
  content: string;
}
interface PlanCard {
  activityType: string;
  place: { name: string; neighborhood: string };
  attendees: { displayName: string }[];
}

export default function AskOra() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [plan, setPlan] = useState<PlanCard | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const history = messages.slice(-10);
    const next = [...messages, { role: "user" as Role, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ora/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Ora returned ${res.status}`);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.plan) {
        setPlan({
          activityType: data.plan.activityType,
          place: data.plan.place,
          attendees: data.plan.attendees,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={wrap}>
      <div style={header}>Ask Ora</div>
      <div style={thread}>
        {messages.length === 0 && (
          <div style={hint}>
            What would you like to do today? Try &ldquo;make my plan more
            outdoorsy&rdquo; or ask how matching works.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={m.role === "user" ? userBubble : oraBubble}>
            {m.content}
          </div>
        ))}
        {plan && (
          <div style={planCard}>
            <div style={planTitle}>{plan.activityType}</div>
            <div style={planMeta}>
              {plan.place.name}, {plan.place.neighborhood}
            </div>
            <div style={planMeta}>
              with {plan.attendees.map((a) => a.displayName).join(", ") || "a new group"}
            </div>
          </div>
        )}
        {busy && <div style={oraBubble}>Ora is thinking...</div>}
        {error && <div style={errorBox}>{error}</div>}
      </div>
      <div style={inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Talk to Ora..."
          style={textInput}
        />
        <button onClick={send} disabled={busy} style={sendBtn}>
          Send
        </button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 460,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  background: "#FFFDF9",
  border: "1px solid #ECE6DA",
  borderRadius: 16,
  padding: 16,
};
const header: React.CSSProperties = { fontWeight: 700, fontSize: 18, color: "#2B2B2B" };
const thread: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minHeight: 200,
};
const hint: React.CSSProperties = { color: "#8A8275", fontSize: 14 };
const baseBubble: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  fontSize: 14,
  maxWidth: "85%",
  lineHeight: 1.4,
};
const userBubble: React.CSSProperties = {
  ...baseBubble,
  alignSelf: "flex-end",
  background: "#6C5CE7",
  color: "white",
};
const oraBubble: React.CSSProperties = {
  ...baseBubble,
  alignSelf: "flex-start",
  background: "#F3F0FF",
  color: "#2B2B2B",
};
const planCard: React.CSSProperties = {
  alignSelf: "stretch",
  background: "#FFF",
  border: "1px solid #E2DBCD",
  borderRadius: 12,
  padding: 12,
};
const planTitle: React.CSSProperties = { fontWeight: 600, textTransform: "capitalize" };
const planMeta: React.CSSProperties = { fontSize: 13, color: "#6b6357" };
const errorBox: React.CSSProperties = { color: "#B00020", fontSize: 13 };
const inputRow: React.CSSProperties = { display: "flex", gap: 8 };
const textInput: React.CSSProperties = {
  flex: 1,
  borderRadius: 10,
  border: "1px solid #E2DBCD",
  padding: "10px 12px",
  fontSize: 14,
};
const sendBtn: React.CSSProperties = {
  borderRadius: 10,
  border: "none",
  background: "#6C5CE7",
  color: "white",
  fontWeight: 600,
  padding: "0 16px",
  cursor: "pointer",
};
