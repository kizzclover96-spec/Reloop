import React, { useEffect, useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ChevronLeft } from "lucide-react";
import { COLOR, SERIF, SANS, cssBackground } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";
import { getStripe } from "./stripeClient";
import { createCheckoutIntent } from "./data/orders";
import { buyerPrice } from "./utils/price";
import { shippingCostFor } from "./utils/shipping";
import type { Listing } from "./data/listings";

interface CheckoutProps {
  product: Listing;
  buyerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ERROR_KEYS: Record<string, string> = {
  SELLER_NOT_READY: "checkout.sellerNotReadyBody",
  ITEM_UNAVAILABLE: "checkout.itemUnavailable",
  OWN_LISTING: "checkout.ownListing",
};

export default function Checkout({ product, buyerName, onClose, onSuccess }: CheckoutProps) {
  const { t } = useLanguage();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const shippingCost = shippingCostFor(product.packageSize);
  const total = buyerPrice(product) + shippingCost;

  useEffect(() => {
    let cancelled = false;
    createCheckoutIntent(product.id, buyerName)
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
  }, [product.id, buyerName]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, background: cssBackground(product.images[0]), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
              {product.brand} {product.title}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>{product.size}</div>
          </div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: COLOR.ink }}>€{buyerPrice(product)}</div>
        </div>

        <div style={{ padding: "10px 0 20px", borderBottom: `0.5px solid ${COLOR.lineSoft}`, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>{t("shipping.costLabel")}</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>€{shippingCost.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: COLOR.ink }}>{t("shipping.total")}</span>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: COLOR.ink }}>€{total.toFixed(2)}</span>
          </div>
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

function PayForm({ amount, onSuccess }: { amount: number; onSuccess: () => void }) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setPayError("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message || t("checkout.genericError"));
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      // Some methods (e.g. certain bank redirects) can leave the intent in
      // "processing" — not modeled further here since this app's payment
      // methods (card, Apple Pay, Google Pay) resolve synchronously.
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <PaymentElement />
      {payError && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#B23A3A", marginTop: 12 }}>{payError}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        style={{
          width: "100%",
          marginTop: 20,
          background: COLOR.ink,
          color: "#fff",
          border: "none",
          borderRadius: 28,
          padding: "16px",
          fontFamily: SANS,
          fontSize: 14.5,
          fontWeight: 700,
          cursor: submitting ? "default" : "pointer",
          opacity: submitting || !stripe ? 0.7 : 1,
        }}
      >
        {submitting ? t("checkout.processing") : t("checkout.pay", { amount })}
      </button>
    </form>
  );
}
