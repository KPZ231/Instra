import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import plCommon from "@/locales/pl/common.json";
import chiCommon from "@/locales/chi/common.json";

export const defaultLocale = "en" as const;
export const supportedLocales = ["en", "pl", "chi"] as const;
export type Locale = (typeof supportedLocales)[number];

const resources = {
  en: { common: enCommon },
  pl: { common: plCommon },
  chi: { common: chiCommon },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    defaultNS: "common",
    ns: ["common"],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  ""
}

export default i18n;
