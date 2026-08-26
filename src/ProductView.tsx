import React, { useState } from "react";
import { ChevronLeft, Bookmark, Share2, ShieldCheck, CheckCircle2, Check, ShoppingCart } from "lucide-react";
import { COLOR, SERIF, SANS, cssBackground, cssBackgroundContain } from "./theme";
import type { Listing } from "./data/listings";
import { useLanguage } from "./i18n/LanguageContext";
import { buyerPrice } from "./utils/price";
import { shippingCostFor } from "./utils/shipping";
import { useCart } from "./context/CartContext";
import Checkout from "./Checkout";
import { useIsMobile } from "./hooks/useIsMobile";

export interface ProductViewProps {
  product: Listing;
  listings?: Listing[];
  onSelectProduct?: (id: string) => void;
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

export default function ProductView({ product, listings = [], onSelectProduct, isSaved, onToggleSave, onBack, buyer }: ProductViewProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [imgIndex, setImgIndex] = useState(0);
  const [error, setError] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const sold = product.status === "sold";
  const isOwnListing = buyer?.uid === product.sellerId;
  const price = buyerPrice(product);
  const moreFromSeller = listings.filter((l) => l.sellerId === product.sellerId && l.id !== product.id && l.status === "active").slice(0, 6);
  const shippingCost = shippingCostFor(product.packageSize);
  const { addItem, has } = useCart();
  const [addedToast, setAddedToast] = useState(false);

  const handleAddToCart = () => {
    addItem(product.id);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 1800);
  };

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
    // this callback fires, so justPaid covers that gap in the price/button area.
  };

  return (
    <div
      style={
        isMobile
          ? { minHeight: "100%", background: COLOR.bg }
          : { minHeight: "100%", background: COLOR.bg, display: "flex", flexDirection: "row", gap: 40, padding: "32px 40px 60px", boxSizing: "border-box", alignItems: "flex-start" }
      }
    >
      <div
        style={
          isMobile
            ? {
                position: "relative",
                height: 320,
                background: cssBackgroundContain(product.images[imgIndex]),
                cursor: product.images.length > 1 ? "pointer" : "default",
              }
            : {
                position: "relative",
                width: 460,
                flexShrink: 0,
                aspectRatio: product.ratio || "1 / 1",
                background: cssBackgroundContain(product.images[imgIndex]),
                borderRadius: 18,
                cursor: product.images.length > 1 ? "pointer" : "default",
              }
        }
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
        style={
          isMobile
            ? {
                background: COLOR.card,
                borderRadius: "18px 18px 0 0",
                marginTop: -18,
                position: "relative",
                padding: "18px 18px 100px",
              }
            : {
                background: COLOR.card,
                flex: 1,
                minWidth: 0,
                maxWidth: 620,
                padding: "0 0 100px",
              }
        }
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
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
            </div>
          </div>
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

        {product.description && (
          <p style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.65, color: COLOR.ink, margin: "0 0 20px", whiteSpace: "pre-wrap" }}>
            {product.description}
          </p>
        )}

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

        {moreFromSeller.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: COLOR.ink, marginBottom: 10 }}>
              {t("product.moreFromSeller")}
            </p>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {moreFromSeller.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectProduct?.(item.id)}
                  style={{
                    flexShrink: 0,
                    width: 92,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: onSelectProduct ? "pointer" : "default",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 92, height: 92, borderRadius: 10, background: cssBackground(item.images[0]), marginBottom: 6 }} />
                  <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.ink, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.brand} {item.title}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft }}>€{buyerPrice(item)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#B23A3A", padding: "0 18px 8px", margin: 0 }}>{error}</p>
      )}
      {isOwnListing && !sold && (
        <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, padding: "0 18px 8px", margin: 0 }}>
          {t("product.ownListing")}
        </p>
      )}

      {justPaid && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,18,15,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            padding: 24,
          }}
        >
          <div style={{ background: COLOR.card, borderRadius: 16, padding: 28, maxWidth: 300, textAlign: "center" }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "#E3F0E8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <Check size={22} color="#2E6B4F" strokeWidth={2.2} />
            </div>
            <p style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink, margin: "0 0 8px" }}>
              {t("checkout.paymentSuccessTitle")}
            </p>
            <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, margin: "0 0 20px" }}>
              {t("checkout.paymentSuccessBody")}
            </p>
            <button
              onClick={() => {
                setJustPaid(false);
                onBack();
              }}
              style={{
                width: "100%",
                background: COLOR.ink,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px",
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("checkout.gotIt")}
            </button>
          </div>
        </div>
      )}

      <div
        style={
          isMobile
            ? {
                position: "sticky",
                bottom: 0,
                background: COLOR.card,
                borderTop: `0.5px solid ${COLOR.line}`,
                padding: "14px 18px 20px",
                display: "flex",
                justifyContent: "center",
              }
            : {
                position: "fixed",
                left: 540,
                right: 40,
                bottom: 0,
                background: COLOR.card,
                borderTop: `0.5px solid ${COLOR.line}`,
                padding: "16px 0 24px",
                display: "flex",
                justifyContent: "flex-start",
              }
        }
      >
        <div style={{ width: "100%", maxWidth: isMobile ? 320 : "100%", display: "flex", gap: 10 }}>
          {!sold && !isOwnListing && (
            <button
              onClick={handleAddToCart}
              aria-label={t("cart.addToCart")}
              style={{
                flexShrink: 0,
                width: 54,
                border: `1.5px solid ${COLOR.ink}`,
                background: "none",
                borderRadius: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: has(product.id) ? "#2E6B4F" : COLOR.ink,
              }}
            >
              {has(product.id) ? <Check size={18} /> : <ShoppingCart size={18} />}
            </button>
          )}
          <button
            onClick={handleBuy}
            disabled={sold || isOwnListing}
            style={{
              flex: 1,
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
      </div>

      {addedToast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,18,15,0.85)",
            color: "#fff",
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: 20,
            zIndex: 65,
          }}
        >
          {t("cart.addedToCart")}
        </div>
      )}

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
