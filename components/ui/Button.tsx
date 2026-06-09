"use client";

import Link from "next/link";
import { CSSProperties, ReactNode } from "react";

interface ButtonBaseProps {
  variant?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface ButtonLinkProps extends ButtonBaseProps {
  href: string;
  onClick?: never;
}

interface ButtonActionProps extends ButtonBaseProps {
  href?: never;
  onClick: () => void | Promise<void>;
}

type ButtonProps = ButtonLinkProps | ButtonActionProps;

/**
 * Universal button component — renders a Link when `href` is provided,
 * or a `<button>` element when `onClick` is provided.
 * @param variant - Visual style: "primary" (white fill) or "secondary" (bone outline)
 * @param href    - Navigation target; makes the button render as a Next.js Link
 * @param onClick - Action handler; makes the button render as a native button element
 * @example
 * <Button href="/signup" variant="primary">Sign Up</Button>
 * <Button onClick={handleSignOut} variant="secondary">Sign Out</Button>
 */
export default function Button({ variant = "primary", children, className, style, ...props }: ButtonProps) {
  const baseClass = `btn ${variant === "secondary" ? "btn-secondary" : "btn-primary"}${className ? ` ${className}` : ""}`;

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={baseClass} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={(props as ButtonActionProps).onClick}
      className={baseClass}
      style={style}
    >
      {children}
    </button>
  );
}
