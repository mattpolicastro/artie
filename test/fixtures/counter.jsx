import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-slate-900 text-slate-100">
      <h1 className="text-3xl font-semibold tracking-tight">jsxwrap counter</h1>
      <div className="text-7xl font-bold tabular-nums">{count}</div>
      <div className="flex gap-3">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="rounded-lg bg-slate-700 px-5 py-2 text-lg font-medium hover:bg-slate-600 active:scale-95"
        >
          −
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-lg bg-indigo-500 px-5 py-2 text-lg font-medium hover:bg-indigo-400 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
