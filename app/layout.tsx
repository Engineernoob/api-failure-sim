import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StatusDot from "@/components/status-dot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const GITHUB_REPO_URL = "https://github.com/Engineernoob/api-failure-sim";

export const metadata: Metadata = {
  title: "API Failure Simulator",
  description:
    "A developer playground for simulating latency, timeouts, 5xx errors, corrupt JSON, and rate limits.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "API Failure Simulator",
    description:
      "Simulate real-world API failures: latency, timeouts, 5xx errors, corrupt JSON, and rate limiting.",
    type: "website",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "API Failure Simulator",
    description: "Test client resiliency against real-world API failure modes.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-zinc-950">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}
      >
        {/* Subtle glow background */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_0,transparent_70%)]" />

        {/* Subtle grid texture */}
        <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="mx-auto max-w-5xl px-6">
          {/* Top bar */}
          <header className="sticky top-0 z-20 -mx-6 border-b border-zinc-800/70 bg-zinc-950/70 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-900/40 grid place-items-center">
                  <span className="text-sm font-semibold">AF</span>
                </div>

                <div className="leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight">
                      API Failure Simulator
                    </span>
                    <span className="rounded-full border border-zinc-800 bg-zinc-900/40 px-2 py-0.5 text-[11px] text-zinc-300">
                      v0.1.0
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Make failures reproducible: latency, timeouts, 5xx, corrupt JSON, rate limits.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusDot />

                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/60"
                >
                  View Source
                </a>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="py-8">{children}</main>

          {/* Footer */}
          <footer className="pb-10 text-xs text-zinc-500">
            Built as a devtool for testing retries, backoff, circuit breakers, and sane error UX.
          </footer>
        </div>
      </body>
    </html>
  );
}