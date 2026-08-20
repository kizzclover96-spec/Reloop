import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type LangCode } from "./translations";
import { getPreference, setPreference } from "../data/localStore";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    str
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    getPreference<LangCode>("language", "en").then(setLangState);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    setPreference("language", l);
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const raw = translations[lang]?.[key] ?? translations.en[key] ?? key;
    return interpolate(raw, vars);
  };

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
