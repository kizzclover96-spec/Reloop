import React, { useState, useEffect } from "react";
import { Repeat, MapPin, ShieldCheck, Heart, X } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./i18n/LanguageContext";
import { checkPasswordStrength } from "./utils/password";
import { sanitizeText } from "./utils/sanitize";
import { setRememberMe } from "./firebase";
import LegalViewer, { type LegalDocKey } from "./legal/LegalViewer";
import {
  getAttemptState,
  recordFailedAttempt,
  clearAttempts,
  isLockedOut,
  remainingLockoutMs,
  formatLockoutTime,
  type AttemptState,
} from "./utils/loginAttempts";

const ONBOARD_SLIDES = [
  { Icon: Repeat, titleKey: "onboard.slide1Title", bodyKey: "onboard.slide1Body" },
  { Icon: MapPin, titleKey: "onboard.slide2Title", bodyKey: "onboard.slide2Body" },
  { Icon: ShieldCheck, titleKey: "onboard.slide3Title", bodyKey: "onboard.slide3Body" },
  { Icon: Heart, titleKey: "onboard.slide4Title", bodyKey: "onboard.slide4Body" },
];
const SLIDE_ROTATE_MS = 4200;
const POLICY_DOCS: { key: LegalDocKey; labelKey: string }[] = [
  { key: "terms", labelKey: "auth.termsLink" },
  { key: "privacy", labelKey: "auth.privacyLink" },
  { key: "dpa", labelKey: "auth.dpaLink" },
  { key: "refund", labelKey: "auth.refundLink" },
];

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
  const [openDoc, setOpenDoc] = useState<LegalDocKey | null>(null);
  const [showPolicies, setShowPolicies] = useState(false);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [popupError, setPopupError] = useState("");
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSlideIndex((i) => (i + 1) % ONBOARD_SLIDES.length), SLIDE_ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  /** Turns an attempt-state into the right user-facing message, or null if not locked. */
  const lockoutMessage = (state: AttemptState): string | null => {
    if (state.lockedForever) return t("auth.lockedForever");
    if (isLockedOut(state)) {
      const ms = remainingLockoutMs(state);
      // The 3-minute stage shows a live countdown; the 1-hour stage just says "about an hour" — a live hour-long countdown isn't useful to stare at.
      return ms > 5 * 60 * 1000 ? t("auth.lockedTemporaryLong") : t("auth.lockedTemporary", { time: formatLockoutTime(ms) });
    }
    return null;
  };

  const friendlyError = (code: string) => {
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
      return t("auth.errorWrongCredentials");
    }
    if (code.includes("email-already-in-use")) return t("auth.errorInUse");
    if (code.includes("weak-password")) return t("auth.errorWeak");
    if (code.includes("invalid-email")) return t("auth.errorInvalidEmail");
    if (code.includes("too-many-requests")) return t("auth.lockedTemporaryLong");
    return t("auth.errorGeneric");
  };

  const isCredentialError = (code: string) =>
    code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found");

  /** Tapping Sign in / Create account on the main screen — validates the email and lockout state, then opens the password popup rather than submitting directly. */
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) return setError(t("auth.errorEmpty"));

    const state = await getAttemptState(email);
    const locked = lockoutMessage(state);
    if (locked) return setError(locked);

    setPassword("");
    setPopupError("");
    setShowPasswordPopup(true);
  };

  /** Actual sign-in/sign-up, triggered from inside the password popup. */
  const submitWithPassword = async () => {
    if (!password) return setPopupError(t("auth.errorEmpty"));
    if (mode === "signup" && !checkPasswordStrength(password).passes) {
      return setPopupError(t("auth.errorPasswordWeak"));
    }

    setPopupError("");
    setBusy(true);
    try {
      await setRememberMe(remember);
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, sanitizeText(name, 60));
      }
      await clearAttempts(email);
      setShowPasswordPopup(false);
    } catch (err: any) {
      const code = err?.code || "";
      if (isCredentialError(code)) {
        const state = await recordFailedAttempt(email);
        const locked = lockoutMessage(state);
        if (locked) {
          setShowPasswordPopup(false);
          setError(locked);
        } else {
          setPopupError(t("auth.errorWrongCredentials") + " " + t("auth.attemptsRemaining", { count: 5 - state.failCount }));
        }
      } else {
        setPopupError(friendlyError(code));
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
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
    return <LegalViewer docKey={openDoc} onBack={() => setOpenDoc(null)} />;
  }

  const currentSlide = ONBOARD_SLIDES[slideIndex];
  const SlideIcon = currentSlide.Icon;

  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: "28px 22px 32px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, margin: "auto 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* BRAND */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <p style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1, letterSpacing: "-0.5px", color: COLOR.ink, margin: 0 }}>Reloop</p>
          <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: "7px 0 0", lineHeight: 1.4 }}>{t("auth.tagline2")}</p>
        </div>

        {/* ONBOARDING CAROUSEL */}
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: 104,
            marginBottom: 20,
            padding: "14px 18px 12px",
            borderRadius: 14,
            background: COLOR.oxbloodSoft,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div key={slideIndex} style={{ animation: "heroFade 0.55s ease", textAlign: "center" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: COLOR.oxblood,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 7px",
              }}
            >
              <SlideIcon size={16} color="#fff" strokeWidth={1.8} />
            </div>
            <p style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.2, color: COLOR.ink, margin: "0 0 3px" }}>{t(currentSlide.titleKey)}</p>
            <p style={{ fontFamily: SANS, fontSize: 10.5, color: COLOR.inkSoft, lineHeight: 1.4, maxWidth: 270, margin: "0 auto" }}>
              {t(currentSlide.bodyKey)}
            </p>
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
            {ONBOARD_SLIDES.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === slideIndex ? 12 : 4,
                  height: 4,
                  borderRadius: 4,
                  background: i === slideIndex ? COLOR.ink : COLOR.lineSoft,
                  transition: "all 0.25s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* AUTH CARD */}
        <div style={{ width: "100%", background: "#fff", border: `0.5px solid ${COLOR.lineSoft}`, borderRadius: 16, padding: "20px 18px 18px", boxSizing: "border-box" }}>
          <p style={{ fontFamily: SERIF, fontSize: 19, color: COLOR.ink, margin: "0 0 15px" }}>
            {mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
          </p>

          <form onSubmit={handleContinue}>
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.namePlaceholder")} style={inputStyle} />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              type="email"
              autoComplete="email"
              style={{ ...inputStyle, marginBottom: 6 }}
            />

            <button
              type="button"
              onClick={() => {
                setError("");
                setMode((m) => (m === "signin" ? "signup" : "signin"));
              }}
              style={{ display: "block", background: "none", border: "none", padding: "0 0 12px", fontFamily: SANS, fontSize: 11, color: COLOR.oxblood, cursor: "pointer" }}
            >
              {mode === "signin" ? t("auth.newHere") : t("auth.haveAccount")}
            </button>

            {error && (
              <div style={{ background: "rgba(178,58,58,0.06)", border: "0.5px solid rgba(178,58,58,0.16)", borderRadius: 8, padding: "7px 9px", marginBottom: 10 }}>
                <p style={{ fontFamily: SANS, fontSize: 10.5, color: "#B23A3A", lineHeight: 1.4, margin: 0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={busy} style={{ width: "100%", height: 42, background: COLOR.ink, color: "#fff", border: "none", borderRadius: 9, fontFamily: SANS, fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.45 : 1 }}>
              {mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "15px 0" }}>
            <div style={{ flex: 1, height: 1, background: COLOR.lineSoft }} />
            <span style={{ fontFamily: SANS, fontSize: 9.5, color: COLOR.inkSoft, textTransform: "uppercase", letterSpacing: "0.6px" }}>{t("auth.or")}</span>
            <div style={{ flex: 1, height: 1, background: COLOR.lineSoft }} />
          </div>

          {/* GOOGLE + YAHOO, SIDE BY SIDE */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={google} disabled={busy} style={secondaryButtonStyle(busy)}>
              {t("auth.continueGoogle")}
            </button>
            <button onClick={yahoo} disabled={busy} style={secondaryButtonStyle(busy)}>
              {t("auth.continueYahoo")}
            </button>
          </div>

          <p style={{ fontFamily: SANS, fontSize: 10, color: COLOR.inkSoft, lineHeight: 1.5, textAlign: "center", margin: "12px 0 0" }}>
            {t("auth.acknowledgePrefix")}{" "}
            <button type="button" onClick={() => setShowPolicies(true)} style={linkStyle}>
              {t("auth.acknowledgeLink")}
            </button>
            .
          </p>
        </div>

        <p style={{ fontFamily: SANS, fontSize: 10.5, color: COLOR.oxblood, margin: "16px 0 0", fontWeight: 600 }}>{t("auth.byMalvin")}</p>
      </div>

      {/* PASSWORD POPUP */}
      {showPasswordPopup && (
        <div style={overlayStyle} onClick={() => !busy && setShowPasswordPopup(false)}>
          <div style={popupCardStyle} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink, margin: "0 0 4px" }}>{t("auth.enterPassword")}</p>
            <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, margin: "0 0 14px" }}>
              {t("auth.passwordPopupSubtitle")} <strong style={{ color: COLOR.ink }}>{email}</strong>
            </p>

            <input
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              onKeyDown={(e) => e.key === "Enter" && submitWithPassword()}
              style={{ ...inputStyle, marginBottom: mode === "signup" && password ? 6 : 10 }}
            />

            {mode === "signup" && password && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                  {[0, 1, 2, 3].map((i) => {
                    const strength = checkPasswordStrength(password);
                    const filled = i < strength.score;
                    const c = strength.strength === "weak" ? "#B23A3A" : strength.strength === "fair" ? COLOR.gold : "#2E6B4F";
                    return <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: filled ? c : COLOR.lineSoft }} />;
                  })}
                </div>
                {(() => {
                  const strength = checkPasswordStrength(password).strength;
                  const labelKey = strength === "weak" ? "auth.passwordWeak" : strength === "fair" ? "auth.passwordFair" : "auth.passwordStrong";
                  const c = strength === "weak" ? "#B23A3A" : strength === "fair" ? COLOR.gold : "#2E6B4F";
                  return <span style={{ fontFamily: SANS, fontSize: 10, color: c }}>{t(labelKey)}</span>;
                })()}
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: COLOR.ink, width: 13, height: 13, margin: 0 }} />
              <span style={{ fontFamily: SANS, fontSize: 11, color: COLOR.ink }}>{t("auth.rememberMe")}</span>
            </label>

            {popupError && (
              <div style={{ background: "rgba(178,58,58,0.06)", border: "0.5px solid rgba(178,58,58,0.16)", borderRadius: 8, padding: "7px 9px", marginBottom: 10 }}>
                <p style={{ fontFamily: SANS, fontSize: 10.5, color: "#B23A3A", lineHeight: 1.4, margin: 0 }}>{popupError}</p>
              </div>
            )}

            <button
              onClick={submitWithPassword}
              disabled={busy}
              style={{ width: "100%", height: 42, background: COLOR.ink, color: "#fff", border: "none", borderRadius: 9, fontFamily: SANS, fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.45 : 1 }}
            >
              {mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
            </button>
          </div>
        </div>
      )}

      {/* POLICIES POPUP */}
      {showPolicies && (
        <div style={overlayStyle} onClick={() => setShowPolicies(false)}>
          <div style={popupCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: 0 }}>{t("auth.policiesTitle")}</p>
              <button onClick={() => setShowPolicies(false)} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}>
                <X size={18} color={COLOR.inkSoft} />
              </button>
            </div>
            <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, margin: "0 0 14px" }}>{t("auth.policiesSubtitle")}</p>
            {POLICY_DOCS.map((doc) => (
              <button
                key={doc.key}
                onClick={() => {
                  setShowPolicies(false);
                  setOpenDoc(doc.key);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  borderTop: `0.5px solid ${COLOR.lineSoft}`,
                  padding: "13px 2px",
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLOR.ink,
                  cursor: "pointer",
                }}
              >
                {t(doc.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  boxSizing: "border-box",
  border: `0.5px solid ${COLOR.line}`,
  borderRadius: 9,
  padding: "0 12px",
  outline: "none",
  background: "#fff",
  fontFamily: SANS,
  fontSize: 12,
  color: COLOR.ink,
  marginBottom: 8,
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  fontFamily: SANS,
  fontSize: 10,
  color: COLOR.oxblood,
  textDecoration: "underline",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 1,
  height: 39,
  background: "#fff",
  border: `0.5px solid ${COLOR.line}`,
  borderRadius: 9,
  padding: "0 8px",
  fontFamily: SANS,
  fontSize: 11.5,
  fontWeight: 600,
  color: COLOR.ink,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.45 : 1,
  transition: "opacity 0.2s ease",
});

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(20,18,15,0.4)",
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 90,
  padding: 24,
};

const popupCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderRadius: 18,
  padding: 22,
  boxSizing: "border-box",
  boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
};
