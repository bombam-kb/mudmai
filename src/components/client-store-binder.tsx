"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { bindClientOwner } from "@/lib/storage/session";
import { readClientOwner } from "@/lib/storage/scoped";

export function ClientStoreBinder() {
  useEffect(() => {
    const owner = readClientOwner();
    if (/^[0-9a-f-]{36}$/i.test(owner)) return;
    const supabase = createClient();
    if (!supabase) {
      void bindClientOwner("demo");
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      void bindClientOwner(data.user?.id ?? "demo");
    });
  }, []);
  return null;
}
