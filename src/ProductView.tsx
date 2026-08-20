import React, { useState } from "react";
import { ChevronLeft, Bookmark, Share2, Star, ShieldCheck, CheckCircle2, Check } from "lucide-react";
import { COLOR, SERIF, SANS, cssBackground, cssBackgroundContain } from "./theme";
import type { Listing } from "./data/listings";
import { useLanguage } from "./i18n/LanguageContext";
import { buyerPrice } from "./utils/price";
import { shippingCostFor } from "./utils/shipping";
import Checkout from "./Checkout";

export interface ProductViewProps {
  product: Listing;
  isSaved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
  buyer: { uid: string; name: string } | null;
}

function RoundButton({
  children,
  onClick,
  label,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        border: "none",
        background: active ? COLOR.ink : "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      {children}
    </button>
  );
}

export default function ProductView({ product, isSaved, onToggleSave, onBack, buyer }: ProductViewProps) {
  const { t } = useLanguage();
  const [imgIndex, setImgIndex] = useState(0);
  const [error, setError] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const sold = product.status === "sold";
  const isOwnListing = buyer?.uid === product.sellerId;
  const price = buyerPrice(product);
  const shippingCost = shippingCostFor(product.packageSize);

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?item=${product.id}`;
    const shareData = {
      title: `${product.brand} ${product.title}`.trim(),
      text: `${product.brand} ${product.title} — €${price} on Reloop`.trim(),
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  };

  const handleBuy = () => {
    if (sold || !buyer || isOwnListing) return;
    setError("");
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setJustPaid(true);
    // The listing flips to "sold" once the webhook processes the payment —
    // usually near-instant, but not guaranteed to have landed by the time
    // this callback fires, so this local flag covers the gap.
  };

  return (
    <div style={{ minHeight: "100%", background: COLOR.bg }}>
      <div
        style={{
          position: "relative",
          height: 320,
          background: cssBackgroundContain(product.images[imgIndex]),
          cursor: product.images.length > 1 ? "pointer" : "default",
        }}
        onClick={() => setImgIndex((i) => (i + 1) % product.images.length)}
      >
        <div style={{ position: "absolute", top: 14, left: 14 }}>
          <RoundButton label={t("product.back")} onClick={onBack}>
            <ChevronLeft size={18} color={COLOR.ink} />
          </RoundButton>
        </div>
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 8 }}>
          <RoundButton label={isSaved ? t("product.removeSaved") : t("product.saveItem")} active={isSaved} onClick={onToggleSave}>
            <Bookmark size={16} color={isSaved ? "#fff" : COLOR.ink} fill={isSaved ? "#fff" : "none"} />
          </RoundButton>
          <RoundButton label={t("product.shareItem")} onClick={handleShare}>
            <Share2 size={16} color={COLOR.ink} />
          </RoundButton>
        </div>

        {product.images.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              gap: 5,
            }}
          >
            {product.images.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === imgIndex ? 14 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === imgIndex ? "#fff" : "rgba(255,255,255,0.55)",
                  transition: "width 0.15s ease",
                }}
              />
            ))}
          </div>
        )}

        {linkCopied && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(20,18,15,0.85)",
              color: "#fff",
              fontFamily: SANS,
              fontSize: 11.5,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 20,
            }}
          >
            {t("product.linkCopied")}
          </div>
        )}
      </div>

      <div
        style={{
          background: COLOR.card,
          borderRadius: "18px 18px 0 0",
          marginTop: -18,
          position: "relative",
          padding: "18px 18px 100px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: COLOR.oxbloodSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                color: COLOR.oxblood,
              }}
            >
              {product.seller.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink }}>
                {product.seller.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Star size={11} color={COLOR.gold} fill={COLOR.gold} />
                <span style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft }}>
                  {product.seller.rating.toFixed(1)} ({product.seller.reviews})
                </span>
              </div>
            </div>
          </div>
          <button
            style={{
              border: `0.5px solid ${COLOR.line}`,
              background: "none",
              borderRadius: 20,
              padding: "8px 14px",
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              color: COLOR.ink,
              cursor: "pointer",
            }}
          >
            {t("product.messageSeller")}
          </button>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: COLOR.oxbloodSoft,
            color: COLOR.oxblood,
            fontFamily: SANS,
            fontSize: 11.5,
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 20,
            marginBottom: 12,
          }}
        >
          <CheckCircle2 size={12} /> {product.condition}
        </div>

        <p style={{ fontFamily: SERIF, fontSize: 19, color: COLOR.ink, margin: "0 0 4px" }}>
          {product.brand} {product.title}
        </p>
        <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, margin: "0 0 16px" }}>
          {product.size} &nbsp;·&nbsp; {product.location}
        </p>

        <div style={{ borderTop: `0.5px solid ${COLOR.lineSoft}`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color: COLOR.ink }}>
              €{price}
            </span>
            {!product.giveaway && product.was && (
              <span style={{ fontFamily: SANS, fontSize: 14, color: "#B23A3A", textDecoration: "line-through" }}>
                €{product.was}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>{t("shipping.costLabel")}</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>€{shippingCost.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: COLOR.ink }}>{t("shipping.total")}</span>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: COLOR.ink }}>€{(price + shippingCost).toFixed(2)}</span>
          </div>
          {!product.giveaway && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
              <ShieldCheck size={13} color={COLOR.inkSoft} />
              <span style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft }}>
                {t("product.buyerProtection")}
              </span>
            </div>
          )}
        </div>
      </div>

      {justPaid && !sold && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#2E6B4F", padding: "0 18px 8px", margin: 0 }}>
          {t("checkout.successBody")}
        </p>
      )}

      {error && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#B23A3A", padding: "0 18px 8px", margin: 0 }}>{error}</p>
      )}
      {isOwnListing && !sold && (
        <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, padding: "0 18px 8px", margin: 0 }}>
          {t("product.ownListing")}
        </p>
      )}

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: COLOR.card,
          borderTop: `0.5px solid ${COLOR.line}`,
          padding: "14px 18px 20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          onClick={handleBuy}
          disabled={sold || isOwnListing}
          style={{
            width: "100%",
            maxWidth: 320,
            border: "none",
            background: sold ? "#2E6B4F" : COLOR.ink,
            borderRadius: 28,
            padding: "17px",
            fontFamily: SANS,
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            cursor: sold || isOwnListing ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: isOwnListing ? 0.7 : 1,
          }}
        >
          {sold ? (
            <>
              <Check size={16} /> {t("product.sold")}
            </>
          ) : (
            t("product.buyNow")
          )}
        </button>
      </div>

      {showCheckout && buyer && (
        <Checkout
          product={product}
          buyerName={buyer.name}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
