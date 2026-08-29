import { AppMark } from "@/components/icons";

export function AppLoader({
  label,
  hint,
  brand,
  fullScreen = true,
}: {
  label: string;
  hint?: string;
  brand: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={
        fullScreen
          ? "app-loader-screen fixed inset-0 z-50 grid place-items-center"
          : "app-loader-screen grid min-h-[40vh] place-items-center"
      }
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex flex-col items-center gap-6 px-6">
        <div className="app-loader-halo" aria-hidden />
        <AppMark size={88} animated className="relative z-10" />
        <div className="app-loader-copy relative z-10 text-center">
          <p className="font-display text-xl font-semibold tracking-tight text-brand">
            {brand}
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{label}</p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
