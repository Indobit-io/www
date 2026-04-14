import Link from "next/link";
import { KB, type KbEntry } from "@/lib/knowledge";

export const metadata = {
  title: "Knowledge Base — Liquidity Flow Tracker",
  description:
    "Definitions and explanations for every signal, indicator, and concept used in the Liquidity Flow Tracker.",
};

const CATEGORY_ORDER: KbEntry["category"][] = [
  "policy",
  "indicator",
  "concept",
  "signal",
];

const CATEGORY_LABELS: Record<KbEntry["category"], string> = {
  policy: "Monetary Policy",
  indicator: "Market Indicators",
  concept: "Key Concepts",
  signal: "Signals",
};

const CATEGORY_DESC: Record<KbEntry["category"], string> = {
  policy: "Tools and levers the Federal Reserve uses to control money supply and rates.",
  indicator: "Market-derived data points that reflect the current state of the financial system.",
  concept: "Frameworks and mental models for interpreting what the data means.",
  signal: "Threshold-based observations generated from current indicator values.",
};

function EntryCard({ entry }: { entry: KbEntry }) {
  const paragraphs = entry.body.split("\n\n");
  return (
    <article
      id={entry.slug}
      className="border border-terminal-border bg-terminal-surface rounded p-5 scroll-mt-20"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="font-mono text-sm font-bold text-terminal-green">
            {entry.term}
          </h2>
          <p className="text-xs text-terminal-text-dim mt-1">{entry.shortDef}</p>
        </div>
        <a
          href={`#${entry.slug}`}
          className="text-terminal-text-muted hover:text-terminal-green font-mono text-xs flex-shrink-0 mt-0.5"
          aria-label="Permalink"
        >
          #
        </a>
      </div>

      <div className="space-y-3 mt-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-xs text-terminal-text-dim leading-relaxed">
            {p}
          </p>
        ))}
      </div>

      {(entry.relatedSignalTags.length > 0 || entry.relatedSlugs?.length) && (
        <div className="mt-4 pt-3 border-t border-terminal-border flex flex-wrap gap-2">
          {entry.relatedSignalTags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[10px] tracking-widest border border-terminal-green-muted text-terminal-green px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {entry.relatedSlugs?.map((slug) => {
            const related = KB.find((e) => e.slug === slug);
            if (!related) return null;
            return (
              <a
                key={slug}
                href={`#${slug}`}
                className="font-mono text-[10px] tracking-wide border border-terminal-border text-terminal-text-muted hover:text-terminal-green hover:border-terminal-green-muted px-2 py-0.5 rounded transition-colors"
              >
                → {related.term.split(" — ")[0].split(" (")[0]}
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default function KbPage() {
  const byCategory = CATEGORY_ORDER.reduce<Record<string, KbEntry[]>>(
    (acc, cat) => {
      acc[cat] = KB.filter((e) => e.category === cat);
      return acc;
    },
    {}
  );

  const allSlugs = KB.map((e) => ({ slug: e.slug, term: e.term }));

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text">
      {/* Header */}
      <header className="border-b border-terminal-border bg-terminal-surface/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-terminal-text-muted hover:text-terminal-green font-mono text-xs transition-colors"
            >
              ← DASHBOARD
            </Link>
            <span className="text-terminal-border">|</span>
            <h1 className="font-mono text-sm font-bold text-terminal-green tracking-wider">
              KNOWLEDGE BASE
            </h1>
          </div>
          <div className="text-[10px] text-terminal-text-muted font-mono">
            {KB.length} ENTRIES
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Intro */}
        <div className="mb-8 border border-terminal-border bg-terminal-surface rounded p-4">
          <p className="text-xs text-terminal-text-dim leading-relaxed">
            Reference definitions for every indicator, signal, and concept shown on the dashboard.
            Signals on the dashboard link directly to the relevant entry here.
            All observations are based on current data — no predictions are made.
          </p>
        </div>

        {/* Jump links */}
        <nav className="mb-10">
          <div className="font-mono text-[10px] text-terminal-text-muted tracking-widest mb-3">
            JUMP TO
          </div>
          <div className="flex flex-wrap gap-2">
            {allSlugs.map(({ slug, term }) => (
              <a
                key={slug}
                href={`#${slug}`}
                className="font-mono text-[10px] border border-terminal-border text-terminal-text-dim hover:text-terminal-green hover:border-terminal-green-muted px-2 py-1 rounded transition-colors"
              >
                {term.split(" — ")[0].split(" (")[0]}
              </a>
            ))}
          </div>
        </nav>

        {/* Entries grouped by category */}
        {CATEGORY_ORDER.filter((cat) => byCategory[cat]?.length > 0).map((cat) => (
          <section key={cat} className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1 bg-terminal-border" />
              <span className="font-mono text-[10px] tracking-widest text-terminal-text-muted uppercase">
                {CATEGORY_LABELS[cat]}
              </span>
              <div className="h-px flex-1 bg-terminal-border" />
            </div>
            <p className="text-[10px] text-terminal-text-muted font-mono text-center mb-6">
              {CATEGORY_DESC[cat]}
            </p>
            <div className="space-y-4">
              {byCategory[cat].map((entry) => (
                <EntryCard key={entry.slug} entry={entry} />
              ))}
            </div>
          </section>
        ))}

        <footer className="border-t border-terminal-border pt-4 pb-8 mt-4">
          <div className="text-[10px] font-mono text-terminal-text-muted text-center">
            <Link href="/" className="hover:text-terminal-green transition-colors">
              ← BACK TO DASHBOARD
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
