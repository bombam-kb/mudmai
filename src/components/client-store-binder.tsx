"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { bindClientOwner } from "@/lib/storage/session";

export function ClientStoreBinder() {
  useEffect(() => {
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
