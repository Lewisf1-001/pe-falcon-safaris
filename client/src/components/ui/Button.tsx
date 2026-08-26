import Link from "next/link";

export type ButtonVariant = "primary" | "outline" | "ghost";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  href?: string;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "nav-cta text-forest border-0 font-semibold tracking-[0.12em] uppercase hover:opacity-90",
  outline:
    "bg-transparent text-forest border border-forest hover:bg-forest/5 font-medium tracking-[0.08em] uppercase",
  ghost:
    "bg-transparent text-white border border-white/80 hover:bg-white/10 font-medium tracking-[0.08em] uppercase",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  href = "#",
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-none px-6 py-2.5 text-sm transition-colors";

  return (
    <Link href={href} className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
