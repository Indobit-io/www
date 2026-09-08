"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Movers" },
  { href: "/whales", label: "Whales" },
  { href: "/flow", label: "Flow" },
  { href: "/status", label: "Pipeline" },
];

export default function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-20 border-b border-cmc-border bg-cmc-bg/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-1 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-4 flex items-center gap-2 shrink-0">
          <span className="text-lg leading-none">🐋</span>
          <span className="text-sm font-semibold tracking-tight">Whale Flow</span>
        </Link>

        <nav className="scroll-x flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-cmc-surface-2 text-cmc-text"
                    : "text-cmc-text-secondary hover:text-cmc-text"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
