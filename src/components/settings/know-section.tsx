"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MobileFold } from "@/components/mobile-fold";
import { PillarHighlight } from "@/components/pillars/highlight";
import { NudgeCards } from "@/components/nudge/nudge-cards";
import { PillarIcon, BellIcon, NavIcon } from "@/components/icons";
import { PILLARS, type PillarId } from "@/lib/pillars";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import type { NudgeDto } from "@/lib/nudge/schema";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useRemindersStore } from "@/stores/reminders-store";

export type JourneyReflection = {
  healingThings: string;
  happiestMoment: string;
  expectationsNextYear: string;
  lastYearStory: string;
  ratings: OnboardingRatings;
};

type Props = {
  demoMode?: boolean;
  reflection?: JourneyReflection | null;
  nudges?: NudgeDto[];
  unreadReminders?: number;
};

export function KnowSection({
  demoMode,
  reflection = null,
  nudges = [],
  unreadReminders = 0,
}: Props) {
  const t = useTranslations("home");
  const ts = useTranslations("settings");
  const tv = useTranslations("vision");
  const completed = useOnboardingStore((state) => state.completed);
  const storeHealing = useOnboardingStore((state) => state.healingThings);
  const storeExpect = useOnboardingStore((state) => state.expectationsNextYear);
  const storeHappiest = useOnboardingStore((state) => state.happiestMoment);
  const storeRatings = useOnboardingStore((state) => state.ratings);
  const storedUnread = useRemindersStore(
    (state) => state.logs.filter((log) => !log.isRead).length,
  );

  const localReflection =
    !reflection && completed
      ? {
          healingThings: storeHealing,
          expectationsNextYear: storeExpect,
          lastYearStory: "",
          happiestMoment: storeHappiest,
          ratings: storeRatings,
        }
      : null;
  const shown = reflection ?? localReflection;
  const reminderCount = demoMode ? storedUnread : unreadReminders;

  return (
    <section className="jr-more-group mt-6 rounded-3xl bg-white shadow-card ring-1 ring-slate-100">
      <p className="jr-more-label">{ts("knowTitle")}</p>

      <Link href="/vision" className="jr-more-row jr-vision-entry">
        <span className="jr-more-icon bg-brand text-white">
          <NavIcon name="vision" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{tv("entry")}</span>
          <span className="block text-xs font-normal text-muted">{tv("entryHint")}</span>
        </span>
      </Link>

      <Link href="/reminders" className="jr-more-row">
        <span className="jr-more-icon bg-ink text-white">
          <BellIcon size={16} />
        </span>
        <span className="min-w-0 flex-1 font-semibold text-ink">{t("reminders")}</span>
        {reminderCount > 0 ? (
          <span className="jr-more-badge">{reminderCount}</span>
        ) : null}
      </Link>

      <div className="jr-more-fold">
        <MobileFold
          title={t("nudge")}
          titleClassName="text-base font-semibold text-ink"
          startCollapsed
        >
          <NudgeCards demoMode={demoMode} initialNudges={nudges} />
        </MobileFold>
      </div>

      <div className="jr-more-fold">
        <MobileFold
          title={t("pillars")}
          titleClassName="text-base font-semibold text-ink"
          startCollapsed
        >
          <PillarHighlight ratings={shown?.ratings} />
        </MobileFold>
      </div>

      {shown ? (
        <>
          <div className="jr-more-fold">
            <MobileFold
              title={t("healingTitle")}
              titleClassName="text-base font-semibold text-ink"
              preview={<p className="line-clamp-2 text-sm text-muted">{shown.healingThings}</p>}
              startCollapsed
            >
              <p className="text-sm text-muted">{shown.healingThings}</p>
              <Link href="/onboarding" className="mt-3 inline-flex text-sm font-semibold text-brand">
                {t("editReflection")}
              </Link>
            </MobileFold>
          </div>
          <div className="jr-more-fold">
            <MobileFold
              title={t("expectTitle")}
              titleClassName="text-base font-semibold text-ink"
              preview={
                <p className="line-clamp-2 text-sm text-muted">{shown.expectationsNextYear}</p>
              }
              startCollapsed
            >
              <p className="text-muted">{shown.expectationsNextYear}</p>
            </MobileFold>
          </div>
          <div className="jr-more-fold">
            <MobileFold
              title={t("reflectionTitle")}
              titleClassName="text-base font-semibold text-ink"
              startCollapsed
            >
              <div className="jr-rail jr-rating-rail">
                {PILLARS.map((pillar) => (
                  <RatingBar
                    key={pillar.id}
                    id={pillar.id}
                    value={shown.ratings[pillar.id]}
                    color={pillar.color}
                  />
                ))}
              </div>
            </MobileFold>
          </div>
        </>
      ) : (
        <div className="jr-more-fold">
          <MobileFold
            title={t("reflectionTitle")}
            titleClassName="text-base font-semibold text-ink"
            startCollapsed
          >
            <p className="text-sm text-muted">{t("phaseNote")}</p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              {t("startOnboarding")}
            </Link>
          </MobileFold>
        </div>
      )}
    </section>
  );
}

function RatingBar({
  id,
  value,
  color,
}: {
  id: PillarId;
  value: number;
  color: string;
}) {
  const t = useTranslations("pillars");
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <PillarIcon id={id} size={16} /> {t(id)}
        </span>
        <span className="text-muted">{value}/5</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
