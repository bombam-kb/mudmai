"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  BRAND_MARK_CENTER,
  BRAND_MARK_DOT_R,
  BRAND_PIN_PATH,
  BRAND_PURPLE,
  brandMarkDots,
} from "@/lib/brand-mark";
import type { PillarId } from "@/lib/pillars";

type IconProps = {
  size?: number;
  className?: string;
  title?: string;
};

function Svg({
  size = 20,
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PillarIcon({
  id,
  size = 20,
  className,
}: IconProps & { id: PillarId }) {
  switch (id) {
    case "CAREER":
      return (
        <Svg size={size} className={className}>
          <rect x="4" y="8" width="16" height="11" rx="2" {...stroke} />
          <path d="M8 8V7a4 4 0 0 1 8 0v1" {...stroke} />
          <path d="M4 12h16" {...stroke} />
        </Svg>
      );
    case "PERSONAL":
      return (
        <Svg size={size} className={className}>
          <path d="M4 11.5 12 5l8 6.5" {...stroke} />
          <path d="M6.5 10.5V19h11v-8.5" {...stroke} />
          <path d="M10 19v-5h4v5" {...stroke} />
        </Svg>
      );
    case "FINANCE":
      return (
        <Svg size={size} className={className}>
          <circle cx="12" cy="12" r="8" {...stroke} />
          <path d="M12 7.5v9M9.5 9.5c.6-1 1.5-1.5 2.5-1.5 1.6 0 2.6.8 2.6 2s-1 2-2.6 2.3c-1.7.3-2.7.9-2.7 2.2s1.1 2 2.7 2c1.1 0 2-.5 2.6-1.4" {...stroke} />
        </Svg>
      );
    case "RELATIONSHIPS":
      return (
        <Svg size={size} className={className}>
          <circle cx="9" cy="9" r="2.4" {...stroke} />
          <circle cx="15.5" cy="9.5" r="2.1" {...stroke} />
          <path d="M5.5 18c.4-2.8 2.2-4.4 4.5-4.4 1.4 0 2.5.5 3.3 1.4" {...stroke} />
          <path d="M13 14.2c.8-.5 1.8-.8 2.8-.8 2.1 0 3.7 1.4 4.1 3.8" {...stroke} />
        </Svg>
      );
    case "MENTAL_HEALTH":
      return (
        <Svg size={size} className={className}>
          <path d="M12 19s-6.5-4.2-6.5-9A4 4 0 0 1 12 7.2 4 4 0 0 1 18.5 10c0 4.8-6.5 9-6.5 9z" {...stroke} />
          <path d="M9.8 11.2c.5-1.2 1.3-1.8 2.2-1.8 1.2 0 2 .9 2 2 0 2.2-2.2 3.2-2.2 3.2" {...stroke} />
        </Svg>
      );
    case "PHYSICAL_HEALTH":
      return (
        <Svg size={size} className={className}>
          <circle cx="12" cy="5.5" r="1.7" {...stroke} />
          <path d="M8 21l2.2-7.5L7 11.5" {...stroke} />
          <path d="M16 21l-2.2-7.5L17 11.5" {...stroke} />
          <path d="M7 11.5h10" {...stroke} />
        </Svg>
      );
  }
}

export type NavIconName = "home" | "vision" | "goals" | "calendar" | "reviews" | "settings";

export function NavIcon({
  name,
  size = 20,
  className,
  active = false,
}: IconProps & { name: NavIconName; active?: boolean }) {
  const mark = { ...stroke, strokeWidth: active ? 2.15 : 1.7 };
  switch (name) {
    case "home":
      return (
        <Svg size={size} className={className}>
          <path d="M4 11.5 12 4.5l8 7" {...mark} />
          <path d="M6.5 10.8V19h11v-8.2" {...mark} />
        </Svg>
      );
    case "vision":
      return (
        <Svg size={size} className={className}>
          <rect x="4" y="5" width="16" height="14" rx="2.5" {...mark} />
          <path d="M8 15.5 10.4 12l2.2 2.4 1.6-2 2.8 3.1" {...mark} />
          <circle cx="15.2" cy="9" r="1.2" {...mark} />
        </Svg>
      );
    case "goals":
      return (
        <Svg size={size} className={className}>
          <circle cx="12" cy="12" r="8" {...mark} />
          <circle cx="12" cy="12" r="4.2" {...mark} />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "calendar":
      return (
        <Svg size={size} className={className}>
          <rect x="4" y="5.5" width="16" height="14.5" rx="2" {...mark} />
          <path d="M8 4v3.5M16 4v3.5M4 10h16" {...mark} />
        </Svg>
      );
    case "reviews":
      return (
        <Svg size={size} className={className}>
          <path d="M5 16.5 9.2 12l2.6 2.4L19 8" {...mark} />
          <path d="M14.5 8H19v4.5" {...mark} />
        </Svg>
      );
    case "settings":
      return (
        <Svg size={size} className={className}>
          <path d="M5 8h14M5 16h14" {...mark} />
          <circle cx="9" cy="8" r="1.8" {...mark} fill="currentColor" />
          <circle cx="15" cy="16" r="1.8" {...mark} fill="currentColor" />
        </Svg>
      );
  }
}

/** Compass-pin mark — ring of six pillar dots with a map-pin point. */
export function AppMark({
  size = 28,
  className,
  animated = false,
}: IconProps & { animated?: boolean }) {
  const dots = brandMarkDots();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        className={animated ? "app-loader-arc" : undefined}
        d={BRAND_PIN_PATH}
        pathLength={1}
        fill="none"
        stroke={BRAND_PURPLE}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={BRAND_MARK_CENTER.x}
        cy={BRAND_MARK_CENTER.y}
        r="1.15"
        fill={BRAND_PURPLE}
      />
      {dots.map((dot, index) => (
        <circle
          key={`${dot.cx}-${dot.fill}`}
          className={animated ? "app-loader-dot" : undefined}
          style={animated ? { animationDelay: `${index * 140}ms` } : undefined}
          cx={dot.cx}
          cy={dot.cy}
          r={BRAND_MARK_DOT_R}
          fill={dot.fill}
        />
      ))}
    </svg>
  );
}

export function PencilIcon({ size = 16, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M4 16.4 3.4 20.6 7.6 20l10.2-10.2a1.8 1.8 0 0 0 0-2.5l-1.1-1.1a1.8 1.8 0 0 0-2.5 0Z" {...stroke} />
      <path d="m13.4 7 3.6 3.6" {...stroke} />
    </Svg>
  );
}

export function PlusIcon({ size = 16, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M12 5v14M5 12h14" {...stroke} />
    </Svg>
  );
}

export function TrashIcon({ size = 16, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M5 7h14" {...stroke} />
      <path d="M10 7V5h4v2" {...stroke} />
      <path d="M8.2 7 9 19h6l.8-12" {...stroke} />
    </Svg>
  );
}

export function ListIcon({ size = 16, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M8 7h12M8 12h12M8 17h12" {...stroke} />
      <circle cx="4.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function PostponeIcon({ size = 16, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" {...stroke} />
      <path d="M8 4v3.5M16 4v3.5M4 10h16" {...stroke} />
      <path d="M12 13.2v4.2l2.4-1.5" {...stroke} />
    </Svg>
  );
}

export function BellIcon({ size = 16, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M6.2 16.5h11.6l-1.3-2.3V10a4.5 4.5 0 1 0-9 0v4.2Z" {...stroke} />
      <path d="M10 17.2a2 2 0 0 0 4 0" {...stroke} />
    </Svg>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  const t = useTranslations("brand");
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <AppMark size={26} />
      <span className="jr-brand-word font-display text-xl font-semibold text-brand">
        {t("name")}
      </span>
    </span>
  );
}

/** Four-point sparkle — brand purple toward a pillar color. */
export function AiSparkle({
  size = 20,
  className,
  painted = false,
  title,
  toColor = "#8B5CF6",
}: IconProps & { painted?: boolean; toColor?: string }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `ai-spark-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`ai-sparkle ${className ?? ""}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {painted ? (
        <defs>
          <linearGradient id={gradId} x1="3" y1="2" x2="21" y2="22">
            <stop offset="0%" stopColor={BRAND_PURPLE} />
            <stop offset="100%" stopColor={toColor} />
          </linearGradient>
        </defs>
      ) : null}
      <path
        fill={painted ? `url(#${gradId})` : "currentColor"}
        d="M10.6 3c.28 2.55 1.52 4.82 3.56 6.86 2.04 2.04 4.31 3.28 6.86 3.56-2.55.28-4.82 1.52-6.86 3.56-2.04 2.04-3.28 4.31-3.56 6.86-.28-2.55-1.52-4.82-3.56-6.86C4.8 13.94 2.53 12.7 -.02 12.42c2.55-.28 4.82-1.52 6.86-3.56C8.88 6.82 10.12 4.55 10.6 3Z"
      />
      <path
        fill={painted ? `url(#${gradId})` : "currentColor"}
        d="M19.2 1.6c.14 1.02.62 1.92 1.38 2.68.76.76 1.66 1.24 2.68 1.38-1.02.14-1.92.62-2.68 1.38-.76.76-1.24 1.66-1.38 2.68-.14-1.02-.62-1.92-1.38-2.68-.76-.76-1.66-1.24-2.68-1.38 1.02-.14 1.92-.62 2.68-1.38.76-.76 1.24-1.66 1.38-2.68Z"
      />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 18, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M14.5 5 8 12l6.5 7" {...stroke} />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, className, title }: IconProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <path d="M9.5 5 16 12l-6.5 7" {...stroke} />
    </Svg>
  );
}

export function AiLabel({
  children,
  size = 20,
  painted = true,
  toColor,
  className,
}: {
  children?: ReactNode;
  size?: number;
  painted?: boolean;
  toColor?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <AiSparkle size={size} painted={painted} toColor={toColor} />
      {children}
    </span>
  );
}
