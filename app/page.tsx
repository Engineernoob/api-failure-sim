"use client";

import { useMemo, useState } from "react";

type Mode =
  | "ok"
  | "slow"
  | "timeout"
  | "error500"
  | "error503"
  | "corruptJson"
  | "reset"
  | "ratelimit";

const modes: { value: Mode; label: string; desc: string }[] = [
  { value: "ok", label: "OK (200)", desc: "Normal success response." },
  { value: "slow", label: "Slow (200)", desc: "Adds artificial latency." },
  {
    value: "timeout",
    label: "Timeout-ish (200)",
    desc: "Hangs long enough to timeout clients.",
  },
  { value: "error500", label: "Error (500)", desc: "Returns a 500 response." },
  { value: "error503", label: "Error (503)", desc: "Returns a 503 response." },
  {
    value: "corruptJson",
    label: "Corrupt JSON",
    desc: "Returns invalid JSON with JSON headers.",
  },
  {
    value: "reset",
    label: "Crash / Reset",
    desc: "Throws server error (simulated crash).",
  },
  {
    value: "ratelimit",
    label: "Rate Limit (429)",
    desc: "Limits requests per IP with headers.",
  },
];

function makeReqId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("slow");
  const [delayMs, setDelayMs] = useState(1500);
  const [status, setStatus] = useState(500);
  const [limit, setLimit] = useState(5);
  const [windowMs, setWindowMs] = useState(60000);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    status: number;
    headers: Record<string, string>;
    bodyText: string;
    tookMs: number;
    requestId: string;
    url: string;
  } | null>(null);

  const url = useMemo(() => {
    const u = new URL(
      "/api/sim",
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
    );

    u.searchParams.set("mode", mode);

    if (mode === "slow" || mode === "timeout") {
      u.searchParams.set("delayMs", String(delayMs));
    }

    if (mode === "error500") {
      u.searchParams.set("status", String(status));
    }

    if (mode === "ratelimit") {
      u.searchParams.set("limit", String(limit));
      u.searchParams.set("windowMs", String(windowMs));
    }

    return u.pathname + "?" + u.searchParams.toString();
  }, [mode, delayMs, status, limit, windowMs]);

  const curl = useMemo(() => {
    const rid = result?.requestId ?? "YOUR_REQUEST_ID";
    return `curl -i -H "x-request-id: ${rid}" "http://localhost:3000${url}"`;
  }, [url, result?.requestId]);

  const selected = useMemo(() => modes.find((m) => m.value === mode)!, [mode]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const run = async () => {
    setLoading(true);
    setResult(null);

    const requestId = makeReqId();
    const started = performance.now();

    try {
      const res = await fetch(url, {
        headers: { "x-request-id": requestId },
        cache: "no-store",
      });

      const text = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));

      setResult({
        ok: res.ok,
        status: res.status,
        headers,
        bodyText: text,
        tookMs: Math.round(performance.now() - started),
        requestId,
        url,
      });
    } catch (e: unknown) {
      setResult({
        ok: false,
        status: 0,
        headers: {},
        bodyText: getErrorMessage(e),
        tookMs: Math.round(performance.now() - started),
        requestId,
        url,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              API Failure Simulator
            </h1>
            <p className="mt-2 text-zinc-300">
              A tiny playground for testing client resiliency: latency,
              timeouts, 500s, corrupt JSON, and rate limits.
            </p>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-zinc-900 font-medium hover:bg-white disabled:opacity-60"
          >
            {loading ? "Running…" : "Send Request"}
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Failure Mode</h2>
              <span className="text-xs text-zinc-400">Backend: /api/sim</span>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="text-sm text-zinc-300">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
              >
                {modes.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-zinc-400">{selected.desc}</p>

              {(mode === "slow" || mode === "timeout") && (
                <div className="mt-3 grid gap-2">
                  <label className="text-sm text-zinc-300">delayMs</label>
                  <input
                    type="number"
                    min={0}
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
                  />
                </div>
              )}

              {mode === "error500" && (
                <div className="mt-3 grid gap-2">
                  <label className="text-sm text-zinc-300">status</label>
                  <input
                    type="number"
                    min={400}
                    max={599}
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
                  />
                </div>
              )}

              {mode === "ratelimit" && (
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm text-zinc-300">limit</label>
                    <input
                      type="number"
                      min={1}
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm text-zinc-300">windowMs</label>
                    <input
                      type="number"
                      min={1000}
                      value={windowMs}
                      onChange={(e) => setWindowMs(Number(e.target.value))}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
                    />
                  </div>
                  <p className="text-xs text-zinc-400">
                    Tip: Click “Send Request” repeatedly to trigger 429 +
                    retry-after.
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Request URL</p>
                  <button
                    onClick={() => copy(url)}
                    className="text-xs text-zinc-200 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 overflow-auto text-xs text-zinc-200">
                  {url}
                </pre>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">cURL</p>
                  <button
                    onClick={() => copy(curl)}
                    className="text-xs text-zinc-200 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <pre className="mt-2 overflow-auto text-xs text-zinc-200">
                  {curl}
                </pre>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 shadow-sm">
            <h2 className="text-lg font-medium">Response</h2>

            {!result ? (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                Click <span className="text-zinc-200">Send Request</span> to see
                status, headers, and body.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs text-zinc-400">Status</p>
                    <p className="mt-1 text-lg font-semibold">
                      {result.status || "Network Error"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs text-zinc-400">Latency</p>
                    <p className="mt-1 text-lg font-semibold">
                      {result.tookMs}ms
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">Request ID</p>
                    <button
                      onClick={() => copy(result.requestId)}
                      className="text-xs text-zinc-200 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">
                    {result.requestId}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-xs text-zinc-400">Headers</p>
                  <pre className="mt-2 max-h-40 overflow-auto text-xs text-zinc-200">
                    {JSON.stringify(result.headers, null, 2)}
                  </pre>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">Body</p>
                    <button
                      onClick={() => copy(result.bodyText)}
                      className="text-xs text-zinc-200 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="mt-2 max-h-56 overflow-auto text-xs text-zinc-200">
                    {result.bodyText}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-10 text-xs text-zinc-500">
          Built for testing resilient clients: retries, exponential backoff,
          circuit breakers, and sane error UX.
        </footer>
      </div>
    </main>
  );
}
