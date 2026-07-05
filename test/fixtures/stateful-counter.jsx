import React, { useState, useEffect } from "react";

// Persists its count to localStorage so we can verify artie "remembers" state
// across relaunches (and that per-applet namespacing prevents collisions).
export default function StatefulCounter() {
  const [n, setN] = useState(() => Number(localStorage.getItem("count") || 0));
  useEffect(() => {
    localStorage.setItem("count", String(n));
  }, [n]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-slate-900 text-slate-100">
      <h1 className="text-2xl font-semibold">persisted count</h1>
      <div className="text-6xl font-bold tabular-nums" data-testid="count">{n}</div>
      <button
        onClick={() => setN((c) => c + 1)}
        className="rounded-lg bg-indigo-500 px-6 py-2 text-lg font-medium hover:bg-indigo-400"
      >
        increment
      </button>
    </div>
  );
}
