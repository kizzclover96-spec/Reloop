import React, { useState } from "react";
import { ChevronLeft, MapPin } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";
import { verifyAndSaveAddress, type UserAddress } from "./data/address";

interface AddressSetupProps {
  initialAddress?: UserAddress | null;
  onSaved: () => void;
  onCancel?: () => void; // present when editing from Settings; absent for the mandatory signup gate
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

export default function AddressSetup({ initialAddress, onSaved, onCancel }: AddressSetupProps) {
  const { t } = useLanguage();
  const [line1, setLine1] = useState(initialAddress?.line1 || "");
  const [line2, setLine2] = useState(initialAddress?.line2 || "");
  const [city, setCity] = useState(initialAddress?.city || "");
  const [postalCode, setPostalCode] = useState(initialAddress?.postalCode || "");
  const [country, setCountry] = useState(initialAddress?.country || "Germany");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1.trim() || !city.trim() || !postalCode.trim() || !country.trim()) {
      return setError(t("address.errorMissing"));
    }
    setError("");
    setBusy(true);
    try {
      await verifyAndSaveAddress({ line1: line1.trim(), line2: line2.trim(), city: city.trim(), postalCode: postalCode.trim(), country: country.trim() });
      onSaved();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("ADDRESS_NOT_FOUND")) setError(t("address.errorNotFound"));
      else if (msg.includes("ADDRESS_IMPRECISE")) setError(t("address.errorImprecise"));
      else setError(t("address.errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {onCancel && (
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px 0" }}>
          <button onClick={onCancel} aria-label={t("product.back")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
            <ChevronLeft size={22} color={COLOR.ink} />
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px" }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: COLOR.oxbloodSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <MapPin size={20} color={COLOR.oxblood} strokeWidth={1.8} />
        </div>

        <p style={{ fontFamily: SERIF, fontSize: 22, color: COLOR.ink, margin: "0 0 6px" }}>{t("address.title")}</p>
        <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft, margin: "0 0 20px" }}>{t("address.subtitle")}</p>

        <form onSubmit={submit}>
          <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder={t("address.line1")} style={inputStyle} />
          <input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder={t("address.line2")} style={inputStyle} />
          <div style={{ display: "flex", gap: 10 }}>
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder={t("address.postalCode")} style={{ ...inputStyle, width: 110 }} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("address.city")} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("address.country")} style={inputStyle} />

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
            {busy ? t("address.verifying") : t("address.save")}
          </button>
        </form>

        <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, marginTop: 16 }}>{t("address.privacyNote")}</p>
        {!onCancel && (
          <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, marginTop: 4 }}>{t("address.changeLater")}</p>
        )}
      </div>
    </div>
  );
}
