import { NextRequest } from "next/server";

export const runtime = "nodejs"; // allow node APIs

type Mode =
  | "ok"
  | "slow"
  | "timeout"
  | "error500"
  | "error503"
  | "corruptJson"
  | "reset"
  | "ratelimit";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function reqId() {
  // simple request id (good enough for demo)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const memoryRatelimit = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = memoryRatelimit.get(key);

  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    memoryRatelimit.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  memoryRatelimit.set(key, existing);

  const remaining = Math.max(0, limit - existing.count);
  const allowed = existing.count <= limit;

  return { allowed, remaining, resetAt: existing.resetAt };
}

export async function GET(req: NextRequest) {
  const id = req.headers.get("x-request-id") ?? reqId();
  const url = new URL(req.url);

  const mode = (url.searchParams.get("mode") ?? "ok") as Mode;
  const delayMs = Number(url.searchParams.get("delayMs") ?? "1500");
  const status = Number(url.searchParams.get("status") ?? "500");

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const started = Date.now();

  // structured log (looks pro)
  console.log(
    JSON.stringify({
      at: "request.start",
      id,
      mode,
      ip,
      path: url.pathname,
      qs: Object.fromEntries(url.searchParams.entries()),
    }),
  );

  // rate limit mode
  if (mode === "ratelimit") {
    const limit = Number(url.searchParams.get("limit") ?? "5");
    const windowMs = Number(url.searchParams.get("windowMs") ?? "60000");
    const key = `${ip}::ratelimit`;

    const rl = checkRateLimit(key, limit, windowMs);

    const headers = new Headers({
      "x-request-id": id,
      "x-ratelimit-limit": String(limit),
      "x-ratelimit-remaining": String(rl.remaining),
      "x-ratelimit-reset": String(Math.floor(rl.resetAt / 1000)),
    });

    if (!rl.allowed) {
      headers.set(
        "retry-after",
        String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      );
      console.log(
        JSON.stringify({
          at: "request.end",
          id,
          mode,
          ms: Date.now() - started,
          status: 429,
        }),
      );
      return new Response("Too Many Requests", { status: 429, headers });
    }

    console.log(
      JSON.stringify({
        at: "request.end",
        id,
        mode,
        ms: Date.now() - started,
        status: 200,
      }),
    );
    return Response.json(
      { ok: true, id, mode, message: `Allowed (${rl.remaining} remaining)` },
      { headers },
    );
  }

  if (mode === "slow") {
    await sleep(delayMs);
    const headers = new Headers({ "x-request-id": id });
    console.log(
      JSON.stringify({
        at: "request.end",
        id,
        mode,
        ms: Date.now() - started,
        status: 200,
      }),
    );
    return Response.json({ ok: true, id, mode, delayMs }, { headers });
  }

  if (mode === "timeout") {
    // hold connection long enough to feel like a timeout
    await sleep(Math.max(delayMs, 12000));
    const headers = new Headers({ "x-request-id": id });
    console.log(
      JSON.stringify({
        at: "request.end",
        id,
        mode,
        ms: Date.now() - started,
        status: 200,
      }),
    );
    return Response.json(
      { ok: true, id, mode, note: "This should have timed out client-side." },
      { headers },
    );
  }

  if (mode === "error500" || mode === "error503") {
    const errStatus = mode === "error503" ? 503 : status || 500;
    const headers = new Headers({ "x-request-id": id });
    console.log(
      JSON.stringify({
        at: "request.end",
        id,
        mode,
        ms: Date.now() - started,
        status: errStatus,
      }),
    );
    return new Response(`Simulated error (${errStatus})`, {
      status: errStatus,
      headers,
    });
  }

  if (mode === "corruptJson") {
    const headers = new Headers({
      "x-request-id": id,
      "content-type": "application/json",
    });
    console.log(
      JSON.stringify({
        at: "request.end",
        id,
        mode,
        ms: Date.now() - started,
        status: 200,
      }),
    );
    return new Response("{ invalid json", { status: 200, headers });
  }

  if (mode === "reset") {
    // simulate connection reset by throwing (serverless often becomes 500)
    console.log(
      JSON.stringify({
        at: "request.crash",
        id,
        mode,
        ms: Date.now() - started,
      }),
    );
    throw new Error("Simulated crash / connection reset");
  }

  const headers = new Headers({ "x-request-id": id });
  console.log(
    JSON.stringify({
      at: "request.end",
      id,
      mode,
      ms: Date.now() - started,
      status: 200,
    }),
  );
  return Response.json({ ok: true, id, mode }, { headers });
}
