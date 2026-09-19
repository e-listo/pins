// src/components/PinsApiStatus.tsx

"use client";

import { useEffect, useState } from "react";
import { getPinsApiHealth } from "@/src/lib/pinsApi";

export function PinsApiStatus() {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPinsApiHealth();
        if (!cancelled && data?.status === "ok") {
          setStatus("ok");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "idle") {
    return (
      <p className="text-xs text-slate-500">Memeriksa koneksi PINS API…</p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-xs text-red-600 font-semibold">
        Tidak dapat terhubung ke PINS API.
      </p>
    );
  }

  return (
    <p className="text-xs text-emerald-600 font-semibold">
      Terhubung ke PINS API (api-pins.dpupkp.my.id).
    </p>
  );
}
