import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ink" | "outline" | "soft" | "ghost";
type Size = "md" | "lg" | "sm";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-container text-on-primary shadow-card hover:bg-primary transition-colors",
  ink: "bg-on-surface text-surface hover:bg-inverse-surface transition-colors",
  outline:
    "bg-surface-container-lowest text-on-surface border border-surface-variant hover:bg-surface-container-low transition-colors",
  soft: "bg-info-container text-on-info-container border border-info-fixed hover:brightness-95 transition-[filter]",
  ghost:
    "bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-label-sm rounded-lg gap-1.5",
  md: "h-12 px-5 text-label-md rounded-xl gap-2",
  lg: "h-14 px-6 text-headline-sm rounded-xl gap-2.5",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
  iconTrailing?: ReactNode;
  fullWidth?: boolean;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    icon,
    iconTrailing,
    fullWidth,
    ...rest
  } = props;

  const classes = cn(
    "inline-flex items-center justify-center font-label-md text-label-md font-semibold whitespace-nowrap select-none",
    "active:scale-[0.98] transition-transform focus-ring disabled:opacity-50 disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );

  if ("href" in props && props.href) {
    const { href, target, rel } = props as ButtonAsLink;
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {icon}
        <span>{children}</span>
        {iconTrailing}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {icon}
      <span>{children}</span>
      {iconTrailing}
    </button>
  );
}
