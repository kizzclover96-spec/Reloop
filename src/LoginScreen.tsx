import React, { useState } from "react";
import { COLOR, SERIF, SANS } from "./theme";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./i18n/LanguageContext";
import { checkPasswordStrength } from "./utils/password";

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const friendlyError = (code: string) => {
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
      return t("auth.errorCredential");
    if (code.includes("email-already-in-use")) return t("auth.errorInUse");
    if (code.includes("weak-password")) return t("auth.errorWeak");
    if (code.includes("invalid-email")) return t("auth.errorInvalidEmail");
    return t("auth.errorGeneric");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError(t("auth.errorEmpty"));
    if (mode === "signup" && !checkPasswordStrength(password).passes) {
      return setError(t("auth.errorPasswordWeak"));
    }
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(friendlyError(err?.code || ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px" }}>
      <p style={{ fontFamily: SERIF, fontSize: 30, color: COLOR.ink, margin: "0 0 4px" }}>Reloop</p>
      <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft, margin: "0 0 32px" }}>
        {t("auth.tagline")}
      </p>

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
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          style={{ ...inputStyle, marginBottom: mode === "signup" && password ? 6 : 10 }}
        />

        {mode === "signup" && password && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
              {[0, 1, 2, 3].map((i) => {
                const strength = checkPasswordStrength(password);
                const filled = i < strength.score;
                const color =
                  strength.strength === "weak" ? "#B23A3A" : strength.strength === "fair" ? COLOR.gold : "#2E6B4F";
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: filled ? color : COLOR.lineSoft,
                    }}
                  />
                );
              })}
            </div>
            {(() => {
              const strength = checkPasswordStrength(password).strength;
              const labelKey =
                strength === "weak" ? "auth.passwordWeak" : strength === "fair" ? "auth.passwordFair" : "auth.passwordStrong";
              const color = strength === "weak" ? "#B23A3A" : strength === "fair" ? COLOR.gold : "#2E6B4F";
              return (
                <span style={{ fontFamily: SANS, fontSize: 11, color }}>{t(labelKey)}</span>
              );
            })()}
          </div>
        )}

        {error && <p style={{ fontFamily: SANS, fontSize: 12, color: "#B23A3A", margin: "0 0 12px" }}>{error}</p>}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            background: COLOR.ink,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "13px",
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
        <div style={{ flex: 1, height: 1, background: COLOR.line }} />
        <span style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft }}>{t("auth.or")}</span>
        <div style={{ flex: 1, height: 1, background: COLOR.line }} />
      </div>

      <button
        onClick={google}
        disabled={busy}
        style={{
          width: "100%",
          background: "none",
          border: `0.5px solid ${COLOR.line}`,
          borderRadius: 10,
          padding: "12px",
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 600,
          color: COLOR.ink,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {t("auth.continueGoogle")}
      </button>

      <button
        onClick={() => {
          setError("");
          setMode((m) => (m === "signin" ? "signup" : "signin"));
        }}
        style={{
          background: "none",
          border: "none",
          marginTop: 20,
          fontFamily: SANS,
          fontSize: 12.5,
          color: COLOR.oxblood,
          cursor: "pointer",
        }}
      >
        {mode === "signin" ? t("auth.newHere") : t("auth.haveAccount")}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `0.5px solid ${COLOR.line}`,
  borderRadius: 10,
  padding: "12px 14px",
  fontFamily: SANS,
  fontSize: 13,
  color: COLOR.ink,
  marginBottom: 10,
};
