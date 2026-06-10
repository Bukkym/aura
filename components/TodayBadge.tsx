"use client";

// Small observable dashboard element: shows today's date in German format.
// Mounted client-side so the date reflects the user's local time, not the
// server's. Used in the Observability bootcamp exercise.
export function TodayBadge() {
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <p className="text-xs text-stone-400 text-center py-2 tracking-wide">
      {today}
    </p>
  );
}
