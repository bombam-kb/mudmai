import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "vision-board";

async function listAll(
  admin: SupabaseClient,
  prefix: string,
) {
  const names: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit: 1000,
      offset,
    });
    if (error) {
      console.error("vision storage list", prefix, error);
      return names;
    }
    if (!data?.length) return names;
    for (const item of data) {
      if (item.name) names.push(item.name);
    }
    if (data.length < 1000) return names;
    offset += data.length;
  }
}

export async function deleteVisionStorageForUser(
  admin: SupabaseClient,
  userId: string,
) {
  const years = await listAll(admin, userId);
  const paths: string[] = [];
  for (const year of years) {
    const prefix = `${userId}/${year}`;
    const files = await listAll(admin, prefix);
    for (const file of files) {
      paths.push(`${prefix}/${file}`);
    }
  }

  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) console.error("vision storage remove", error);
  }
}
