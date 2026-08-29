import { createJSONStorage, type StateStorage } from "zustand/middleware";

const OWNER_KEY = "jr-owner";
const KEEP = new Set(["jr-splash-seen", "jr-appearance"]);

function readOwner() {
  if (typeof window === "undefined") return "anon";
  return localStorage.getItem(OWNER_KEY) || "anon";
}

export function clientStorageKey(name: string, owner = readOwner()) {
  return `${name}:${owner}`;
}

export function readClientOwner() {
  return readOwner();
}

export function writeClientOwner(ownerId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNER_KEY, ownerId.trim() || "demo");
}

const scopedStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(clientStorageKey(name));
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(clientStorageKey(name), value);
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(clientStorageKey(name));
  },
};

export const scopedJsonStorage = createJSONStorage(() => scopedStorage);

export function clearJourneyLocalKeys() {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (KEEP.has(key)) continue;
    if (key.startsWith("jr-")) localStorage.removeItem(key);
  }
}
