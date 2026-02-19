"use client";

import { useEffect, useState } from "react";

type Health = "checking" | "ok" | "down";

export default function StatusDot() {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/sim?mode=ok", {
          cache: "no-store",
          headers: { "x-request-id": `health-${Date.now()}` },
        });

        if (cancelled) return;
        setHealth(res.ok ? "ok" : "down");
      } catch {
        if (cancelled) return;
        setHealth("down");
      }
    }

    check();
    const id = window.setInterval(check, 15000); // refresh every 15s

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const label =
    health === "checking" ? "Checking…" : health === "ok" ? "Healthy" : "Down";

  const dotClass =
    health === "checking"
      ? "bg-zinc-500"
      : health === "ok"
        ? "bg-emerald-400"
        : "bg-red-400";

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span className="relative flex h-2.5 w-2.5">
        {health === "ok" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass}`}
        />
      </span>
      <span>{label}</span>
    </div>
  );
}
