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

const cardClass =
  "rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-900/60";

const fieldClass =
  "rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600";

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

  const run = async (overrideUrl?: string) => {
    setLoading(true);
    setResult(null);

    const requestId = makeReqId();
    const started = performance.now();

    const finalUrl = overrideUrl ?? url;

    try {
      const res = await fetch(finalUrl, {
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
        url: finalUrl,
      });
    } catch (e: unknown) {
      setResult({
        ok: false,
        status: 0,
        headers: {},
        bodyText: getErrorMessage(e),
        tookMs: Math.round(performance.now() - started),
        requestId,
        url: finalUrl,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = async (preset: {
    mode: Mode;
    delayMs?: number;
    status?: number;
    limit?: number;
    windowMs?: number;
    autoRun?: boolean;
  }) => {
    setMode(preset.mode);

    if (typeof preset.delayMs === "number") setDelayMs(preset.delayMs);
    if (typeof preset.status === "number") setStatus(preset.status);
    if (typeof preset.limit === "number") setLimit(preset.limit);
    if (typeof preset.windowMs === "number") setWindowMs(preset.windowMs);

    if (preset.autoRun) {
      const u = new URL(
        "/api/sim",
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000",
      );
      u.searchParams.set("mode", preset.mode);

      if (preset.mode === "slow" || preset.mode === "timeout") {
        u.searchParams.set("delayMs", String(preset.delayMs ?? delayMs));
      }

      if (preset.mode === "error500") {
        u.searchParams.set("status", String(preset.status ?? status));
      }

      if (preset.mode === "ratelimit") {
        u.searchParams.set("limit", String(preset.limit ?? limit));
        u.searchParams.set("windowMs", String(preset.windowMs ?? windowMs));
      }

      const path = u.pathname + "?" + u.searchParams.toString();
      await run(path);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3 lg:grid-cols-2">
      {/* Left: Controls */}
      <section className={`relative z-20 ${cardClass}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Controls</h2>
          <button
            onClick={() => run()}
            disabled={loading}
            className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-60"
          >
            {loading ? "Running…" : "Send"}
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-sm text-zinc-300">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className={`${fieldClass} relative z-30`}
          >
            {modes.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-zinc-400">{selected.desc}</p>

          {(mode === "slow" || mode === "timeout") && (
            <div className="mt-2 grid gap-2">
              <label className="text-sm text-zinc-300">delayMs</label>
              <input
                type="number"
                min={0}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          )}

          {mode === "error500" && (
            <div className="mt-2 grid gap-2">
              <label className="text-sm text-zinc-300">status</label>
              <input
                type="number"
                min={400}
                max={599}
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          )}

          {mode === "ratelimit" && (
            <div className="mt-2 grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">limit</label>
                <input
                  type="number"
                  min={1}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className={fieldClass}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm text-zinc-300">windowMs</label>
                <input
                  type="number"
                  min={1000}
                  value={windowMs}
                  onChange={(e) => setWindowMs(Number(e.target.value))}
                  className={fieldClass}
                />
              </div>
              <p className="text-xs text-zinc-400">
                Tip: Click presets to auto-run and trigger 429 + retry-after.
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

      {/* Middle: Presets */}
      <section className={cardClass}>
        <h2 className="text-lg font-medium">Examples</h2>
        <p className="mt-2 text-sm text-zinc-400">
          One-click presets that mirror common production failures.
        </p>

        <div className="mt-4 grid gap-2">
          <button
            onClick={() =>
              applyPreset({ mode: "error500", status: 500, autoRun: true })
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm hover:bg-zinc-900/60"
          >
            <div className="font-medium">500 Internal Error</div>
            <div className="text-xs text-zinc-400">
              Server error response for error UI testing.
            </div>
          </button>

          <button
            onClick={() => applyPreset({ mode: "error503", autoRun: true })}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm hover:bg-zinc-900/60"
          >
            <div className="font-medium">503 Service Unavailable</div>
            <div className="text-xs text-zinc-400">
              Good for retry/backoff + maintenance banners.
            </div>
          </button>

          <button
            onClick={() =>
              applyPreset({ mode: "slow", delayMs: 2500, autoRun: true })
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm hover:bg-zinc-900/60"
          >
            <div className="font-medium">Slow Response (2.5s)</div>
            <div className="text-xs text-zinc-400">
              Simulates latency + loading states.
            </div>
          </button>

          <button
            onClick={() =>
              applyPreset({ mode: "timeout", delayMs: 15000, autoRun: true })
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm hover:bg-zinc-900/60"
          >
            <div className="font-medium">Client Timeout (15s)</div>
            <div className="text-xs text-zinc-400">
              For abort controllers + timeout messaging.
            </div>
          </button>

          <button
            onClick={() => applyPreset({ mode: "corruptJson", autoRun: true })}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm hover:bg-zinc-900/60"
          >
            <div className="font-medium">Corrupt JSON</div>
            <div className="text-xs text-zinc-400">
              For parser errors and fallback handling.
            </div>
          </button>

          <button
            onClick={() =>
              applyPreset({
                mode: "ratelimit",
                limit: 2,
                windowMs: 30000,
                autoRun: true,
              })
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm hover:bg-zinc-900/60"
          >
            <div className="font-medium">429 Rate Limit (2 per 30s)</div>
            <div className="text-xs text-zinc-400">
              Click twice fast to hit retry-after.
            </div>
          </button>

          <button
            onClick={() => applyPreset({ mode: "reset", autoRun: true })}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm hover:bg-zinc-900/60"
          >
            <div className="font-medium">Crash / Reset</div>
            <div className="text-xs text-zinc-400">
              Simulates server crash (often surfaces as 500).
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
          Pro tip: Use these to validate retries, circuit breakers, and
          user-friendly error states.
        </div>
      </section>

      {/* Right: Response */}
      <section className={cardClass}>
        <h2 className="text-lg font-medium">Response</h2>

        {!result ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            Click <span className="text-zinc-200">Send</span> or an{" "}
            <span className="text-zinc-200">Example</span> to see status,
            headers, and body.
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
                <p className="mt-1 text-lg font-semibold">{result.tookMs}ms</p>
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
              <p className="mt-2 text-sm text-zinc-200">{result.requestId}</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">Final URL</p>
                <button
                  onClick={() => copy(result.url)}
                  className="text-xs text-zinc-200 hover:underline"
                >
                  Copy
                </button>
              </div>
              <pre className="mt-2 max-h-24 overflow-auto text-xs text-zinc-200">
                {result.url}
              </pre>
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
  );
}
