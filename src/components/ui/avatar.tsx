import { HTMLAttributes, forwardRef } from "react";

type Size = "sm" | "md" | "lg";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  size?: Size;
  fallback?: string;
}

const sizeMap: Record<Size, { dim: string; text: string }> = {
  sm: { dim: "h-8 w-8", text: "text-xs" },
  md: { dim: "h-10 w-10", text: "text-sm" },
  lg: { dim: "h-14 w-14", text: "text-base" },
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt = "", size = "md", fallback = "?", className = "", ...props }, ref) => {
    const { dim, text } = sizeMap[size];

    if (src) {
      return (
        <div
          ref={ref}
          className={`${dim} shrink-0 rounded-full overflow-hidden ${className}`}
          {...props}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${dim} ${text} shrink-0 rounded-full bg-accent-subtle text-accent flex items-center justify-center font-medium ${className}`}
        title={alt}
        {...props}
      >
        {getInitials(fallback)}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";

export { Avatar };
export type { AvatarProps, Size };
