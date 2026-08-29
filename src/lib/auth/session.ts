import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { prisma } from "@/lib/prisma";
import { activeCalendarYear } from "@/lib/year";

export async function getSessionUser() {
  const supabase = await createClient();
  if (!supabase) {
    return { supabase: null, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user: user ?? null };
}

export async function getSessionProfile(locale: "th" | "en" = "th") {
  const { user } = await getSessionUser();
  if (!user) {
    return { user: null, profile: null, reflection: null };
  }

  await ensureProfile(user, locale).catch((error) => {
    console.error("ensureProfile", error);
    return null;
  });

  const year = activeCalendarYear();
  const profile = await prisma.user
    .findUnique({
      where: { id: user.id },
      include: {
        reflections: {
          where: { year },
          take: 1,
        },
      },
    })
    .catch((error) => {
      console.error("getSessionProfile", error);
      return null;
    });

  return {
    user,
    profile,
    reflection: profile?.reflections[0] ?? null,
  };
}
