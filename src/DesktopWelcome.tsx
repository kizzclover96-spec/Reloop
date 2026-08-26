import React from "react";
import { ShieldCheck, Tag, MapPin, Leaf, Instagram, ArrowUpRight } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";

interface DesktopWelcomeProps {
  onSignUp: () => void;
}

/* Simple line-art marks */
function HangerMark({ size = 40, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="16" r="5" stroke={color} strokeWidth="2.2" />
      <path d="M48 21 L48 30" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M48 30 C 20 30, 8 50, 8 62 L 88 62 C 88 50, 76 30, 48 30 Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M18 62 L18 78 C18 80 20 82 22 82 L74 82 C76 82 78 80 78 78 L78 62"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SneakerMark({ size = 40, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <path
        d="M14 58 C 14 50, 22 46, 30 44 L 46 38 C 52 36, 56 32, 58 28 C 62 34, 70 38, 78 40 L 84 42 C 86 48, 86 54, 84 60 L 14 60 Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M14 60 L 14 66 C 14 69, 17 71, 20 71 L 82 71 C 85 71, 87 69, 87 66 L 87 60"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Section({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        padding: "0 48px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function DesktopWelcome({ onSignUp }: DesktopWelcomeProps) {
  const { t } = useLanguage();

  const benefits = [
    {
      Icon: ShieldCheck,
      titleKey: "welcome.benefit1Title",
      bodyKey: "welcome.benefit1Body",
      c: { fg: "#2563EB", bg: "#EFF6FF" },
    },
    {
      Icon: Tag,
      titleKey: "welcome.benefit2Title",
      bodyKey: "welcome.benefit2Body",
      c: { fg: "#F0653E", bg: "#FEF1EE" },
    },
    {
      Icon: MapPin,
      titleKey: "welcome.benefit3Title",
      bodyKey: "welcome.benefit3Body",
      c: { fg: "#0FA968", bg: "#ECFDF5" },
    },
    {
      Icon: Leaf,
      titleKey: "welcome.benefit4Title",
      bodyKey: "welcome.benefit4Body",
      c: { fg: "#D89416", bg: "#FFFBEB" },
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        overflowY: "auto",
        zIndex: 0,
      }}
    >
      {/* SUBTLE ANIMATION */}
      <style>
        {`
          @keyframes reloopFadeUp {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes reloopFloat {
            0%, 100% {
              transform: translateY(0) rotate(-4deg);
            }
            50% {
              transform: translateY(-7px) rotate(-4deg);
            }
          }

          .reloop-hero-copy {
            animation: reloopFadeUp 0.6s ease-out both;
          }

          .reloop-floating-mark {
            animation: reloopFloat 5s ease-in-out infinite;
          }

          .reloop-signup:hover {
            transform: translateY(-1px);
          }

          .reloop-signup {
            transition: transform 0.2s ease, opacity 0.2s ease;
          }
        `}
      </style>

      {/* TOP BAR */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderBottom: `0.5px solid ${COLOR.lineSoft}`,
        }}
      >
        <Section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 48px",
          }}
        >
          <span
            style={{
              fontFamily: SERIF,
              fontSize: 24,
              letterSpacing: "-0.3px",
              color: COLOR.ink,
            }}
          >
            Reloop
          </span>

          <button
            onClick={onSignUp}
            className="reloop-signup"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: COLOR.oxblood,
              color: "#fff",
              border: "none",
              borderRadius: 24,
              padding: "11px 22px",
              fontFamily: SANS,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("welcome.signUp")}
            <ArrowUpRight size={15} />
          </button>
        </Section>
      </div>

      {/* HERO */}
      <Section style={{ padding: "82px 48px 72px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 72,
            alignItems: "center",
          }}
        >
          {/* COPY */}
          <div className="reloop-hero-copy">
            <div
              style={{
                display: "inline-block",
                background: "#F8F4E9",
                color: "#A06A00",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: 20,
                marginBottom: 20,
              }}
            >
              {t("welcome.badge")}
            </div>

            <h1
              style={{
                fontFamily: SERIF,
                fontSize: 54,
                lineHeight: 1.1,
                color: COLOR.ink,
                margin: "0 0 22px",
                letterSpacing: "-1px",
                maxWidth: 560,
              }}
            >
              {t("welcome.heroTitlePart1")}{" "}
              <span style={{ color: COLOR.oxblood }}>
                {t("welcome.heroTitlePart2")}
              </span>
            </h1>

            <p
              style={{
                fontFamily: SANS,
                fontSize: 17,
                lineHeight: 1.7,
                color: COLOR.inkSoft,
                maxWidth: 460,
                margin: "0 0 32px",
              }}
            >
              {t("welcome.heroSubtitle")}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <button
                onClick={onSignUp}
                className="reloop-signup"
                style={{
                  background: COLOR.ink,
                  color: "#fff",
                  border: "none",
                  borderRadius: 27,
                  padding: "15px 32px",
                  fontFamily: SANS,
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t("welcome.signUp")}
              </button>

              {/* Removed "Only pay when you sell" */}
            </div>
          </div>

          {/* HERO VISUAL — intentionally simple */}
          <div
            style={{
              position: "relative",
              height: 390,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Main card */}
            <div
              style={{
                width: 250,
                height: 300,
                borderRadius: 26,
                background: "#F7F3ED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: "rotate(-4deg)",
                boxShadow: "0 18px 45px rgba(17,17,17,0.07)",
              }}
            >
              <HangerMark size={92} color={COLOR.oxblood} />
            </div>

            {/* Small secondary card */}
            <div
              className="reloop-floating-mark"
              style={{
                position: "absolute",
                right: 40,
                bottom: 35,
                width: 118,
                height: 118,
                borderRadius: 22,
                background: "#EFF6FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 28px rgba(17,17,17,0.07)",
              }}
            >
              <SneakerMark size={48} color="#2563EB" />
            </div>
          </div>
        </div>
      </Section>

      {/* WHAT RELOOP IS */}
      <Section
        style={{
          padding: "58px 48px",
          borderTop: `0.5px solid ${COLOR.lineSoft}`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.4fr 0.6fr",
            gap: 56,
          }}
        >
          <p
            style={{
              fontFamily: SERIF,
              fontSize: 30,
              color: COLOR.ink,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {t("welcome.whatTitle")}
          </p>

          <p
            style={{
              fontFamily: SANS,
              fontSize: 16,
              lineHeight: 1.8,
              color: COLOR.inkSoft,
              margin: 0,
              maxWidth: 560,
            }}
          >
            {t("welcome.whatBody")}
          </p>
        </div>
      </Section>

      {/* BENEFITS */}
      <Section
        style={{
          padding: "58px 48px",
          borderTop: `0.5px solid ${COLOR.lineSoft}`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
          }}
        >
          {benefits.map(({ Icon, titleKey, bodyKey, c }) => (
            <div
              key={titleKey}
              style={{
                padding: 22,
                borderRadius: 16,
                background: c.bg,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 15,
                }}
              >
                <Icon size={19} color={c.fg} strokeWidth={1.8} />
              </div>

              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: COLOR.ink,
                  margin: "0 0 8px",
                }}
              >
                {t(titleKey)}
              </p>

              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: COLOR.inkSoft,
                  margin: 0,
                }}
              >
                {t(bodyKey)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* WHY CHOOSE RELOOP */}
      <Section style={{ padding: "72px 48px" }}>
        <div
          style={{
            background: COLOR.ink,
            borderRadius: 26,
            padding: "54px 60px",
          }}
        >
          <p
            style={{
              fontFamily: SERIF,
              fontSize: 30,
              lineHeight: 1.45,
              color: "#fff",
              margin: 0,
              maxWidth: 760,
            }}
          >
            {t("welcome.trustBody")}
          </p>
        </div>
      </Section>

      {/* FOOTER */}
      <div
        style={{
          borderTop: `0.5px solid ${COLOR.lineSoft}`,
          padding: "40px 0 52px",
        }}
      >
        <Section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: SERIF,
                fontSize: 17,
                color: COLOR.ink,
                margin: "0 0 5px",
              }}
            >
              Reloop
            </p>

            <p
              style={{
                fontFamily: SANS,
                fontSize: 12,
                color: COLOR.oxblood,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {t("welcome.engineeredByMalvin")}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <span
              style={{
                fontFamily: SANS,
                fontSize: 11.5,
                color: COLOR.inkSoft,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {t("welcome.followTitle")}
            </span>

            <a
              href="https://instagram.com/officialreloop"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              style={{
                color: COLOR.ink,
                display: "flex",
              }}
            >
              <Instagram size={19} strokeWidth={1.6} />
            </a>

            <a
              href="https://tiktok.com/@officialreloop"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              style={{
                color: COLOR.ink,
                display: "flex",
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
              >
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