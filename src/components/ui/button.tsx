import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline', size?: 'sm' | 'md' | 'lg' | 'icon' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 tracking-wide",
          {
            "bg-foreground text-background hover:bg-neutral-200": variant === 'primary',
            "bg-surface text-foreground hover:bg-surface-hover border border-border": variant === 'secondary',
            "border border-border bg-transparent hover:bg-surface text-foreground": variant === 'outline',
            "hover:bg-surface hover:text-foreground": variant === 'ghost',
            "h-9 px-4 py-2": size === 'sm',
            "h-11 px-6 py-2": size === 'md',
            "h-14 px-8 text-base": size === 'lg',
            "h-11 w-11": size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
