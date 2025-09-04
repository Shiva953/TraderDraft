import React from "react";

export function CreateToken() {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-neutral-200">
      <h3 className="mb-3 text-sm text-neutral-400">Create Trader Token</h3>
      <form className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Symbol
            <input className="mt-1 w-full rounded-md bg-neutral-800/60 px-3 py-2 outline-none" placeholder="GAI" />
          </label>
          <label className="text-sm">Ticker
            <input className="mt-1 w-full rounded-md bg-neutral-800/60 px-3 py-2 outline-none" placeholder="GAINZY" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Supply (fixed)
            <input className="mt-1 w-full rounded-md bg-neutral-800/60 px-3 py-2 outline-none" defaultValue="1000000000" />
          </label>
          <label className="text-sm">Swap Fee (%)
            <input className="mt-1 w-full rounded-md bg-neutral-800/60 px-3 py-2 outline-none" defaultValue="5" />
          </label>
        </div>
        <button type="button" className="w-full rounded-md bg-white py-2 text-neutral-900">Create Token</button>
      </form>
    </section>
  );
} 