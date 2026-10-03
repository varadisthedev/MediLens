"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Plan" },
  { href: "/check-in", label: "Check-in" },
  { href: "/history", label: "History" },
  { href: "/privacy", label: "Privacy" },
];

const Icon = ({ name }: { name: string }) => {
  const d: Record<string, string> = {
    Home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    Plan: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
    "Check-in": "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
    History: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
    Privacy: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d[name]} />
    </svg>
  );
};

export function Nav() {
  const path = usePathname();
  const { user, signOut } = useAuth();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            MediLens
          </Link>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
                className={`text-sm transition-colors ${active(l.href) ? "font-medium text-ink" : "text-muted hover:text-ink"}`}>
                {l.label}
              </Link>
            ))}
            <Link href="/demo" className={`text-sm ${active("/demo") ? "font-medium text-ink" : "text-muted hover:text-ink"}`}>Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={signOut} title="Sign out" className="hidden items-center gap-2 text-sm text-muted hover:text-ink sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-medium text-white">{user.name[0]?.toUpperCase()}</span>
                Sign out
              </button>
            ) : (
              <Link href="/auth" className="text-sm text-muted hover:text-ink"><span className="hidden sm:inline">Guest · </span>Sign in</Link>
            )}
            <Link href="/scan" className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-black">
              Scan<span className="hidden sm:inline"> prescription</span>
            </Link>
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden" aria-label="Main mobile">
        <ul className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={active(l.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] ${active(l.href) ? "font-medium text-ink" : "text-muted"}`}>
                <Icon name={l.label} />
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
