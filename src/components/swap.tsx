import React from "react";

export default function Swap() {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      <h3 className="mb-3 text-sm text-neutral-400">Swap</h3>
      <div className="space-y-3">
        <div className="rounded-lg bg-neutral-800/60 p-4">
          <div className="mb-1 text-xs text-neutral-400">Pay</div>
          <div className="flex items-center justify-between">
            <input className="w-full bg-transparent text-2xl outline-none" placeholder="0" />
            <div className="ml-3 rounded-md bg-neutral-900 px-2 py-1 text-xs">USDC</div>
          </div>
        </div>
        <div className="text-center text-neutral-500">⇅</div>
        <div className="rounded-lg bg-neutral-800/60 p-4">
          <div className="mb-1 text-xs text-neutral-400">Receive</div>
          <div className="flex items-center justify-between">
            <input className="w-full bg-transparent text-2xl outline-none" placeholder="0" />
            <div className="ml-3 rounded-md bg-neutral-900 px-2 py-1 text-xs">TICKER</div>
          </div>
        </div>
        <button className="mt-2 w-full rounded-md bg-white py-2 text-neutral-900">Preview Swap</button>
      </div>
    </section>
  );
} 