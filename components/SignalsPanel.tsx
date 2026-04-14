"use client";

import Link from "next/link";
import { generateSignals } from "@/lib/signals";
import { SIGNAL_TAG_TO_SLUG } from "@/lib/knowledge";
import type { MetricId } from "@/lib/config";
import type { SignalEvent } from "@/lib/db";

interface SignalsPanelProps {
  values: Partial<Record<MetricId, number>>;
  signalEvents?: SignalEvent[];
}

const LEVEL_STYLES = {
  info: {
    border: "border-terminal-green-muted",
    tag: "text-terminal-green",
    dot: "bg-terminal-green",
    text: "text-terminal-text-dim",
    badge: "bg-terminal-green-muted text-terminal-green",
  },
  warn: {
    border: "border-amber-900",
    tag: "text-terminal-amber",
    dot: "bg-terminal-amber",
    text: "text-terminal-text-dim",
    badge: "bg-amber-950 text-terminal-amber",
  },
  alert: {
    border: "border-red-900",
    tag: "text-terminal-red",
    dot: "bg-terminal-red animate-pulse",
    text: "text-terminal-text-dim",
    badge: "bg-red-950 text-terminal-red",
  },
};

function formatDuration(firstSeen: string): string {
  const ms = Date.now() - new Date(firstSeen).getTime();
  const hours = ms / 3_600_000;
  if (hours < 2) return "NEW";
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export function SignalsPanel({ values, signalEvents = [] }: SignalsPanelProps) {
  const signals = generateSignals(values);

  const eventMap = Object.fromEntries(
    signalEvents.map((e) => [e.signal_id, e])
  );

  if (signals.length === 0) {
    return (
      <div className="text-terminal-text-muted font-mono text-xs px-1">
        — no signals —
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {signals.map((signal) => {
        const style = LEVEL_STYLES[signal.level];
        const event = eventMap[signal.id];
        const duration = event ? formatDuration(event.first_seen) : null;
        const isNew = duration === "NEW";
        const kbSlug = SIGNAL_TAG_TO_SLUG[signal.tag];
        const kbHref = kbSlug ? `/kb#${kbSlug}` : "/kb";

        return (
          <div
            key={signal.id}
            className={`border ${style.border} bg-terminal-surface rounded px-3 py-2 flex items-start gap-2`}
          >
            <div
              className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${style.dot}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className={`font-mono text-[10px] font-bold tracking-widest ${style.tag}`}>
                  {signal.tag}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {duration && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.5 rounded ${style.badge} ${isNew ? "font-bold" : ""}`}
                    >
                      {isNew ? "● NEW" : duration}
                    </span>
                  )}
                  <Link
                    href={kbHref}
                    className="text-[9px] font-mono text-terminal-text-muted hover:text-terminal-green transition-colors"
                    title="Learn more in Knowledge Base"
                  >
                    KB →
                  </Link>
                </div>
              </div>
              <p className={`text-xs leading-snug ${style.text}`}>
                {signal.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
