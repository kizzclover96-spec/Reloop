import React, { useState } from "react";
import { ChevronLeft, X, Check } from "lucide-react";
import { COLOR, SERIF, SANS, cssBackground } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";
import { useCart } from "./context/CartContext";
import { buyerPrice } from "./utils/price";
import { shippingCostFor, type PackageSize } from "./utils/shipping";
import type { Listing } from "./data/listings";
import CartCheckout from "./CartCheckout";

interface CartProps {
  listings: Listing[];
  buyer: { uid: string; name: string } | null;
  onClose: () => void;
}

const SIZE_RANK: Record<PackageSize, number> = { small: 0, medium: 1, large: 2 };

export default function Cart({ listings, buyer, onClose }: CartProps) {
  const { t } = useLanguage();
  const { itemIds, removeItem, clear } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  // Resolve cart item ids against the live listings array — anything sold or
  // deleted since being added just silently drops out here (can't check out
  // something that no longer exists), rather than crashing on a stale id.
  const items = itemIds
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is Listing => Boolean(l) && l.status === "active");
  const removedCount = itemIds.length - items.length;

  const bySeller = new Map<string, Listing[]>();
  for (const item of items) {
    if (!bySeller.has(item.sellerId)) bySeller.set(item.sellerId, []);
    bySeller.get(item.sellerId)!.push(item);
  }

  let total = 0;
  const groups = Array.from(bySeller.entries()).map(([sellerId, sellerItems]) => {
    const biggestSize = sellerItems.reduce<PackageSize>((max, i) => {
      const size = (i.packageSize as PackageSize) || "medium";
      return SIZE_RANK[size] > SIZE_RANK[max] ? size : max;
    }, "small");
    const shipping = shippingCostFor(biggestSize);
    const itemsTotal = sellerItems.reduce((sum, i) => sum + buyerPrice(i), 0);
    const subtotal = itemsTotal + shipping;
    total += subtotal;
    const inCartIds = new Set(sellerItems.map((i) => i.id));
    const suggestions = listings
      .filter((l) => l.sellerId === sellerId && l.status === "active" && !inCartIds.has(l.id))
      .slice(0, 4);
    return { sellerId, sellerName: sellerItems[0].seller?.name || t("cart.seller"), items: sellerItems, shipping, subtotal, suggestions };
  });

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    clear();
    setJustPaid(true);
  };

  if (showCheckout && buyer) {
    return (
      <CartCheckout
        listingIds={items.map((i) => i.id)}
        buyerName={buyer.name}
        total={total}
        onClose={() => setShowCheckout(false)}
        onSuccess={handleCheckoutSuccess}
      />
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 55, display: "flex", flexDirection: "column" }}>
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
        <button onClick={onClose} aria-label={t("product.back")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={22} color={COLOR.ink} />
        </button>
        <span style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", color: COLOR.ink }}>
          {t("cart.title")}
        </span>
        <span style={{ width: 22 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        {removedCount > 0 && (
          <p style={{ fontFamily: SANS, fontSize: 12, color: "#B23A3A", background: "#FBEAEA", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
            {t("cart.itemsRemoved")}
          </p>
        )}

        {items.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: "0 0 6px" }}>{t("cart.empty")}</p>
            <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>{t("cart.emptySubtitle")}</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.sellerId} style={{ marginBottom: 22, border: `0.5px solid ${COLOR.line}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: COLOR.lineSoft, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: COLOR.ink }}>{group.sellerName}</span>
                {group.items.length > 1 && (
                  <span style={{ fontFamily: SANS, fontSize: 10.5, color: COLOR.inkSoft }}>{t("cart.onePackage")}</span>
                )}
              </div>
              <div style={{ background: COLOR.card }}>
                {group.items.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: cssBackground(item.images[0]), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: COLOR.ink }}>
                        {item.brand} {item.title}
                      </div>
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: COLOR.ink }}>€{buyerPrice(item)}</div>
                    <button
                      onClick={() => removeItem(item.id)}
                      aria-label={t("cart.remove")}
                      style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}
                    >
                      <X size={14} color={COLOR.inkSoft} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px" }}>
                  <span style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft }}>{t("shipping.costLabel")}</span>
                  <span style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft }}>€{group.shipping.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 10px" }}>
                  <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: COLOR.ink }}>{t("cart.subtotal")}</span>
                  <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: COLOR.ink }}>€{group.subtotal.toFixed(2)}</span>
                </div>

                {group.suggestions.length > 0 && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.oxblood, margin: "0 0 8px" }}>{t("cart.addMoreNudge")}</p>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                      {group.suggestions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addItem(item.id)}
                          style={{
                            flexShrink: 0,
                            width: 64,
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ position: "relative", width: 64, height: 64, borderRadius: 8, background: cssBackground(item.images[0]), marginBottom: 4 }}>
                            <div
                              style={{
                                position: "absolute",
                                bottom: 3,
                                right: 3,
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: COLOR.ink,
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                lineHeight: 1,
                              }}
                            >
                              +
                            </div>
                          </div>
                          <div style={{ fontFamily: SANS, fontSize: 10, color: COLOR.inkSoft }}>€{buyerPrice(item)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div style={{ padding: "12px 18px 20px", borderTop: `0.5px solid ${COLOR.line}`, flexShrink: 0 }}>
          <button
            onClick={() => setShowCheckout(true)}
            style={{
              width: "100%",
              background: COLOR.ink,
              color: "#fff",
              border: "none",
              borderRadius: 28,
              padding: "16px",
              fontFamily: SANS,
              fontSize: 14.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("cart.checkoutTotal", { amount: total.toFixed(2) })}
          </button>
        </div>
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
            <p style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink, margin: "0 0 8px" }}>{t("checkout.paymentSuccessTitle")}</p>
            <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, margin: "0 0 20px" }}>{t("checkout.paymentSuccessBody")}</p>
            <button
              onClick={() => {
                setJustPaid(false);
                onClose();
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
    </div>
  );
}
