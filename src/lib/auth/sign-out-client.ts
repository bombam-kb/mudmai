"use client";

import { createClient } from "@/lib/supabase/client";
import { clearJourneyClientData } from "@/lib/storage/session";

export async function signOutClient() {
  clearJourneyClientData();
  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
}
