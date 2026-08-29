import { PILLARS, type PillarId } from "@/lib/pillars";
import type { PillarType, VisionItemType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const PILLAR_IDS = new Set<string>(PILLARS.map((pillar) => pillar.id));

type StoreRecord = {
  typeName?: string;
  type?: string;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
  index?: string;
  meta?: { pillar?: unknown };
  props?: {
    w?: number;
    h?: number;
    text?: string;
    assetId?: string;
  };
};

type SnapshotLike = {
  document?: { store?: Record<string, StoreRecord> };
  store?: Record<string, StoreRecord>;
};

export function storeFromSnapshot(snapshot: unknown): Record<string, StoreRecord> {
  const value = snapshot as SnapshotLike | null;
  return value?.document?.store ?? value?.store ?? {};
}

export function countVisionObjects(snapshot: unknown) {
  return Object.values(storeFromSnapshot(snapshot)).filter(
    (record) => record?.typeName === "shape",
  ).length;
}

export function estimateVisionBytes(snapshot: unknown) {
  let bytes = 0;
  for (const record of Object.values(storeFromSnapshot(snapshot))) {
    const src = (record as { props?: { src?: unknown } })?.props?.src;
    if (typeof src !== "string") continue;
    if (src.startsWith("data:")) {
      const payload = src.split(",")[1] ?? "";
      bytes += Math.floor((payload.length * 3) / 4);
    }
  }
  return bytes;
}

const ALLOWED_SRC_HOSTS = ["supabase.co", "cdn.tldraw.com"];

export function isAllowedVisionSrc(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("javascript:")) {
    return false;
  }
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    return ALLOWED_SRC_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function scrubStoreSrcs(store: Record<string, StoreRecord>) {
  for (const record of Object.values(store)) {
    const src = (record as { props?: { src?: unknown } }).props?.src;
    if (typeof src === "string" && !isAllowedVisionSrc(src)) {
      (record as { props?: { src?: string } }).props!.src = "";
    }
  }
}

export function snapshotForPersist(snapshot: unknown) {
  const clone = structuredClone(snapshot) as SnapshotLike;
  const store = clone.document?.store ?? clone.store;
  if (store) {
    scrubStoreSrcs(store);
    for (const record of Object.values(store)) {
      if (record?.typeName === "shape") {
        record.opacity = 1;
      }
    }
  }
  return clone as Prisma.InputJsonValue;
}

function mapShapeType(type: string | undefined): VisionItemType | null {
  if (type === "image") return "IMAGE";
  if (type === "draw" || type === "highlight") return "DRAWING";
  if (type === "text" || type === "note" || type === "geo") return "TEXT";
  return null;
}

function pillarFromMeta(value: unknown): PillarType {
  if (typeof value === "string" && PILLAR_IDS.has(value)) {
    return value as PillarType;
  }
  return "PERSONAL";
}

export function itemsFromSnapshot(
  snapshot: unknown,
  year: number,
): Array<{
  year: number;
  pillar: PillarType;
  type: VisionItemType;
  contentUrl: string | null;
  textContent: string | null;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}> {
  const store = storeFromSnapshot(snapshot);
  const items = [];
  let zIndex = 0;

  for (const record of Object.values(store)) {
    if (record?.typeName !== "shape") continue;
    const type = mapShapeType(record.type);
    if (!type) continue;
    zIndex += 1;

    let contentUrl: string | null = null;
    if (record.type === "image" && record.props?.assetId) {
      const asset = store[record.props.assetId] as
        | { props?: { src?: string } }
        | undefined;
      const src = asset?.props?.src ?? null;
      contentUrl = src && isAllowedVisionSrc(src) ? src : null;
    }

    items.push({
      year,
      pillar: pillarFromMeta(record.meta?.pillar),
      type,
      contentUrl,
      textContent: typeof record.props?.text === "string" ? record.props.text : null,
      posX: Number(record.x) || 0,
      posY: Number(record.y) || 0,
      width: Number(record.props?.w) || 200,
      height: Number(record.props?.h) || 200,
      rotation: Number(record.rotation) || 0,
      zIndex,
    });
  }

  return items;
}

export function isPillarId(value: string | null): value is PillarId {
  return Boolean(value && PILLAR_IDS.has(value));
}
