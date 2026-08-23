import React, { useState } from "react";
import { ChevronLeft, ChevronDown, Mail } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";

const SUPPORT_EMAIL = "praiseangel509@gmail.com";
const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7, 8];

interface HelpSupportProps {
  onBack: () => void;
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "14px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: COLOR.ink, paddingRight: 12 }}>{question}</span>
        <ChevronDown
          size={16}
          color={COLOR.inkSoft}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, lineHeight: 1.6, margin: "0 0 16px" }}>{answer}</p>
      )}
    </div>
  );
}

export default function HelpSupport({ onBack }: HelpSupportProps) {
  const { t } = useLanguage();
  return (
    <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 65, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 18px 12px",
          borderBottom: `0.5px solid ${COLOR.line}`,
          flexShrink: 0,
        }}
      >
        <button onClick={onBack} aria-label={t("product.back")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={22} color={COLOR.ink} />
        </button>
        <span style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", color: COLOR.ink, marginLeft: 14 }}>
          {t("help.title")}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 40px" }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 15, color: COLOR.ink, margin: "0 0 10px" }}>{t("help.faqTitle")}</h2>
        <div>
          {FAQ_KEYS.map((n) => (
            <FaqRow key={n} question={t(`help.q${n}`)} answer={t(`help.a${n}`)} />
          ))}
        </div>

        <div style={{ marginTop: 28, padding: 18, background: COLOR.oxbloodSoft, borderRadius: 14, textAlign: "center" }}>
          <p style={{ fontFamily: SERIF, fontSize: 15, color: COLOR.ink, margin: "0 0 6px" }}>{t("help.contactTitle")}</p>
          <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, margin: "0 0 14px" }}>{t("help.contactBody")}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: COLOR.ink,
              color: "#fff",
              borderRadius: 10,
              padding: "11px 18px",
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Mail size={15} />
            {t("help.emailCta")}
          </a>
          <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: "10px 0 0" }}>{SUPPORT_EMAIL}</p>
        </div>
      </div>
    </div>
  );
}
