import React from "react";
import { ShieldCheck, Tag, MapPin, Leaf, Instagram } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";

interface WelcomeProps {
  onContinue: () => void;
}

/**
 * Simple, original line-art marks — not stock photography. Hotlinking
 * scraped images into a real production site is fragile (links break, get
 * removed, or resize badly) and carries real licensing risk for commercial
 * use. These are deliberately plain and quiet rather than illustrative or
 * "cute" — the brief was calm and minimal, not decorative.
 */
function HangerMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="16" r="5" stroke={COLOR.ink} strokeWidth="1.4" />
      <path d="M48 21 L48 30" stroke={COLOR.ink} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M48 30 C 20 30, 8 50, 8 62 L 88 62 C 88 50, 76 30, 48 30 Z" stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M18 62 L18 78 C18 80 20 82 22 82 L74 82 C76 82 78 80 78 78 L78 62" stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SneakerMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <path
        d="M14 58 C 14 50, 22 46, 30 44 L 46 38 C 52 36, 56 32, 58 28 C 62 34, 70 38, 78 40 L 84 42 C 86 48, 86 54, 84 60 L 14 60 Z"
        stroke={COLOR.ink}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M14 60 L 14 66 C 14 69, 17 71, 20 71 L 82 71 C 85 71, 87 69, 87 66 L 87 60" stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M46 38 L 50 48 M 58 28 L 60 40 M 66 33 L 68 42" stroke={COLOR.ink} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function CameraMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <rect x="14" y="32" width="68" height="46" rx="6" stroke={COLOR.ink} strokeWidth="1.4" />
      <path d="M34 32 L 40 22 L 56 22 L 62 32" stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="48" cy="55" r="15" stroke={COLOR.ink} strokeWidth="1.4" />
      <circle cx="48" cy="55" r="7" stroke={COLOR.ink} strokeWidth="1.2" />
      <circle cx="70" cy="41" r="2.4" fill={COLOR.ink} />
    </svg>
  );
}

function ToteMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <path d="M30 38 L 30 28 C 30 19, 37 12, 48 12 C 59 12, 66 19, 66 28 L 66 38" stroke={COLOR.ink} strokeWidth="1.4" />
      <path d="M20 38 L 76 38 L 71 82 L 25 82 Z" stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

const ICON_MARKS = [HangerMark, SneakerMark, CameraMark, ToteMark];

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 28px", ...style }}>{children}</div>;
}

export default function Welcome({ onContinue }: WelcomeProps) {
  const { t } = useLanguage();

  const benefits = [
    { Icon: ShieldCheck, titleKey: "welcome.benefit1Title", bodyKey: "welcome.benefit1Body" },
    { Icon: Tag, titleKey: "welcome.benefit2Title", bodyKey: "welcome.benefit2Body" },
    { Icon: MapPin, titleKey: "welcome.benefit3Title", bodyKey: "welcome.benefit3Body" },
    { Icon: Leaf, titleKey: "welcome.benefit4Title", bodyKey: "welcome.benefit4Body" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#FFFFFF", overflowY: "auto", zIndex: 0 }}>
      <style>{`
        @media (max-width: 720px) {
          .welcome-hero-grid { grid-template-columns: 1fr !important; }
          .welcome-benefits-grid { grid-template-columns: 1fr 1fr !important; }
          .welcome-hero-title { font-size: 34px !important; }
        }
        @media (max-width: 480px) {
          .welcome-benefits-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* TOP BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
        <Section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px" }}>
          <span style={{ fontFamily: SERIF, fontSize: 22, letterSpacing: "-0.3px", color: COLOR.ink }}>Reloop</span>
          <button
            onClick={onContinue}
            style={{
              background: COLOR.ink,
              color: "#fff",
              border: "none",
              borderRadius: 24,
              padding: "10px 22px",
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("welcome.continue")}
          </button>
        </Section>
      </div>

      {/* HERO */}
      <Section style={{ padding: "72px 28px 56px" }}>
        <div className="welcome-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 56, alignItems: "center" }}>
          <div>
            <h1 className="welcome-hero-title" style={{ fontFamily: SERIF, fontSize: 46, lineHeight: 1.15, color: COLOR.ink, margin: "0 0 20px", letterSpacing: "-0.5px" }}>
              {t("welcome.heroTitle")}
            </h1>
            <p style={{ fontFamily: SANS, fontSize: 16, lineHeight: 1.65, color: COLOR.inkSoft, maxWidth: 460, margin: "0 0 28px" }}>
              {t("welcome.heroSubtitle")}
            </p>
            <button
              onClick={onContinue}
              style={{
                background: COLOR.ink,
                color: "#fff",
                border: "none",
                borderRadius: 26,
                padding: "14px 30px",
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("welcome.continue")}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {ICON_MARKS.map((Mark, i) => (
              <div
                key={i}
                style={{
                  background: i % 2 === 0 ? COLOR.oxbloodSoft : "#F5F5F5",
                  borderRadius: 20,
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mark size={64} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* WHAT RELOOP IS */}
      <Section style={{ padding: "48px 28px", borderTop: `0.5px solid ${COLOR.lineSoft}` }}>
        <div style={{ maxWidth: 620 }}>
          <p style={{ fontFamily: SERIF, fontSize: 26, color: COLOR.ink, margin: "0 0 14px" }}>{t("welcome.whatTitle")}</p>
          <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.75, color: COLOR.inkSoft, margin: 0 }}>{t("welcome.whatBody")}</p>
        </div>
      </Section>

      {/* BENEFITS */}
      <Section style={{ padding: "48px 28px", borderTop: `0.5px solid ${COLOR.lineSoft}` }}>
        <div className="welcome-benefits-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
          {benefits.map(({ Icon, titleKey, bodyKey }) => (
            <div key={titleKey}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: COLOR.oxbloodSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Icon size={18} color={COLOR.oxblood} strokeWidth={1.8} />
              </div>
              <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: COLOR.ink, margin: "0 0 6px" }}>{t(titleKey)}</p>
              <p style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.6, color: COLOR.inkSoft, margin: 0 }}>{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* TRUST */}
      <Section style={{ padding: "56px 28px", borderTop: `0.5px solid ${COLOR.lineSoft}` }}>
        <div style={{ maxWidth: 640 }}>
          <p style={{ fontFamily: SERIF, fontSize: 24, color: COLOR.ink, margin: "0 0 14px" }}>{t("welcome.trustTitle")}</p>
          <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.8, color: COLOR.inkSoft, margin: 0 }}>{t("welcome.trustBody")}</p>
        </div>
      </Section>

      {/* FOOTER */}
      <div style={{ borderTop: `0.5px solid ${COLOR.lineSoft}`, padding: "36px 0 44px" }}>
        <Section style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: "0 0 4px" }}>Reloop</p>
            <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: 0 }}>
              © {new Date().getFullYear()} Reloop. {t("welcome.footerRights")}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t("welcome.followTitle")}
            </span>
            <a
              href="https://instagram.com/officialreloop"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              style={{ color: COLOR.ink, display: "flex" }}
            >
              <Instagram size={19} strokeWidth={1.6} />
            </a>
            <a
              href="https://tiktok.com/@officialreloop"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              style={{ color: COLOR.ink, display: "flex" }}
            >
              {/* lucide-react has no TikTok glyph — a small original mark instead of a mismatched substitute icon */}
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16.5 3c.4 2.2 1.9 3.8 4 4.1v3c-1.5 0-2.9-.4-4-1.2v6.6c0 3.4-2.7 6-6 6s-6-2.6-6-6 2.7-6 6-6c.4 0 .7 0 1 .1v3.1a2.9 2.9 0 1 0 2 2.8V3h3z"
                  stroke={COLOR.ink}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}
