import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const styles = {
  primary: "bg-sage text-white hover:bg-sage-ink disabled:opacity-50",
  secondary: "border border-line bg-surface text-ink hover:border-ink/40 disabled:opacity-50",
  ghost: "text-muted hover:text-ink",
};

type Props = { variant?: keyof typeof styles; href?: string; children: ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "primary", href, className = "", children, ...rest }: Props) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium transition-colors ${styles[variant]} ${className}`;
  return href ? (
    <Link href={href} className={cls}>{children}</Link>
  ) : (
    <button className={cls} {...rest}>{children}</button>
  );
}
