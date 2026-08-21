import React, { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { ChevronLeft } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";
import { getStripe } from "./stripeClient";
import { createCartCheckoutIntent } from "./data/cart";
import { PayForm } from "./Checkout";

interface CartCheckoutProps {
  listingIds: string[];
  buyerName: string;
  total: number; // display only — the real charge amount is computed and set server-side
  onClose: () => void;
  onSuccess: () => void;
}

const ERROR_KEYS: Record<string, string> = {
  SELLER_NOT_READY: "checkout.sellerNotReadyBody",
  ITEM_UNAVAILABLE: "checkout.itemUnavailable",
  OWN_LISTING: "checkout.ownListing",
  CART_EMPTY: "cart.empty",
};

export default function CartCheckout({ listingIds, buyerName, total, onClose, onSuccess }: CartCheckoutProps) {
  const { t } = useLanguage();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createCartCheckoutIntent(listingIds, buyerName)
      .then((secret) => {
        if (!cancelled) setClientSecret(secret);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const message = err?.message || "";
        const matched = Object.keys(ERROR_KEYS).find((code) => message.includes(code));
        setErrorCode(matched || "GENERIC");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlay = (children: React.ReactNode) => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,18,15,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 24,
      }}
    >
      {children}
    </div>
  );

  if (errorCode) {
    const isSellerNotReady = errorCode === "SELLER_NOT_READY";
    return overlay(
      <div style={{ background: COLOR.card, borderRadius: 16, padding: 24, maxWidth: 300, textAlign: "center" }}>
        <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: "0 0 8px" }}>
          {isSellerNotReady ? t("checkout.sellerNotReadyTitle") : t("checkout.genericError")}
        </p>
        <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, margin: "0 0 18px" }}>
          {t(ERROR_KEYS[errorCode] || "checkout.genericError")}
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: COLOR.ink,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "11px",
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("checkout.goBack")}
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return overlay(
      <div style={{ background: COLOR.card, borderRadius: 16, padding: "24px 32px" }}>
        <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft, margin: 0 }}>{t("checkout.loading")}</p>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 60, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 12px",
          borderBottom: `0.5px solid ${COLOR.line}`,
          flexShrink: 0,
        }}
      >
        <button onClick={onClose} aria-label={t("checkout.goBack")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={22} color={COLOR.ink} />
        </button>
        <span style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", color: COLOR.ink }}>
          {t("checkout.title")}
        </span>
        <span style={{ width: 22 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0 16px", borderBottom: `0.5px solid ${COLOR.lineSoft}`, marginBottom: 16 }}>
          <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>{t("cart.itemCount", { count: listingIds.length })}</span>
          <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: COLOR.ink }}>€{total.toFixed(2)}</span>
        </div>

        <Elements
          stripe={getStripe()}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: COLOR.ink,
                colorText: COLOR.ink,
                colorTextSecondary: COLOR.inkSoft,
                fontFamily: "'Inter', -apple-system, sans-serif",
                borderRadius: "10px",
              },
            },
          }}
        >
          <PayForm amount={total} onSuccess={onSuccess} />
        </Elements>
      </div>
    </div>
  );
}
