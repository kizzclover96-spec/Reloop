import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowDownToLine,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  MapPin,
  Bell,
  Truck,
  ShieldCheck,
  LogOut,
  Check,
  Tag,
  ShoppingBag,
  PackageCheck,
  PackageOpen,
  Download,
  Trash2,
  Database,
  Receipt,
  Package,
  RefreshCw,
} from "lucide-react";
import { COLOR, SERIF, SANS, cssBackground } from "./theme";
import { useUserListings, type Listing } from "./data/listings";
import { useUserOrders, submitShipment, cancelOrder, type Order } from "./data/orders";
import { useWithdrawals, requestWithdrawal, useLiveSellerBalance, computeTransactionHistory } from "./data/wallet";
import { getPreference, setPreference, exportLocalData, clearLocalData } from "./data/localStore";
import { exportServerData, deleteServerAccount } from "./data/account";
import { useSellerPaymentStatus, getStripeOnboardingUrl, refreshStripeStatus } from "./data/sellerPayments";
import { useUserAddress } from "./data/address";
import AddressSetup from "./AddressSetup";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./i18n/LanguageContext";

interface DisplayItem {
  id: string;
  image: string;
  title: string;
  price: number;
  note: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

function timeAgo(ms: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return t("common.today");
  if (days === 1) return t("common.yesterday");
  return t("common.daysAgo", { days });
}

function Section({
  icon,
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const showContent = !collapsible || open;

  return (
    <div style={{ padding: "0 18px", marginBottom: 22 }}>
      {collapsible ? (
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 10,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {icon}
            <span style={{ fontFamily: SERIF, fontSize: 15.5, color: COLOR.ink }}>{title}</span>
          </span>
          <ChevronDown
            size={16}
            color={COLOR.inkSoft}
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
          />
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {icon}
          <span style={{ fontFamily: SERIF, fontSize: 15.5, color: COLOR.ink }}>{title}</span>
        </div>
      )}
      {showContent && (
        <div
          style={{
            background: COLOR.card,
            border: `0.5px solid ${COLOR.line}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  onClick,
  showChevron = true,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  showChevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 14px",
        background: "none",
        border: "none",
        borderBottom: `0.5px solid ${COLOR.lineSoft}`,
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {value && <span style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft }}>{value}</span>}
        {showChevron && onClick && <ChevronRight size={14} color={COLOR.inkSoft} />}
      </span>
    </button>
  );
}

function ActivityRow({
  label,
  icon,
  items,
  emptyLabel,
  expanded,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  items: DisplayItem[];
  emptyLabel: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon}
          <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{label}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: SANS,
              fontSize: 11.5,
              fontWeight: 600,
              color: COLOR.oxblood,
              background: COLOR.oxbloodSoft,
              borderRadius: 10,
              padding: "2px 8px",
            }}
          >
            {items.length}
          </span>
          {expanded ? <ChevronDown size={14} color={COLOR.inkSoft} /> : <ChevronRight size={14} color={COLOR.inkSoft} />}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: "0 14px 12px" }}>
          {items.length === 0 ? (
            <p style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, margin: "4px 0 8px" }}>{emptyLabel}</p>
          ) : (
            items.map((item) => (
              <div key={item.id} style={{ padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: cssBackground(item.image),
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: SANS,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: COLOR.ink,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft }}>{item.note}</div>
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: COLOR.ink }}>
                    €{item.price}
                  </div>
                </div>
                {(item.onAction || item.onSecondary) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, paddingLeft: 50 }}>
                    {item.onAction && (
                      <button
                        onClick={item.onAction}
                        style={{
                          background: COLOR.ink,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontFamily: SANS,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {item.actionLabel}
                      </button>
                    )}
                    {item.onSecondary && (
                      <button
                        onClick={item.onSecondary}
                        style={{
                          background: "none",
                          color: COLOR.inkSoft,
                          border: `0.5px solid ${COLOR.line}`,
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontFamily: SANS,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {item.secondaryLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const CARRIERS = ["DHL", "Hermes", "DPD", "UPS", "GLS", "Deutsche Post"];

function ShipPackageForm({
  order,
  onDone,
  t,
}: {
  order: Order;
  onDone: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrier) return setError(t("shipping.errorMissingCarrier"));
    if (!tracking.trim() || tracking.trim().length < 6) return setError(t("shipping.errorInvalidTracking"));
    setError("");
    setBusy(true);
    try {
      await submitShipment(order.id, carrier, tracking.trim());
      setSuccess(true);
      setTimeout(onDone, 1800);
    } catch (err: any) {
      const msg = err?.message || "";
      setError(msg.includes("VERIFY_UNAVAILABLE") ? t("shipping.errorUnavailable") : t("shipping.errorVerifyFailed"));
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    border: `0.5px solid ${COLOR.line}`,
    borderRadius: 10,
    padding: "12px 14px",
    fontFamily: SANS,
    fontSize: 13,
    color: COLOR.ink,
    marginBottom: 10,
    background: "#fff",
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 18px 0" }}>
        <button onClick={onDone} aria-label={t("product.back")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={22} color={COLOR.ink} />
        </button>
      </div>

      <div style={{ flex: 1, padding: "0 26px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
          <Package size={20} color={COLOR.oxblood} strokeWidth={1.8} />
        </div>
        <p style={{ fontFamily: SERIF, fontSize: 19, color: COLOR.ink, margin: "0 0 4px" }}>
          {order.listing.brand} {order.listing.title}
        </p>
        <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, margin: "0 0 20px" }}>{t("shipping.shipPackage")}</p>

        {success ? (
          <p style={{ fontFamily: SANS, fontSize: 13, color: "#2E6B4F" }}>{t("shipping.verifiedSuccess")}</p>
        ) : (
          <form onSubmit={submit}>
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)} style={fieldStyle}>
              <option value="">{t("shipping.carrierLabel")}</option>
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder={t("shipping.trackingPlaceholder")}
              style={fieldStyle}
            />
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
              }}
            >
              {busy ? t("shipping.verifying") : t("shipping.submitTracking")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ProfileScreen({
  user,
  listings,
  stripeReturn,
}: {
  user: any;
  listings: Listing[];
  stripeReturn?: boolean;
}) {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>("selling");
  const [showTransactions, setShowTransactions] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [radius, setRadius] = useState(5);
  const [downloading, setDownloading] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [paymentOpening, setPaymentOpening] = useState(false);
  const [paymentError, setPaymentError] = useState(false);

  const { status: paymentStatus, loading: paymentLoading } = useSellerPaymentStatus(user?.uid);

  useEffect(() => {
    if (stripeReturn) {
      refreshStripeStatus().catch(() => {});
    }
  }, [stripeReturn]);

  const handlePaymentSetup = async () => {
    setPaymentOpening(true);
    setPaymentError(false);
    try {
      const url = await getStripeOnboardingUrl();
      window.location.href = url;
    } catch (err) {
      setPaymentError(true);
      setPaymentOpening(false);
      setTimeout(() => setPaymentError(false), 3000);
    }
  };

  useEffect(() => {
    getPreference("searchRadiusKm", 5).then(setRadius);
  }, []);

  const changeRadius = (value: number) => {
    setRadius(value);
    setPreference("searchRadiusKm", value);
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const [local, server] = await Promise.all([exportLocalData(), exportServerData()]);
      const data = { ...local, server };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reloop-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteData = async () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      setTimeout(() => setDeleteArmed(false), 3000);
      return;
    }
    setDeleteArmed(false);
    setDeletingAccount(true);
    try {
      await deleteServerAccount();
      await clearLocalData();
      setDeleted(true);
      setTimeout(() => {
        logout();
      }, 1200);
    } catch (err) {
      setDeleteError(true);
      setDeletingAccount(false);
      setTimeout(() => setDeleteError(false), 3000);
    }
  };

  const toggle = (key: string) => setExpanded((cur) => (cur === key ? null : key));

  const { asBuyer, asSeller } = useUserOrders(user?.uid);
  const withdrawals = useWithdrawals(user?.uid);
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useLiveSellerBalance(user?.uid);
  const transactions = computeTransactionHistory(asSeller, withdrawals);

  const activeListings = useUserListings(listings, user?.uid, "active");

  const selling: DisplayItem[] = activeListings.map((l) => ({
    id: l.id,
    image: l.images[0],
    title: `${l.brand} ${l.title}`.trim(),
    price: l.price,
    note: t("profile.noteLive"),
  }));

  const noteForSellerOrder = (o: Order) => {
    if (o.status === "completed") return t("profile.noteHandedOff");
    if (o.status === "cancelled") return t("profile.noteCancelled");
    return t("profile.noteAwaitingShipment");
  };

  // Sold listings are deleted from Firestore once paid, so this reads from
  // the order's own denormalized snapshot rather than the (now-gone) listing.
  const sold: DisplayItem[] = asSeller.map((o) => ({
    id: o.id,
    image: o.listing.image,
    title: `${o.listing.brand} ${o.listing.title}`.trim(),
    price: o.sellerEarned ?? o.listing.price,
    note: noteForSellerOrder(o),
  }));

  const buying: DisplayItem[] = asBuyer.map((o) => ({
    id: o.id,
    image: o.listing.image,
    title: `${o.listing.brand} ${o.listing.title}`.trim(),
    price: o.listing.price,
    note:
      o.status === "completed"
        ? t("profile.noteShipped", { tracking: o.trackingNumber || "" })
        : o.status === "cancelled"
        ? t("profile.noteCancelled")
        : t("profile.noteAwaitingShipment"),
  }));

  // The seller's "needs action" queue — orders they've been paid for but
  // haven't shipped yet. Ship package opens the tracking-submission screen;
  // Cancel is still available if they can't fulfill it.
  const pickup: DisplayItem[] = asSeller
    .filter((o) => o.status === "awaiting_shipment")
    .map((o) => {
      const overdue = o.shipByAt != null && Date.now() > o.shipByAt;
      return {
        id: o.id,
        image: o.listing.image,
        title: `${o.listing.brand} ${o.listing.title}`.trim(),
        price: o.sellerEarned ?? 0,
        note: overdue
          ? t("shipping.deadlinePassed")
          : o.shipByAt
          ? t("shipping.shipByLabel", { date: new Date(o.shipByAt).toLocaleDateString() })
          : t("profile.noteAwaitingShipment"),
        actionLabel: t("shipping.shipPackage"),
        onAction: () => setShippingOrderId(o.id),
        secondaryLabel: t("profile.cancel"),
        onSecondary: () => cancelOrder(o.id),
      };
    });

  const handoffsInvolved = [...asBuyer, ...asSeller];
  const successfulHandoffs = handoffsInvolved.filter((o) => o.status === "completed").length;
  const missedDropoffs = handoffsInvolved.filter((o) => o.status === "cancelled").length;

  const handleWithdraw = async () => {
    if (!user || balance.available === 0 || withdrawing) return;
    setWithdrawing(true);
    try {
      await requestWithdrawal(user.uid, balance.available);
      await refreshBalance();
    } finally {
      setWithdrawing(false);
    }
  };

  const { address } = useUserAddress(user?.uid);

  if (editAddress) {
    return <AddressSetup initialAddress={address} onSaved={() => setEditAddress(false)} onCancel={() => setEditAddress(false)} />;
  }

  if (shippingOrderId) {
    const shippingOrder = asSeller.find((o) => o.id === shippingOrderId);
    if (shippingOrder) {
      return <ShipPackageForm order={shippingOrder} onDone={() => setShippingOrderId(null)} t={t} />;
    }
  }

  const displayName = user?.displayName || user?.email?.split("@")[0] || "You";

  if (showReceipts) {
    const receipts = buying.filter((b) => b.note !== t("profile.noteCancelled"));
    return (
      <div style={{ paddingBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px 12px",
            borderBottom: `0.5px solid ${COLOR.line}`,
          }}
        >
          <button
            onClick={() => setShowReceipts(false)}
            aria-label={t("product.back")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
          >
            <ChevronLeft size={22} color={COLOR.ink} />
          </button>
          <span
            style={{
              fontFamily: SERIF,
              fontSize: 15,
              letterSpacing: "0.08em",
              fontWeight: 500,
              textTransform: "uppercase",
              color: COLOR.ink,
            }}
          >
            {t("profile.receipts")}
          </span>
          <span style={{ width: 22 }} />
        </div>

        {receipts.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <Receipt size={26} color={COLOR.inkSoft} strokeWidth={1.4} />
            <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: "12px 0 6px" }}>
              {t("profile.receiptsEmptyTitle")}
            </p>
            <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>{t("profile.receiptsEmptySubtitle")}</p>
          </div>
        ) : (
          <div style={{ padding: "8px 18px 0" }}>
            {receipts.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: `0.5px solid ${COLOR.lineSoft}`,
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 8, background: cssBackground(r.image), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink }}>{r.title}</div>
                  <div style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft }}>{r.note}</div>
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink }}>€{r.price}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: "22px 18px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: COLOR.oxbloodSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontSize: 17,
              fontWeight: 600,
              color: COLOR.oxblood,
              flexShrink: 0,
            }}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p style={{ fontFamily: SERIF, fontSize: 19, color: COLOR.ink, margin: 0 }}>{displayName}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>{t("profile.itemsSold", { count: asSeller.filter((o) => o.status === "completed").length })}</span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: COLOR.inkSoft }} />
              <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft }}>
                {t("profile.earned", { amount: balance.available + balance.pending })}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowReceipts(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: COLOR.lineSoft,
            border: "none",
            borderRadius: 16,
            padding: "7px 11px",
            fontFamily: SANS,
            fontSize: 11.5,
            fontWeight: 600,
            color: COLOR.ink,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Receipt size={13} /> {t("profile.receipts")}
        </button>
      </div>

      {/* Wallet */}
      <Section icon={<Wallet size={15} color={COLOR.ink} strokeWidth={1.6} />} title={t("profile.wallet")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 14px 0" }}>
          <span style={{ fontFamily: SANS, fontSize: 10, color: COLOR.inkSoft }}>
            {balanceLoading ? t("profile.balanceLoading") : null}
          </span>
          <button
            onClick={refreshBalance}
            disabled={balanceLoading}
            aria-label={t("profile.refreshBalance")}
            style={{ background: "none", border: "none", padding: 0, cursor: balanceLoading ? "default" : "pointer", marginLeft: "auto" }}
          >
            <RefreshCw size={13} color={COLOR.inkSoft} style={{ animation: balanceLoading ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
        <div style={{ display: "flex", padding: "6px 14px 8px", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: "0 0 4px" }}>{t("profile.availableBalance")}</p>
            <p style={{ fontFamily: SERIF, fontSize: 22, color: COLOR.ink, margin: 0 }}>€{balance.available.toFixed(2)}</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: "0 0 4px" }}>{t("profile.pendingBalance")}</p>
            <p style={{ fontFamily: SERIF, fontSize: 22, color: COLOR.inkSoft, margin: 0 }}>€{balance.pending.toFixed(2)}</p>
          </div>
        </div>
        <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, padding: "0 14px 10px", margin: 0 }}>
          {t("profile.pendingNote")}
        </p>
        <div style={{ padding: "6px 14px 14px" }}>
          <button
            onClick={handleWithdraw}
            disabled={balance.available === 0 || withdrawing}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: COLOR.ink,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px",
              fontFamily: SANS,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: balance.available === 0 || withdrawing ? "default" : "pointer",
              opacity: balance.available === 0 || withdrawing ? 0.5 : 1,
            }}
          >
            <ArrowDownToLine size={14} /> {withdrawing ? t("profile.requesting") : t("profile.withdraw", { amount: balance.available.toFixed(2) })}
          </button>
        </div>
        <Row
          label={t("profile.transactionHistory")}
          onClick={() => setShowTransactions((v) => !v)}
          showChevron={false}
          value={showTransactions ? t("profile.hide") : undefined}
        />
        {showTransactions && (
          <div style={{ padding: "0 14px 14px" }}>
            {transactions.length === 0 ? (
              <p style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, margin: "6px 0" }}>
                {t("profile.noTransactions")}
              </p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={13} color={COLOR.inkSoft} />
                    <div>
                      <div style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.ink }}>{tx.label}</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft }}>{timeAgo(tx.date, t)}</div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: tx.amount < 0 ? COLOR.inkSoft : "#2E6B4F",
                    }}
                  >
                    {tx.amount < 0 ? "-" : "+"}€{Math.abs(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Section>

      {/* Activity */}
      <Section icon={<PackageOpen size={15} color={COLOR.ink} strokeWidth={1.6} />} title={t("profile.yourActivity")} collapsible defaultOpen={false}>
        <ActivityRow
          label={t("profile.selling")}
          icon={<Tag size={15} color={COLOR.inkSoft} strokeWidth={1.6} />}
          items={selling}
          emptyLabel={t("profile.emptySelling")}
          expanded={expanded === "selling"}
          onToggle={() => toggle("selling")}
        />
        <ActivityRow
          label={t("profile.sold")}
          icon={<PackageCheck size={15} color={COLOR.inkSoft} strokeWidth={1.6} />}
          items={sold}
          emptyLabel={t("profile.emptySold")}
          expanded={expanded === "sold"}
          onToggle={() => toggle("sold")}
        />
        <ActivityRow
          label={t("profile.buying")}
          icon={<ShoppingBag size={15} color={COLOR.inkSoft} strokeWidth={1.6} />}
          items={buying}
          emptyLabel={t("profile.emptyBuying")}
          expanded={expanded === "buying"}
          onToggle={() => toggle("buying")}
        />
        <div style={{ borderBottom: "none" }}>
          <ActivityRow
            label={t("profile.pickup")}
            icon={<Truck size={15} color={COLOR.inkSoft} strokeWidth={1.6} />}
            items={pickup}
            emptyLabel={t("profile.emptyPickup")}
            expanded={expanded === "pickup"}
            onToggle={() => toggle("pickup")}
          />
        </div>
      </Section>

      {/* Trust */}
      <Section icon={<ShieldCheck size={15} color={COLOR.ink} strokeWidth={1.6} />} title={t("profile.trust")}>
        <div style={{ padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <CheckCircle2 size={15} color="#2E6B4F" />
            <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{t("profile.handoffs", { count: successfulHandoffs })}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={15} color="#2E6B4F" />
            <span style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{t("profile.missed", { count: missedDropoffs })}</span>
          </div>
        </div>
      </Section>

      {/* Area */}
      <Section icon={<MapPin size={15} color={COLOR.ink} strokeWidth={1.6} />} title={t("profile.yourArea")}>
        <div style={{ padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft }}>{t("profile.currentArea")}</span>
            <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: COLOR.ink }}>Stuttgart</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, marginBottom: 6 }}>
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft }}>{t("profile.searchRadius")}</span>
            <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: COLOR.ink }}>{radius} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={radius}
            onChange={(e) => changeRadius(Number(e.target.value))}
            style={{ width: "100%", accentColor: COLOR.ink }}
          />
        </div>
      </Section>

      {/* Settings */}
      <Section icon={<Bell size={15} color={COLOR.ink} strokeWidth={1.6} />} title={t("profile.settings")} collapsible defaultOpen={false}>
        <Row label={t("profile.notifications")} onClick={() => {}} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 14px",
            borderBottom: `0.5px solid ${COLOR.lineSoft}`,
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink }}>{t("profile.paymentMethod")}</div>
            {!paymentLoading && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 3,
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 600,
                  color: paymentStatus.chargesEnabled ? "#2E6B4F" : paymentStatus.connected ? "#B08A4E" : COLOR.inkSoft,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: paymentStatus.chargesEnabled ? "#2E6B4F" : paymentStatus.connected ? "#B08A4E" : COLOR.inkSoft,
                  }}
                />
                {paymentStatus.chargesEnabled
                  ? t("payment.active")
                  : paymentStatus.connected
                  ? t("payment.pending")
                  : t("payment.notSetUp")}
              </div>
            )}
            {paymentError && (
              <div style={{ fontFamily: SANS, fontSize: 10.5, color: "#B23A3A", marginTop: 3 }}>{t("payment.error")}</div>
            )}
          </div>
          <button
            onClick={handlePaymentSetup}
            disabled={paymentOpening}
            style={{
              flexShrink: 0,
              background: paymentStatus.chargesEnabled ? "none" : COLOR.ink,
              border: paymentStatus.chargesEnabled ? `0.5px solid ${COLOR.line}` : "none",
              color: paymentStatus.chargesEnabled ? COLOR.ink : "#fff",
              borderRadius: 16,
              padding: "7px 12px",
              fontFamily: SANS,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: paymentOpening ? "default" : "pointer",
              opacity: paymentOpening ? 0.7 : 1,
            }}
          >
            {paymentOpening
              ? t("payment.opening")
              : paymentStatus.chargesEnabled
              ? t("payment.manageCta")
              : paymentStatus.connected
              ? t("payment.pendingCta")
              : t("payment.setUpCta")}
          </button>
        </div>
        <Row
          label={t("profile.pickupPreferences")}
          value={address?.verified ? address.city : undefined}
          onClick={() => setEditAddress(true)}
        />
        <Row label={t("profile.privacy")} onClick={() => {}} />
        <Row label={t("profile.helpSupport")} onClick={() => {}} />
        <Row label={t("profile.terms")} onClick={() => {}} showChevron={false} />
      </Section>

      <Section icon={<Database size={15} color={COLOR.ink} strokeWidth={1.6} />} title={t("profile.yourData")} collapsible defaultOpen={false}>
        <div style={{ padding: "14px" }}>
          <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: "0 0 12px" }}>
            {t("profile.dataDescriptionFull")}
          </p>
          {deleteError && (
            <p style={{ fontFamily: SANS, fontSize: 11.5, color: "#B23A3A", margin: "0 0 10px" }}>
              {t("auth.errorGeneric")}
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleDownloadData}
              disabled={downloading || deletingAccount}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: "none",
                border: `0.5px solid ${COLOR.line}`,
                borderRadius: 10,
                padding: "10px",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                color: COLOR.ink,
                cursor: downloading || deletingAccount ? "default" : "pointer",
                opacity: downloading || deletingAccount ? 0.6 : 1,
              }}
            >
              <Download size={13} /> {downloading ? t("profile.preparingServer") : t("profile.downloadData")}
            </button>
            <button
              onClick={handleDeleteData}
              disabled={deletingAccount || deleted}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: deleteArmed ? COLOR.oxblood : "none",
                border: `0.5px solid ${deleteArmed ? COLOR.oxblood : COLOR.line}`,
                borderRadius: 10,
                padding: "10px",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                color: deleteArmed ? "#fff" : COLOR.oxblood,
                cursor: deletingAccount || deleted ? "default" : "pointer",
                opacity: deletingAccount ? 0.7 : 1,
              }}
            >
              {deleted ? (
                <>
                  <Check size={13} /> {t("profile.deleted")}
                </>
              ) : deletingAccount ? (
                t("profile.deletingAccount")
              ) : deleteArmed ? (
                t("profile.deleteAccountTapAgain")
              ) : (
                <>
                  <Trash2 size={13} /> {t("profile.deleteData")}
                </>
              )}
            </button>
          </div>
        </div>
      </Section>

      <div style={{ padding: "0 18px" }}>
        <button
          onClick={() => logout()}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "none",
            border: `0.5px solid ${COLOR.line}`,
            borderRadius: 12,
            padding: "12px",
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            color: COLOR.oxblood,
            cursor: "pointer",
          }}
        >
          <LogOut size={14} /> {t("profile.logOut")}
        </button>
      </div>
    </div>
  );
}
