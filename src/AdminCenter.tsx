import React, { useEffect, useState } from "react";
import { X, Search, Shield, AlertTriangle } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import {
  bootstrapRootAdmin,
  adminGetDashboardStats,
  adminSearchUsers,
  adminGetUserDetail,
  adminSuspendUser,
  adminBanUser,
  adminRestoreUser,
  adminDeleteUser,
  adminEditUser,
  adminSearchListings,
  adminRemoveListing,
  adminGetAuditLog,
  adminInviteAdmin,
} from "./data/admin";

interface AdminCenterProps {
  onClose: () => void;
}

const TABS = ["Dashboard", "Users", "Listings", "Audit Log"] as const;
type Tab = (typeof TABS)[number];

function fmtDate(ts: any): string {
  if (!ts) return "—";
  const ms = typeof ts === "number" ? ts : ts._seconds ? ts._seconds * 1000 : ts.seconds ? ts.seconds * 1000 : Date.parse(ts);
  if (!ms || Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleString();
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#fff", border: `0.5px solid ${COLOR.lineSoft}`, borderRadius: 12, padding: "16px 18px" }}>
      <p style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontFamily: SERIF, fontSize: 24, color: COLOR.ink, margin: 0 }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    active: { bg: "#ECFDF5", fg: "#0FA968" },
    suspended: { bg: "#FFFBEB", fg: "#D89416" },
    banned: { bg: "#FEF1EE", fg: "#F0653E" },
    deleted: { bg: "#F3F4F6", fg: "#6B7280" },
  };
  const c = colors[status] || colors.active;
  return (
    <span style={{ background: c.bg, color: c.fg, fontFamily: SANS, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10 }}>
      {status}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 22, width: "100%", maxWidth: 420, boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink, margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={18} color={COLOR.inkSoft} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  boxSizing: "border-box",
  border: `0.5px solid ${COLOR.line}`,
  borderRadius: 8,
  padding: "0 12px",
  fontFamily: SANS,
  fontSize: 13,
  marginBottom: 10,
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  background: COLOR.ink,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px",
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = { ...btnPrimary, background: "#B23A3A" };

export default function AdminCenter({ onClose }: AdminCenterProps) {
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionModal, setActionModal] = useState<null | "suspend" | "ban" | "delete" | "edit">(null);
  const [actionReason, setActionReason] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionDuration, setActionDuration] = useState("");
  const [editName, setEditName] = useState("");

  const [listingStatus, setListingStatus] = useState("active");
  const [listingQuery, setListingQuery] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [removeModal, setRemoveModal] = useState<any>(null);
  const [removeReason, setRemoveReason] = useState("");

  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      setStats(await adminGetDashboardStats());
    } catch (err: any) {
      if (err?.code === "functions/permission-denied") {
        setError("NOT_ADMIN");
      } else {
        setError(err?.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (tab === "Audit Log") {
      adminGetAuditLog(50).then(setAuditLog).catch(() => {});
    }
  }, [tab]);

  const runUserSearch = async () => {
    if (!userQuery.trim()) return;
    const results = await adminSearchUsers(userQuery.trim());
    setUserResults(results);
  };

  const openUser = async (uid: string) => {
    const detail = await adminGetUserDetail(uid);
    setSelectedUser(detail);
    setEditName(detail.displayName || "");
  };

  const runListingSearch = async () => {
    const results = await adminSearchListings(listingStatus, listingQuery.trim());
    setListings(results);
  };

  useEffect(() => {
    if (tab === "Listings") runListingSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, listingStatus]);

  const handleBootstrap = async () => {
    setLoading(true);
    try {
      await bootstrapRootAdmin();
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || "Bootstrap failed.");
      setLoading(false);
    }
  };

  const submitAction = async () => {
    if (!selectedUser) return;
    try {
      if (actionModal === "suspend") {
        await adminSuspendUser(selectedUser.uid, actionReason, actionNote, actionDuration ? Number(actionDuration) : undefined);
      } else if (actionModal === "ban") {
        await adminBanUser(selectedUser.uid, actionReason, actionNote);
      } else if (actionModal === "delete") {
        await adminDeleteUser(selectedUser.uid, actionReason);
      } else if (actionModal === "edit") {
        await adminEditUser(selectedUser.uid, { displayName: editName });
      }
      setActionModal(null);
      setActionReason("");
      setActionNote("");
      setActionDuration("");
      await openUser(selectedUser.uid);
    } catch (err: any) {
      alert(err?.message || "Action failed.");
    }
  };

  const submitRestore = async () => {
    if (!selectedUser) return;
    await adminRestoreUser(selectedUser.uid);
    await openUser(selectedUser.uid);
  };

  const submitRemoveListing = async () => {
    if (!removeModal) return;
    await adminRemoveListing(removeModal.id, removeReason);
    setRemoveModal(null);
    setRemoveReason("");
    await runListingSearch();
  };

  const submitInvite = async () => {
    try {
      await adminInviteAdmin(inviteEmail.trim(), { manageUsers: true, manageListings: true, viewFinancials: true });
      setInviteModal(false);
      setInviteEmail("");
      alert("Admin invited.");
    } catch (err: any) {
      alert(err?.message || "Invite failed.");
    }
  };

  if (error === "NOT_ADMIN") {
    return (
      <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <Shield size={28} color={COLOR.inkSoft} style={{ marginBottom: 14 }} />
          <p style={{ fontFamily: SERIF, fontSize: 18, color: COLOR.ink, margin: "0 0 8px" }}>Admin access required</p>
          <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft, margin: "0 0 20px" }}>
            This account doesn't have admin access. If this is the designated root admin account, you can bootstrap access once below.
          </p>
          <button onClick={handleBootstrap} style={btnPrimary}>
            Bootstrap admin access
          </button>
          <button onClick={onClose} style={{ ...btnPrimary, background: "none", color: COLOR.inkSoft, marginTop: 10 }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 200, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: SERIF, fontSize: 18, color: COLOR.ink }}>Reloop Admin</span>
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: tab === t ? COLOR.oxbloodSoft : "none",
                  color: tab === t ? COLOR.oxblood : COLOR.inkSoft,
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setInviteModal(true)} style={{ background: "none", border: `0.5px solid ${COLOR.line}`, borderRadius: 8, padding: "7px 14px", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            Invite admin
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={20} color={COLOR.inkSoft} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {loading && <p style={{ fontFamily: SANS, fontSize: 13, color: COLOR.inkSoft }}>Loading…</p>}

        {tab === "Dashboard" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              <StatCard label="Total users" value={stats.totalUsers} />
              <StatCard label="Active users" value={stats.activeUsers} />
              <StatCard label="Suspended" value={stats.suspendedUsers} />
              <StatCard label="Banned" value={stats.bannedUsers} />
              <StatCard label="Total listings" value={stats.totalListings} />
              <StatCard label="Active listings" value={stats.activeListings} />
              <StatCard label="Completed sales" value={stats.completedSales} />
              <StatCard label="Pending shipment" value={stats.pendingTransactions} />
              <StatCard label="Cancelled" value={stats.cancelledTransactions} />
              <StatCard label="Total volume" value={`€${stats.totalVolume.toFixed(2)}`} />
              <StatCard label="Platform fees" value={`€${stats.totalFees.toFixed(2)}`} />
              <StatCard label="Held in escrow" value={`€${stats.totalHeld.toFixed(2)}`} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLOR.ink, marginBottom: 8 }}>Recent registrations</p>
                {stats.recentUsers.map((u: any) => (
                  <div key={u.uid} style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, padding: "6px 0", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
                    {u.email}
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLOR.ink, marginBottom: 8 }}>Recent listings</p>
                {stats.recentListings.map((l: any) => (
                  <div key={l.id} style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, padding: "6px 0", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
                    {l.brand} {l.title} — €{l.price}
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLOR.ink, marginBottom: 8 }}>Recent sales</p>
                {stats.recentSales.map((s: any) => (
                  <div key={s.id} style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, padding: "6px 0", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
                    {s.item} — €{s.price}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Users" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedUser ? "1fr 1fr" : "1fr", gap: 24 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search by email, UID, or name" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && runUserSearch()} />
                <button onClick={runUserSearch} style={{ ...btnPrimary, width: 100 }}>
                  <Search size={13} style={{ verticalAlign: "middle" }} />
                </button>
              </div>
              {userResults.map((u) => (
                <div key={u.uid} onClick={() => openUser(u.uid)} style={{ padding: "12px 14px", border: `0.5px solid ${COLOR.lineSoft}`, borderRadius: 10, marginBottom: 8, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink }}>{u.email || u.displayName || u.uid}</span>
                    <StatusBadge status={u.accountStatus || "active"} />
                  </div>
                  <span style={{ fontFamily: SANS, fontSize: 11, color: COLOR.inkSoft }}>{u.uid}</span>
                </div>
              ))}
            </div>

            {selectedUser && (
              <div style={{ border: `0.5px solid ${COLOR.lineSoft}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <p style={{ fontFamily: SERIF, fontSize: 17, color: COLOR.ink, margin: "0 0 4px" }}>{selectedUser.displayName || selectedUser.email}</p>
                    <p style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, margin: 0 }}>{selectedUser.email} · {selectedUser.uid}</p>
                  </div>
                  <StatusBadge status={selectedUser.accountStatus} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16, fontFamily: SANS, fontSize: 12.5 }}>
                  <div>Joined: {fmtDate(selectedUser.createdAt)}</div>
                  <div>Payouts enabled: {selectedUser.payoutsEnabled ? "Yes" : "No"}</div>
                  <div>Active listings: {selectedUser.activeListingCount}</div>
                  <div>Total listings: {selectedUser.totalListingCount}</div>
                  <div>Completed sales: {selectedUser.completedSaleCount}</div>
                  <div>Purchases: {selectedUser.purchaseCount}</div>
                  <div>Total earned: €{selectedUser.totalEarned?.toFixed(2)}</div>
                  <div>Pending balance: €{selectedUser.pendingBalance?.toFixed(2)}</div>
                  <div>Total spent: €{selectedUser.totalSpent?.toFixed(2)}</div>
                  {selectedUser.pickupLocation && <div>Pickup: {selectedUser.pickupLocation.city}, {selectedUser.pickupLocation.country}</div>}
                </div>

                {selectedUser.accountStatus === "suspended" && (
                  <p style={{ fontFamily: SANS, fontSize: 12, color: "#D89416", marginBottom: 10 }}>
                    Suspended: {selectedUser.suspensionReason} {selectedUser.suspensionUntil ? `(until ${fmtDate(selectedUser.suspensionUntil)})` : "(indefinite)"}
                  </p>
                )}
                {selectedUser.accountStatus === "banned" && (
                  <p style={{ fontFamily: SANS, fontSize: 12, color: "#F0653E", marginBottom: 10 }}>Banned: {selectedUser.banReason}</p>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  <button onClick={() => setActionModal("edit")} style={{ ...btnPrimary, width: "auto", background: "none", color: COLOR.ink, border: `0.5px solid ${COLOR.line}` }}>Edit</button>
                  {selectedUser.accountStatus !== "suspended" && (
                    <button onClick={() => setActionModal("suspend")} style={{ ...btnPrimary, width: "auto", background: "#FFFBEB", color: "#D89416" }}>Suspend</button>
                  )}
                  {selectedUser.accountStatus !== "banned" && (
                    <button onClick={() => setActionModal("ban")} style={{ ...btnPrimary, width: "auto", background: "#FEF1EE", color: "#F0653E" }}>Ban</button>
                  )}
                  {(selectedUser.accountStatus === "suspended" || selectedUser.accountStatus === "banned") && (
                    <button onClick={submitRestore} style={{ ...btnPrimary, width: "auto", background: "#ECFDF5", color: "#0FA968" }}>Restore</button>
                  )}
                  <button onClick={() => setActionModal("delete")} style={{ ...btnDanger, width: "auto" }}>Delete</button>
                </div>

                <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLOR.ink, marginBottom: 8 }}>Recent sales</p>
                {selectedUser.salesHistory.map((s: any) => (
                  <div key={s.id} style={{ fontFamily: SANS, fontSize: 11.5, color: COLOR.inkSoft, padding: "5px 0", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
                    {s.item} — €{s.amount} · {s.status}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "Listings" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <select value={listingStatus} onChange={(e) => setListingStatus(e.target.value)} style={{ ...inputStyle, width: 160, marginBottom: 0 }}>
                <option value="active">Active</option>
                <option value="all">All</option>
                <option value="removed_by_admin">Removed</option>
              </select>
              <input value={listingQuery} onChange={(e) => setListingQuery(e.target.value)} placeholder="Search title, brand, or seller UID" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && runListingSearch()} />
              <button onClick={runListingSearch} style={{ ...btnPrimary, width: 100 }}>Search</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: `1px solid ${COLOR.line}` }}>
                  <th style={{ padding: 8 }}>Item</th>
                  <th style={{ padding: 8 }}>Seller</th>
                  <th style={{ padding: 8 }}>Price</th>
                  <th style={{ padding: 8 }}>Location</th>
                  <th style={{ padding: 8 }}>Created</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
                    <td style={{ padding: 8 }}>{l.brand} {l.title}</td>
                    <td style={{ padding: 8 }}>{l.sellerId}</td>
                    <td style={{ padding: 8 }}>€{l.price}</td>
                    <td style={{ padding: 8 }}>{l.location}</td>
                    <td style={{ padding: 8 }}>{fmtDate(l.createdAt)}</td>
                    <td style={{ padding: 8 }}><StatusBadge status={l.status} /></td>
                    <td style={{ padding: 8 }}>
                      {l.status === "active" && (
                        <button onClick={() => setRemoveModal(l)} style={{ background: "none", border: "none", color: "#B23A3A", cursor: "pointer", fontFamily: SANS, fontSize: 12, fontWeight: 600 }}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Audit Log" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${COLOR.line}` }}>
                <th style={{ padding: 8 }}>Action</th>
                <th style={{ padding: 8 }}>Target</th>
                <th style={{ padding: 8 }}>Admin</th>
                <th style={{ padding: 8 }}>Reason</th>
                <th style={{ padding: 8 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((e) => (
                <tr key={e.id} style={{ borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{e.action}</td>
                  <td style={{ padding: 8 }}>{e.targetType}: {e.targetId}</td>
                  <td style={{ padding: 8 }}>{e.adminEmail}</td>
                  <td style={{ padding: 8 }}>{e.reason || "—"}</td>
                  <td style={{ padding: 8 }}>{fmtDate(e.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {actionModal && selectedUser && (
        <Modal title={actionModal === "edit" ? "Edit user" : actionModal === "delete" ? "Delete account" : `${actionModal === "suspend" ? "Suspend" : "Ban"} user`} onClose={() => setActionModal(null)}>
          {actionModal === "edit" ? (
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display name" style={inputStyle} />
          ) : (
            <>
              {actionModal === "delete" && (
                <p style={{ fontFamily: SANS, fontSize: 12, color: "#B23A3A", marginBottom: 10, display: "flex", gap: 6 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} /> This disables login and scrubs the profile. Order/transaction history is kept for accounting and legal reasons.
                </p>
              )}
              <input value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Reason (shown in audit log)" style={inputStyle} />
              {actionModal !== "delete" && (
                <textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="Internal admin note" style={{ ...inputStyle, height: 70, resize: "vertical", paddingTop: 8 }} />
              )}
              {actionModal === "suspend" && (
                <input value={actionDuration} onChange={(e) => setActionDuration(e.target.value)} placeholder="Duration in days (leave blank for indefinite)" style={inputStyle} type="number" />
              )}
            </>
          )}
          <button onClick={submitAction} style={actionModal === "ban" || actionModal === "delete" ? btnDanger : btnPrimary}>
            Confirm
          </button>
        </Modal>
      )}

      {removeModal && (
        <Modal title="Remove listing" onClose={() => setRemoveModal(null)}>
          <p style={{ fontFamily: SANS, fontSize: 12.5, color: COLOR.inkSoft, marginBottom: 10 }}>{removeModal.brand} {removeModal.title}</p>
          <input value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="Reason (shown in audit log)" style={inputStyle} />
          <button onClick={submitRemoveListing} style={btnDanger}>Remove listing</button>
        </Modal>
      )}

      {inviteModal && (
        <Modal title="Invite admin" onClose={() => setInviteModal(false)}>
          <p style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, marginBottom: 10 }}>
            The account must already have a Reloop account. Granted permissions: manage users, manage listings, view financials.
          </p>
          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address" style={inputStyle} />
          <button onClick={submitInvite} style={btnPrimary}>Send invite</button>
        </Modal>
      )}
    </div>
  );
}
