"use client";

import { useTranslations } from "next-intl";
import { AiLabel } from "@/components/icons";

export function PdpaNotice() {
  const t = useTranslations("pdpa");

  return (
    <div className="space-y-5 text-sm leading-relaxed text-ink">
      <p>{t("intro")}</p>
      <section>
        <h2 className="font-display text-xl">{t("collectTitle")}</h2>
        <p className="mt-1 text-muted">{t("collectBody")}</p>
      </section>
      <section>
        <h2 className="font-display text-xl">{t("purposeTitle")}</h2>
        <p className="mt-1 text-muted">{t("purposeBody")}</p>
      </section>
      <section>
        <h2 className="font-display text-xl">{t("lineTitle")}</h2>
        <p className="mt-1 text-muted">{t("lineBody")}</p>
      </section>
      <section>
        <h2 className="font-display text-xl">{t("sensitiveTitle")}</h2>
        <p className="mt-1 text-muted">{t("sensitiveBody")}</p>
      </section>
      <section>
        <h2 className="font-display text-xl">{t("retentionTitle")}</h2>
        <p className="mt-1 text-muted">{t("retentionBody")}</p>
      </section>
      <section>
        <h2 className="font-display text-xl">{t("rightsTitle")}</h2>
        <p className="mt-1 text-muted">{t("rightsBody")}</p>
      </section>
      <section>
        <h2 className="font-display text-xl">
          <AiLabel size={20}>{t("aiTitle")}</AiLabel>
        </h2>
        <p className="mt-1 text-muted">{t("aiBody")}</p>
      </section>
      <p className="text-xs text-muted">{t("disclaimer")}</p>
    </div>
  );
}
