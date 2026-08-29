import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function listVisionFiles(userId: string, year: number) {
  const prefix = `${userId}/${year}`;
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin.storage.from("vision-board").list(prefix, { limit: 1000 });
    return data ?? [];
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.storage.from("vision-board").list(prefix, { limit: 1000 });
  return data ?? [];
}

export async function sumVisionStorageBytes(userId: string, year: number) {
  const files = await listVisionFiles(userId, year).catch(() => []);
  return files.reduce((sum, file) => {
    const size = file.metadata?.size;
    return sum + (typeof size === "number" ? size : 0);
  }, 0);
}
