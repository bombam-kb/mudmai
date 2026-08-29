import { getTranslations } from "next-intl/server";
import { AppLoader } from "@/components/app-loader";

export default async function Loading() {
  const t = await getTranslations("loader");
  const brand = await getTranslations("brand");
  return <AppLoader brand={brand("name")} label={t("label")} hint={t("hint")} />;
}
