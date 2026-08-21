import React, { useState, useEffect } from "react";
import { Repeat, MapPin, ShieldCheck, Heart } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./i18n/LanguageContext";
import { checkPasswordStrength } from "./utils/password";
import { sanitizeText } from "./utils/sanitize";
import { setRememberMe } from "./firebase";
import LegalViewer, { type LegalDocKey } from "./legal/LegalViewer";

const ONBOARD_SLIDES = [
  { Icon: Repeat, titleKey: "onboard.slide1Title", bodyKey: "onboard.slide1Body" },
  { Icon: MapPin, titleKey: "onboard.slide2Title", bodyKey: "onboard.slide2Body" },
  { Icon: ShieldCheck, titleKey: "onboard.slide3Title", bodyKey: "onboard.slide3Body" },
  { Icon: Heart, titleKey: "onboard.slide4Title", bodyKey: "onboard.slide4Body" },
];

const SLIDE_ROTATE_MS = 5000;

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, signInWithYahoo } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [openDoc, setOpenDoc] = useState<LegalDocKey | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % ONBOARD_SLIDES.length);
    }, SLIDE_ROTATE_MS);

    return () => clearInterval(timer);
  }, []);

  const friendlyError = (code: string) => {
    if (
      code.includes("invalid-credential") ||
      code.includes("wrong-password") ||
      code.includes("user-not-found")
    ) {
      return t("auth.errorCredential");
    }

    if (code.includes("email-already-in-use")) {
      return t("auth.errorInUse");
    }

    if (code.includes("weak-password")) {
      return t("auth.errorWeak");
    }

    if (code.includes("invalid-email")) {
      return t("auth.errorInvalidEmail");
    }

    return t("auth.errorGeneric");
  };

  const guardAgreement = () => {
    if (!agreed) {
      setError(t("auth.errorMustAgree"));
      return false;
    }

    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guardAgreement()) return;

    if (!email || !password) {
      setError(t("auth.errorEmpty"));
      return;
    }

    if (mode === "signup" && !checkPasswordStrength(password).passes) {
      setError(t("auth.errorPasswordWeak"));
      return;
    }

    setError("");
    setBusy(true);

    try {
      await setRememberMe(remember);

      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, sanitizeText(name, 60));
      }
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (!guardAgreement()) return;

    setError("");
    setBusy(true);

    try {
      await setRememberMe(remember);
      await signInWithGoogle();
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setBusy(false);
    }
  };

  const yahoo = async () => {
    if (!guardAgreement()) return;

    setError("");
    setBusy(true);

    try {
      await setRememberMe(remember);
      await signInWithYahoo();
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setBusy(false);
    }
  };

  if (openDoc) {
    return (
      <LegalViewer
        docKey={openDoc}
        onBack={() => setOpenDoc(null)}
      />
    );
  }

  const authDisabled = busy || !agreed;
  const { Icon, titleKey, bodyKey } = ONBOARD_SLIDES[slideIndex];

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        justifyContent: "center",
        overflowY: "auto",
        padding: "32px 24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          margin: "auto",
        }}
      >
        {/* Brand */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 29,
              lineHeight: 1,
              color: COLOR.ink,
              letterSpacing: "-0.5px",
            }}
          >
            Reloop
          </div>

          <div
            style={{
              fontFamily: SANS,
              fontSize: 11.5,
              color: COLOR.inkSoft,
              marginTop: 7,
            }}
          >
            {t("auth.tagline")}
          </div>
        </div>

        {/* Small onboarding message */}
        <div
          key={slideIndex}
          style={{
            animation: "heroFade 0.5s ease",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0 16px",
            marginBottom: 4,
            borderBottom: `1px solid ${COLOR.lineSoft}`,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              flex: "0 0 34px",
              borderRadius: "50%",
              background: COLOR.oxbloodSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              size={16}
              color={COLOR.oxblood}
              strokeWidth={1.8}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 13.5,
                color: COLOR.ink,
                lineHeight: 1.25,
                marginBottom: 2,
              }}
            >
              {t(titleKey)}
            </div>

            <div
              style={{
                fontFamily: SANS,
                fontSize: 10.5,
                color: COLOR.inkSoft,
                lineHeight: 1.45,
              }}
            >
              {t(bodyKey)}
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 4,
            margin: "9px 0 24px",
          }}
        >
          {ONBOARD_SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === slideIndex ? 14 : 4,
                height: 4,
                borderRadius: 4,
                background:
                  i === slideIndex
                    ? COLOR.ink
                    : COLOR.lineSoft,
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>

        {/* Auth heading */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 20,
              color: COLOR.ink,
              marginBottom: 4,
            }}
          >
            {mode === "signin"
              ? t("auth.signIn")
              : t("auth.createAccount")}
          </div>

          <div
            style={{
              fontFamily: SANS,
              fontSize: 11,
              color: COLOR.inkSoft,
            }}
          >
            {mode === "signin"
              ? "Welcome back."
              : "Create your Reloop account."}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit}>
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.namePlaceholder")}
              style={inputStyle}
            />
          )}

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            type="email"
            autoComplete="email"
            style={inputStyle}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPlaceholder")}
            type="password"
            autoComplete={
              mode === "signin"
                ? "current-password"
                : "new-password"
            }
            style={{
              ...inputStyle,
              marginBottom:
                mode === "signup" && password ? 6 : 8,
            }}
          />

          {/* Password strength */}
          {mode === "signup" && password && (
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  gap: 3,
                  marginBottom: 4,
                }}
              >
                {[0, 1, 2, 3].map((i) => {
                  const strength =
                    checkPasswordStrength(password);

                  const filled = i < strength.score;

                  const strengthColor =
                    strength.strength === "weak"
                      ? "#B23A3A"
                      : strength.strength === "fair"
                      ? COLOR.gold
                      : "#2E6B4F";

                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 2,
                        borderRadius: 2,
                        background: filled
                          ? strengthColor
                          : COLOR.lineSoft,
                      }}
                    />
                  );
                })}
              </div>

              {(() => {
                const strength =
                  checkPasswordStrength(password).strength;

                const labelKey =
                  strength === "weak"
                    ? "auth.passwordWeak"
                    : strength === "fair"
                    ? "auth.passwordFair"
                    : "auth.passwordStrong";

                const strengthColor =
                  strength === "weak"
                    ? "#B23A3A"
                    : strength === "fair"
                    ? COLOR.gold
                    : "#2E6B4F";

                return (
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 10,
                      color: strengthColor,
                    }}
                  >
                    {t(labelKey)}
                  </span>
                );
              })()}
            </div>
          )}

          {/* Remember me */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
              marginBottom: 14,
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) =>
                setRemember(e.target.checked)
              }
              style={{
                accentColor: COLOR.ink,
                width: 13,
                height: 13,
                margin: 0,
              }}
            />

            <span
              style={{
                fontFamily: SANS,
                fontSize: 11,
                color: COLOR.inkSoft,
              }}
            >
              {t("auth.rememberMe")}
            </span>
          </label>

          {/* Agreement */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);

                if (e.target.checked) {
                  setError("");
                }
              }}
              style={{
                accentColor: COLOR.ink,
                width: 13,
                height: 13,
                marginTop: 2,
                flex: "0 0 auto",
              }}
            />

            <span
              style={{
                fontFamily: SANS,
                fontSize: 10.5,
                color: COLOR.inkSoft,
                lineHeight: 1.5,
              }}
            >
              {t("auth.agreePrefix")}{" "}
              <button
                type="button"
                onClick={() => setOpenDoc("terms")}
                style={linkStyle}
              >
                {t("auth.termsLink")}
              </button>
              ,{" "}
              <button
                type="button"
                onClick={() => setOpenDoc("privacy")}
                style={linkStyle}
              >
                {t("auth.privacyLink")}
              </button>
              ,{" "}
              <button
                type="button"
                onClick={() => setOpenDoc("dpa")}
                style={linkStyle}
              >
                {t("auth.dpaLink")}
              </button>{" "}
              {t("common.and")}{" "}
              <button
                type="button"
                onClick={() => setOpenDoc("refund")}
                style={linkStyle}
              >
                {t("auth.refundLink")}
              </button>
              .
            </span>
          </label>

          {/* Error */}
          {error && (
            <p
              style={{
                fontFamily: SANS,
                fontSize: 11,
                color: "#B23A3A",
                margin: "0 0 10px",
                lineHeight: 1.4,
              }}
            >
              {error}
            </p>
          )}

          {/* Primary action */}
          <button
            type="submit"
            disabled={authDisabled}
            style={{
              width: "100%",
              background: COLOR.ink,
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "12px",
              fontFamily: SANS,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: authDisabled
                ? "default"
                : "pointer",
              opacity: authDisabled ? 0.45 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            {busy
              ? "..."
              : mode === "signin"
              ? t("auth.signIn")
              : t("auth.createAccount")}
          </button>
        </form>

        {/* Social login */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "17px 0 12px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: COLOR.lineSoft,
            }}
          />

          <span
            style={{
              fontFamily: SANS,
              fontSize: 9.5,
              color: COLOR.inkSoft,
            }}
          >
            {t("auth.or")}
          </span>

          <div
            style={{
              flex: 1,
              height: 1,
              background: COLOR.lineSoft,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            onClick={google}
            disabled={authDisabled}
            style={socialButtonStyle(authDisabled)}
          >
            {t("auth.continueGoogle")}
          </button>

          <button
            onClick={yahoo}
            disabled={authDisabled}
            style={socialButtonStyle(authDisabled)}
          >
            {t("auth.continueYahoo")}
          </button>
        </div>

        {/* Switch mode */}
        <button
          onClick={() => {
            setError("");
            setMode((m) =>
              m === "signin" ? "signup" : "signin"
            );
          }}
          style={{
            display: "block",
            background: "none",
            border: "none",
            margin: "18px auto 0",
            padding: 0,
            fontFamily: SANS,
            fontSize: 11,
            color: COLOR.oxblood,
            cursor: "pointer",
          }}
        >
          {mode === "signin"
            ? t("auth.newHere")
            : t("auth.haveAccount")}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${COLOR.line}`,
  borderRadius: 8,
  padding: "11px 12px",
  fontFamily: SANS,
  fontSize: 12.5,
  color: COLOR.ink,
  background: "transparent",
  marginBottom: 8,
  outline: "none",
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  fontFamily: SANS,
  fontSize: 10.5,
  color: COLOR.oxblood,
  textDecoration: "underline",
  cursor: "pointer",
};

const socialButtonStyle = (
  disabled: boolean
): React.CSSProperties => ({
  flex: 1,
  background: "transparent",
  border: `1px solid ${COLOR.line}`,
  borderRadius: 8,
  padding: "10px 8px",
  fontFamily: SANS,
  fontSize: 11.5,
  fontWeight: 500,
  color: COLOR.ink,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.45 : 1,
});