import type { ReactNode } from "react";
import "./globals.css";
import "tldraw/tldraw.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
