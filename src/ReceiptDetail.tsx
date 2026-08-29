import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Printer } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";
import type { Order } from "./data/orders";
import { Capacitor } from "@capacitor/core";
import { Printer as CapacitorPrinter } from "@capgo/capacitor-printer";

interface ReceiptDetailProps {
  order: Order;
  role: "buyer" | "seller";
  sellerId: string;
  onBack: () => void;
}

export default function ReceiptDetail({ order, role, sellerId, onBack }: ReceiptDetailProps) {
  const { t } = useLanguage();
  const isSeller = role === "seller";
  const isAwaitingShipment = order.status === "awaiting_shipment";
  const green = isSeller && isAwaitingShipment;

  /**
   * window.print() works fine in a real mobile browser (which is why this
   * worked in testing before this was ever a native app) but does nothing
   * in a bare Android/iOS WebView — there's no built-in print handling
   * there. @capgo/capacitor-printer's printWebView() uses the platform's
   * actual native print framework (Android's PrintManager, iOS's
   * UIPrintInteractionController) to print the current screen instead.
   */
  const handlePrint = () => {
    if (Capacitor.isNativePlatform()) {
      CapacitorPrinter.printWebView({ name: `Reloop-${order.receiptCode}` }).catch((err) =>
        console.warn("Native print failed:", err)
      );
    } else {
      window.print();
    }
  };

  const qrValue = isSeller
    ? JSON.stringify({ sellerId, code: order.receiptCode })
    : JSON.stringify({
        code: order.receiptCode,
        orderId: order.id,
        item: `${order.listing.brand} ${order.listing.title}`.trim(),
        price: order.listing.price,
      });

  const accentBg = green ? "#E3F0E8" : COLOR.card;
  const accentBorder = green ? "#2E6B4F" : COLOR.line;
  const accentText = green ? "#1F4E38" : COLOR.ink;

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: COLOR.bg }}>
      {/*
        @page sizes the printed page itself to a standard shipping-label
        format (100x150mm / 4x6") — the same size Bluetooth/Wi-Fi/USB label
        printers and most shipping-label paper expect. .no-print/.print-label
        swap visibility only inside @media print, so on-screen this still
        shows the normal receipt view, and printing shows only the compact
        label — never the app chrome (header, back button, wallet details,
        etc.) that would otherwise get printed onto a shipping label.
        @capgo/capacitor-printer's printWebView() renders through the
        platform's real print pipeline, which respects these rules exactly
        like a browser's own window.print() would.
      */}
      <style>{`
        .print-label { display: none; }
        @media print {
          @page { size: 100mm 150mm; margin: 5mm; }
          .no-print { display: none !important; }
          .print-label { display: block !important; }
        }
      `}</style>

      {isSeller && (
        <div className="print-label" style={{ width: "90mm", fontFamily: SANS, color: "#000" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "1.5px solid #000" }}>
            <img
              src="/reloop-logo.png"
              alt="Reloop"
              style={{ width: 26, height: 26, objectFit: "contain" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: "0.06em" }}>Reloop</span>
          </div>

          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 6px" }}>{t("profile.shipTo")}</p>
          {order.shippingAddress && (
            <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{order.buyerName}</div>
              <div>{order.shippingAddress.line1}</div>
              {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
              <div>
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
              </div>
              <div>{order.shippingAddress.country}</div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px dashed #000", paddingTop: 12 }}>
            <div>
              <p style={{ fontSize: 9, letterSpacing: "0.06em", margin: "0 0 2px", color: "#444" }}>{t("profile.receiptCode")}</p>
              <p style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>{order.receiptCode}</p>
            </div>
            <QRCodeSVG value={qrValue} size={64} />
          </div>
        </div>
      )}

      <div className="no-print" style={{ display: "contents" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px 12px",
          borderBottom: `0.5px solid ${COLOR.line}`,
        }}
      >
        <button onClick={onBack} aria-label={t("product.back")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={22} color={COLOR.ink} />
        </button>
        <span style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", color: COLOR.ink }}>
          {t(isAwaitingShipment && isSeller ? "profile.awaitingOrderReceiptTitle" : "profile.receiptTitle")}
        </span>
        <span style={{ width: 22 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <div
          style={{
            background: accentBg,
            border: `1.5px solid ${accentBorder}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          {green && (
            <div
              style={{
                display: "inline-block",
                background: "#2E6B4F",
                color: "#fff",
                fontFamily: SANS,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
                padding: "4px 10px",
                borderRadius: 12,
                marginBottom: 14,
                textTransform: "uppercase",
              }}
            >
              {t("shipping.awaitingShipment")}
            </div>
          )}

          <p style={{ fontFamily: SERIF, fontSize: 18, color: accentText, margin: "0 0 4px" }}>
            {order.listing.brand} {order.listing.title}
          </p>
          <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: "0 0 18px" }}>
            {new Date(order.createdAt).toLocaleString()}
          </p>

          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 16px" }}>
            <div style={{ background: "#fff", padding: 14, borderRadius: 12, border: `0.5px solid ${COLOR.line}` }}>
              <QRCodeSVG value={qrValue} size={148} />
            </div>
          </div>
          <p style={{ fontFamily: SANS, fontSize: 10.5, color: COLOR.inkSoft, textAlign: "center", margin: "0 0 18px" }}>
            {t("profile.scanCaption")}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: accentText,
                background: "#fff",
                border: `1px dashed ${accentBorder}`,
                borderRadius: 8,
                padding: "8px 18px",
              }}
            >
              {order.receiptCode}
            </span>
          </div>

          <div style={{ borderTop: `0.5px solid ${accentBorder}`, paddingTop: 14 }}>
            <Row label={t("profile.item")} value={`${order.listing.brand} ${order.listing.title}`.trim()} />
            <Row label={t("profile.totalPaid")} value={`€${order.listing.price}`} />
            {order.packageSize && <Row label={t("shipping.packageSize")} value={t(`shipping.${order.packageSize}`)} />}

            {isSeller && (
              <>
                <Row label={t("profile.buyerLabel")} value={order.buyerName || "—"} />
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: COLOR.inkSoft, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px" }}>
                    {t("profile.shipTo")}
                  </p>
                  {order.shippingAddress ? (
                    <div
                      style={{
                        background: "#fff",
                        border: `1px solid ${accentBorder}`,
                        borderRadius: 10,
                        padding: 14,
                        fontFamily: SANS,
                        fontSize: 13,
                        color: COLOR.ink,
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{order.buyerName}</div>
                      <div>{order.shippingAddress.line1}</div>
                      {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                      <div>
                        {order.shippingAddress.postalCode} {order.shippingAddress.city}
                      </div>
                      <div>{order.shippingAddress.country}</div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#FBEAEA",
                        border: "1px solid #B23A3A",
                        borderRadius: 10,
                        padding: 14,
                        fontFamily: SANS,
                        fontSize: 12.5,
                        color: "#B23A3A",
                        fontWeight: 600,
                      }}
                    >
                      {t("profile.shipToMissing")}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isSeller && !order.shippingAddress && (
          <p style={{ fontFamily: SANS, fontSize: 11.5, color: "#B23A3A", marginTop: 10, padding: "0 4px" }}>
            {t("profile.shipToMissingHint")}
          </p>
        )}

        {isSeller && (
          <button
            onClick={handlePrint}
            disabled={!order.shippingAddress}
            style={{
              width: "100%",
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: order.shippingAddress ? COLOR.ink : COLOR.lineSoft,
              color: order.shippingAddress ? "#fff" : COLOR.inkSoft,
              border: "none",
              borderRadius: 10,
              padding: "12px",
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              cursor: order.shippingAddress ? "pointer" : "default",
            }}
          >
            <Printer size={14} /> {t("profile.printSticker")}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!label) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: COLOR.ink }}>{value}</span>
    </div>
  );
}
