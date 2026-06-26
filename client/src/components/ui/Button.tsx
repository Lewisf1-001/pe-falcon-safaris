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
    "bg-gold text-forest hover:bg-gold-hover border border-gold font-semibold",
  outline:
    "bg-transparent text-forest border border-forest hover:bg-forest/5 font-medium",
  ghost:
    "bg-transparent text-white border border-white/80 hover:bg-white/10 font-medium",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  href = "#",
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md px-5 py-2 text-sm transition-colors";

  return (
    <Link href={href} className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
