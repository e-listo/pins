"use client";

import Link from "next/link";
import { PinsApiStatus } from "@/src/components/PinsApiStatus";
import { PINS_API_URL } from "@/src/lib/pinsApi";

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1e293b] md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">
          Konektivitas Sistem
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          Status PINS API
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Pemeriksaan ini memastikan antarmuka PINS dapat menjangkau backend
          Flask tanpa membaca atau mengubah data inventaris.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <PinsApiStatus />
          <p className="mt-3 break-all text-[11px] text-slate-400">
            Endpoint: {PINS_API_URL}/health
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
          >
            Periksa ulang
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Kembali ke dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
