import React, { useEffect, useRef } from "react";
import { ChevronLeft, ShoppingBag, Tag, Sparkles, Bell } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";
import { useUserNotifications, markAllNotificationsRead, type AppNotification } from "./data/notifications";

function timeAgo(ms: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return t("common.today");
  if (days === 1) return t("common.yesterday");
  return t("common.daysAgo", { days });
}

const ICONS: Record<string, React.ElementType> = {
  purchase: ShoppingBag,
  sale: Tag,
  listing_created: Tag,
  welcome: Sparkles,
};

interface NotificationsProps {
  uid: string;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function Notifications({ uid, onBack, onNavigate }: NotificationsProps) {
  const { t } = useLanguage();
  const { notifications } = useUserNotifications(uid);

  const markedRef = useRef(false);

  useEffect(() => {
    if (markedRef.current) return;
    if (notifications.length === 0) return; // still waiting for the realtime listener's first snapshot
    markedRef.current = true;
    markAllNotificationsRead(notifications);
  }, [notifications]);

  return (
    <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 65, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 18px 12px",
          borderBottom: `0.5px solid ${COLOR.line}`,
          flexShrink: 0,
        }}
      >
        <button onClick={onBack} aria-label={t("product.back")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={22} color={COLOR.ink} />
        </button>
        <span style={{ fontFamily: SERIF, fontSize: 15, letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", color: COLOR.ink, marginLeft: 14 }}>
          {t("notif.title")}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "80px 24px", textAlign: "center" }}>
            <Bell size={28} color={COLOR.lineSoft} strokeWidth={1.4} style={{ marginBottom: 10 }} />
            <p style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: "0 0 6px" }}>{t("notif.emptyTitle")}</p>
            <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>{t("notif.emptySubtitle")}</p>
          </div>
        ) : (
          notifications.map((n: AppNotification) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => n.data?.screen && onNavigate(n.data.screen)}
                style={{
                  width: "100%",
                  display: "flex",
                  gap: 12,
                  padding: "14px 18px",
                  background: "none",
                  border: "none",
                  borderBottom: `0.5px solid ${COLOR.lineSoft}`,
                  cursor: n.data?.screen ? "pointer" : "default",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: COLOR.oxbloodSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={COLOR.oxblood} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: COLOR.ink, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, lineHeight: 1.5 }}>{n.body}</div>
                  <div style={{ fontFamily: SANS, fontSize: 10.5, color: COLOR.inkSoft, marginTop: 4 }}>{timeAgo(n.createdAt, t)}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
