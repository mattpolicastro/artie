// Regression fixture: artifacts that import the `React` default binding must
// not get a second `import React` injected by the template (that was a
// "React has already been declared" SyntaxError -> blank window).
import React, { useState } from "react";

export default function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex h-full items-center justify-center bg-zinc-100">
      <button
        onClick={() => setOn((v) => !v)}
        className={`rounded-full px-8 py-3 text-lg font-semibold transition ${
          on ? "bg-emerald-500 text-white" : "bg-zinc-300 text-zinc-700"
        }`}
      >
        {on ? "ON" : "OFF"}
      </button>
    </div>
  );
}
