import React, { useState } from "react";
import { Languages, Check } from "lucide-react";
import { COLOR, SANS } from "../theme";
import { useLanguage } from "./LanguageContext";
import { LANGUAGES } from "./translations";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("common.language")}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
      >
        <Languages size={19} color={COLOR.ink} strokeWidth={1.6} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div
            style={{
              position: "absolute",
              top: 28,
              right: 0,
              background: COLOR.card,
              border: `0.5px solid ${COLOR.line}`,
              borderRadius: 12,
              boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
              width: 172,
              zIndex: 31,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                fontFamily: SANS,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: COLOR.inkSoft,
                borderBottom: `0.5px solid ${COLOR.lineSoft}`,
              }}
            >
              {t("common.language")}
            </div>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>
                  <span>{l.flag}</span> {l.label}
                </span>
                {lang === l.code && <Check size={14} color={COLOR.oxblood} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
