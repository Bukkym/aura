"use client";

import { useState } from "react";

// Entry point for the AI feedback pipeline (Exercise 18).
//
// A small chat/help icon, a message field, and a send button. On send it POSTs
// { message } to an n8n webhook, which classifies the message with an LLM and
// routes it (bug, feature request, match feedback, question, praise) before
// replying. Renders nothing unless NEXT_PUBLIC_N8N_WEBHOOK_URL is set, so it is
// safe to ship before the webhook exists.

type Reply = { category?: string; reply?: string };

export default function FeedbackWidget() {
  const webhook = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [reply, setReply] = useState<Reply | null>(null);

  if (!webhook) return null;

  async function send() {
    const text = message.trim();
    if (!text) return;
    setStatus("sending");
    setReply(null);
    try {
      const res = await fetch(webhook as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      // The webhook may answer with JSON ({category, reply}) or plain text.
      const raw = await res.text();
      let parsed: Reply = {};
      try {
        parsed = raw ? (JSON.parse(raw) as Reply) : {};
      } catch {
        parsed = { reply: raw };
      }
      setReply(parsed);
      setStatus("done");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={wrap}>
      {open && (
        <div style={panel}>
          <div style={panelHeader}>Tell Ora what you think</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="A bug, an idea, or how your last match felt..."
            rows={4}
            style={textarea}
          />
          <button onClick={send} disabled={status === "sending"} style={sendBtn}>
            {status === "sending" ? "Sending..." : "Send"}
          </button>
          {status === "done" && reply && (
            <div style={replyBox}>
              {reply.category && (
                <div style={replyTag}>Routed as: {reply.category}</div>
              )}
              <div>{reply.reply ?? "Thanks, we got it."}</div>
            </div>
          )}
          {status === "error" && (
            <div style={errorBox}>Could not send. Please try again.</div>
          )}
        </div>
      )}
      <button
        aria-label="Send feedback"
        onClick={() => setOpen((v) => !v)}
        style={fab}
      >
        {open ? "×" : "?"}
      </button>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 12,
};

const fab: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  border: "none",
  background: "#6C5CE7",
  color: "white",
  fontSize: 24,
  cursor: "pointer",
  boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
};

const panel: React.CSSProperties = {
  width: 300,
  background: "#FFFDF9",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  border: "1px solid #ECE6DA",
};

const panelHeader: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 8,
  color: "#2B2B2B",
};

const textarea: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #E2DBCD",
  padding: 10,
  resize: "vertical",
  fontFamily: "inherit",
  fontSize: 14,
};

const sendBtn: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: "10px 0",
  borderRadius: 10,
  border: "none",
  background: "#6C5CE7",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const replyBox: React.CSSProperties = {
  marginTop: 12,
  fontSize: 14,
  color: "#2B2B2B",
  background: "#F3F0FF",
  borderRadius: 10,
  padding: 10,
};

const replyTag: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6C5CE7",
  marginBottom: 4,
};

const errorBox: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: "#B00020",
};
