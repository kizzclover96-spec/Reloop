import React, { useState } from "react";
import { Sparkles, Tag, ShieldCheck, Check } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";

const SLIDES = [
  { Icon: Sparkles, titleKey: "tutorial.slide1Title", bodyKey: "tutorial.slide1Body" },
  { Icon: Tag, titleKey: "tutorial.slide2Title", bodyKey: "tutorial.slide2Body" },
  { Icon: ShieldCheck, titleKey: "tutorial.slide3Title", bodyKey: "tutorial.slide3Body" },
  { Icon: Check, titleKey: "tutorial.slide4Title", bodyKey: "tutorial.slide4Body" },
];

interface TutorialProps {
  onDone: () => void;
}

export default function Tutorial({ onDone }: TutorialProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const { Icon, titleKey, bodyKey } = SLIDES[index];

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "env(safe-area-inset-top) 28px calc(28px + env(safe-area-inset-bottom))",
        background: COLOR.bg,
      }}
    >
      <div style={{ textAlign: "right", paddingTop: 8 }}>
        {!isLast && (
          <button
            onClick={onDone}
            style={{ background: "none", border: "none", fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, cursor: "pointer" }}
          >
            {t("tutorial.skip")}
          </button>
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <div key={index} style={{ animation: "heroFade 0.5s ease" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: COLOR.oxbloodSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 22px",
            }}
          >
            <Icon size={30} color={COLOR.oxblood} strokeWidth={1.6} />
          </div>
          <p style={{ fontFamily: SERIF, fontSize: 21, color: COLOR.ink, margin: "0 0 10px" }}>{t(titleKey)}</p>
          <p style={{ fontFamily: SANS, fontSize: 13.5, color: COLOR.inkSoft, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
            {t(bodyKey)}
          </p>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 22 }}>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? COLOR.ink : COLOR.lineSoft,
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
          style={{
            width: "100%",
            background: COLOR.ink,
            color: "#fff",
            border: "none",
            borderRadius: 28,
            padding: "16px",
            fontFamily: SANS,
            fontSize: 14.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isLast ? t("tutorial.getStarted") : t("tutorial.next")}
        </button>
      </div>
    </div>
  );
}
