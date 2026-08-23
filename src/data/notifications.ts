import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface AppNotification {
  id: string;
  userId: string;
  type: "purchase" | "sale" | "listing_created" | "welcome" | string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: number;
}

const NOTIFICATIONS_LIMIT = 50;

/** Realtime feed of a user's notifications, newest first. */
export function useUserNotifications(uid: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(NOTIFICATIONS_LIMIT)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnreadReceipt = notifications.some((n) => !n.read && n.data?.screen === "receipts");

  return { notifications, loading, unreadCount, hasUnreadReceipt };
}

/** Marks a single notification read — the only field a client is allowed to change (firestore.rules enforces this too). */
export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

/** Marks every currently-unread notification read at once (e.g. opening the notification feed). */
export async function markAllNotificationsRead(notifications: AppNotification[]) {
  const unread = notifications.filter((n) => !n.read);
  await Promise.all(unread.map((n) => markNotificationRead(n.id)));
}
