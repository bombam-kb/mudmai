"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Editor,
  Tldraw,
  createTLStore,
  getSnapshot,
  loadSnapshot,
  type TLAsset,
  type TLAssetStore,
} from "tldraw";
import { useTranslations } from "next-intl";
import { PILLARS, type PillarId } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import { snapshotForPersist, countVisionObjects, estimateVisionBytes } from "@/lib/vision/snapshot";
import { PLAN, formatMbLimit } from "@/lib/billing/plan";
import { clientStorageKey } from "@/lib/storage/scoped";
import { useAppearanceStore, useResolvedTheme } from "@/stores/appearance-store";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  year: number;
  initialSnapshot: unknown | null;
  demoMode: boolean;
};

function localKey(year: number) {
  return clientStorageKey(`jr-vision-${year}`);
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadVisionImage(
  file: File,
  demoMode: boolean,
  usedBytes: number,
) {
  if (file.type === "image/svg+xml" || file.type === "image/svg") {
    throw new Error("unsupported image type");
  }
  if (usedBytes + file.size > PLAN.free.visionBytes) {
    throw new Error("vision_bytes");
  }
  if (!demoMode) {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/vision/upload", {
      method: "POST",
      body: form,
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      url?: string;
      error?: string;
      reason?: string;
    } | null;
    if (json?.error === "vision_bytes" || json?.reason === "vision_bytes") {
      throw new Error("vision_bytes");
    }
    if (json?.reason === "type") {
      throw new Error("unsupported image type");
    }
    if (response.ok && json?.url) return json.url;
    throw new Error("upload failed");
  }
  if (file.size > 700_000) {
    throw new Error("image too large for local fallback");
  }
  return fileToDataUrl(file);
}

export function VisionCanvas({ year, initialSnapshot, demoMode }: Props) {
  const t = useTranslations("vision");
  const editorRef = useRef<Editor | null>(null);
  const filterRef = useRef<PillarId | null>(null);
  const [filter, setFilter] = useState<PillarId | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [quotaError, setQuotaError] = useState<"objects" | "bytes" | null>(null);
  const [objects, setObjects] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const layout = useAppearanceStore((state) => state.layout);
  const resolvedTheme = useResolvedTheme();

  const bytesRef = useRef(0);
  bytesRef.current = bytes;

  const assets: TLAssetStore = useMemo(
    () => ({
      async upload(_asset: TLAsset, file: File) {
        try {
          const src = await uploadVisionImage(file, demoMode, bytesRef.current);
          setQuotaError(null);
          setBytes((current) => current + file.size);
          return { src };
        } catch (error) {
          if (error instanceof Error && error.message === "vision_bytes") {
            setQuotaError("bytes");
          }
          throw error;
        }
      },
    }),
    [demoMode],
  );

  const store = useMemo(() => {
    const next = createTLStore({ assets });
    const local =
      typeof window !== "undefined" ? localStorage.getItem(localKey(year)) : null;
    const source = initialSnapshot ?? (local ? JSON.parse(local) : null);
    if (source) {
      try {
        loadSnapshot(next, source);
      } catch {
        // Ignore a stale/invalid snapshot and start empty.
      }
    }
    return next;
  }, [assets, initialSnapshot, year]);

  useEffect(() => {
    try {
      const snapshot = getSnapshot(store);
      setObjects(countVisionObjects(snapshot));
      setBytes((current) => Math.max(current, estimateVisionBytes(snapshot)));
    } catch {
      // empty board
    }
    if (demoMode) return;
    void fetch("/api/vision")
      .then((response) => response.json())
      .then((json: { quota?: { objects?: number; bytes?: number } }) => {
        if (typeof json.quota?.objects === "number") setObjects(json.quota.objects);
        if (typeof json.quota?.bytes === "number") setBytes(json.quota.bytes);
      })
      .catch(() => undefined);
  }, [demoMode, store]);

  const persist = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const snapshot = demoMode
      ? getSnapshot(editor.store)
      : snapshotForPersist(getSnapshot(editor.store));
    const objectCount = countVisionObjects(snapshot);
    const byteCount = estimateVisionBytes(snapshot);
    setObjects(objectCount);
    setBytes((current) => Math.max(current, byteCount));
    if (objectCount > PLAN.free.visionObjects) {
      setQuotaError("objects");
      setSaveState("error");
      return;
    }
    try {
      setQuotaError(null);
      if (demoMode) {
        localStorage.setItem(localKey(year), JSON.stringify(snapshot));
        setSaveState("saved");
        return;
      }
      setSaveState("saving");
      const response = await fetch("/api/vision", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasJson: snapshot }),
      });
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (json?.error === "vision_objects") {
        setQuotaError("objects");
        throw new Error("quota");
      }
      if (json?.error === "vision_bytes") {
        setQuotaError("bytes");
        throw new Error("quota");
      }
      if (!response.ok) throw new Error("save failed");
      localStorage.setItem(localKey(year), JSON.stringify(snapshot));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [demoMode, year]);

  useEffect(() => {
    const timeout: { current: ReturnType<typeof setTimeout> | undefined } = {
      current: undefined,
    };
    const unlisten = store.listen(
      () => {
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => {
          void persist();
        }, 900);
      },
      { source: "user", scope: "document" },
    );
    return () => {
      unlisten();
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [persist, store]);

  function applyFilter(editor: Editor, pillar: PillarId | null) {
    const shapes = editor.getCurrentPageShapes();
    editor.updateShapes(
      shapes.map((shape) => ({
        id: shape.id,
        type: shape.type,
        opacity: !pillar || shape.meta.pillar === pillar ? 1 : 0.16,
      })),
    );
  }

  function onMount(editor: Editor) {
    editorRef.current = editor;
    filterRef.current = filter;
    editor.user.updateUserPreferences({ colorScheme: resolvedTheme });

    editor.sideEffects.registerAfterCreateHandler("shape", (shape) => {
      if (shape.meta.pillar) return;
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        meta: { ...shape.meta, pillar: filterRef.current ?? "PERSONAL" },
      });
    });

    editor.store.listen(() => {
      setSelectedCount(editor.getSelectedShapeIds().length);
    });
  }

  useEffect(() => {
    editorRef.current?.user.updateUserPreferences({
      colorScheme: resolvedTheme,
    });
  }, [resolvedTheme]);

  function onFilter(next: PillarId | null) {
    setFilter(next);
    filterRef.current = next;
    const editor = editorRef.current;
    if (editor) applyFilter(editor, next);
  }

  function tagSelected(pillar: PillarId) {
    const editor = editorRef.current;
    if (!editor) return;
    const selected = editor.getSelectedShapes();
    if (selected.length === 0) return;
    editor.updateShapes(
      selected.map((shape) => ({
        id: shape.id,
        type: shape.type,
        meta: { ...shape.meta, pillar },
      })),
    );
    applyFilter(editor, filterRef.current);
  }

  async function exportPng() {
    const editor = editorRef.current;
    if (!editor) return;
    const ids = [...editor.getCurrentPageShapeIds()];
    if (ids.length === 0) return;
    const { blob } = await editor.toImage(ids, {
      format: "png",
      background: true,
      pixelRatio: 2,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `journey-resolution-vision-${year}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-canvas">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-violet-100 bg-white px-4 py-2 [&>*]:shrink-0">
        <span className="hidden text-sm font-semibold text-muted sm:inline">
          {t("title", { year })}
        </span>
        <span className="text-xs font-semibold text-muted">
          {t("quotaHint", {
            objects,
            objectLimit: PLAN.free.visionObjects,
            bytes: formatMbLimit(bytes),
          })}
        </span>
        <button
          type="button"
          onClick={() => onFilter(null)}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            filter === null ? "bg-ink text-white" : "bg-slate-100 text-muted"
          }`}
        >
          {t("filterAll")}
        </button>
        {PILLARS.map((pillar) => (
          <button
            key={pillar.id}
            type="button"
            onClick={() => onFilter(pillar.id)}
            className="rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{
              backgroundColor: pillar.color,
              opacity: filter === null || filter === pillar.id ? 1 : 0.35,
            }}
          >
            <span className="inline-flex items-center gap-1">
              <PillarIcon id={pillar.id} size={14} /> <PillarLabel id={pillar.id} />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => void persist()}
          className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink ring-1 ring-slate-200"
        >
          {saveState === "saving"
            ? t("saving")
            : saveState === "error"
              ? t("error")
              : saveState === "saved"
                ? t("saved")
                : t("save")}
        </button>
        <button
          type="button"
          onClick={() => void exportPng()}
          className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white"
        >
          {t("export")}
        </button>
        {selectedCount > 0 ? (
          <span className="ml-auto flex flex-wrap items-center gap-1 text-xs text-muted">
            {t("tagSelected")}
            {PILLARS.map((pillar) => (
              <button
                key={pillar.id}
                type="button"
                onClick={() => tagSelected(pillar.id)}
                className="rounded-full px-2 py-0.5 text-white"
                style={{ backgroundColor: pillar.color }}
              >
                <PillarIcon id={pillar.id} size={14} />
              </button>
            ))}
          </span>
        ) : (
          <p className="jr-desktop-only ml-auto hidden text-xs text-muted">{t("hint")}</p>
        )}
      </div>

      {quotaError ? (
        <p className="shrink-0 bg-rose-50 px-4 py-1 text-xs font-semibold text-physical">
          {quotaError === "bytes"
            ? t("quotaBytes")
            : t("quotaObjects", { limit: PLAN.free.visionObjects })}
        </p>
      ) : null}
      {saveState === "error" && !quotaError ? (
        <p className="shrink-0 bg-rose-50 px-4 py-1 text-xs text-physical">{t("quotaError")}</p>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div className="jr-tldraw">
          <Tldraw
            key={layout}
            store={store}
            inferDarkMode={false}
            forceMobile={layout === "mobile"}
            onMount={onMount}
          />
        </div>
      </div>
    </div>
  );
}

function PillarLabel({ id }: { id: PillarId }) {
  const t = useTranslations("pillars");
  return <>{t(id)}</>;
}
