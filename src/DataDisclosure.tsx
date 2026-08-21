import React from "react";
import { ChevronLeft, Camera, MapPin, Bell, Mic } from "lucide-react";
import { COLOR, SERIF, SANS } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";

interface DataDisclosureProps {
  onBack: () => void;
  onOpenPrivacyPolicy: () => void;
}

function Bullet({ text }: { text: string }) {
  return (
    <li style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink, lineHeight: 1.6, marginBottom: 8 }}>{text}</li>
  );
}

function PermissionRow({
  Icon,
  title,
  body,
  used,
}: {
  Icon: React.ElementType;
  title: string;
  body: string;
  used: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: `0.5px solid ${COLOR.lineSoft}` }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: used ? COLOR.oxbloodSoft : COLOR.lineSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={used ? COLOR.oxblood : COLOR.inkSoft} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLOR.ink, marginBottom: 3 }}>{title}</div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: COLOR.inkSoft, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );
}

export default function DataDisclosure({ onBack, onOpenPrivacyPolicy }: DataDisclosureProps) {
  const { t } = useLanguage();
  return (
    <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 65, display: "flex", flexDirection: "column" }}>
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
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 40px" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 22, color: COLOR.ink, margin: "0 0 20px" }}>{t("disclosure.title")}</h1>

        <h2 style={{ fontFamily: SERIF, fontSize: 15, color: COLOR.ink, margin: "0 0 10px" }}>{t("disclosure.collectTitle")}</h2>
        <ul style={{ margin: "0 0 26px", paddingLeft: 18 }}>
          <Bullet text={t("disclosure.collect1")} />
          <Bullet text={t("disclosure.collect2")} />
          <Bullet text={t("disclosure.collect3")} />
          <Bullet text={t("disclosure.collect4")} />
          <Bullet text={t("disclosure.collect5")} />
        </ul>

        <h2 style={{ fontFamily: SERIF, fontSize: 15, color: COLOR.ink, margin: "0 0 4px" }}>{t("disclosure.permissionsTitle")}</h2>
        <div>
          <PermissionRow Icon={Camera} title={t("disclosure.photosTitle")} body={t("disclosure.photosBody")} used />
          <PermissionRow Icon={MapPin} title={t("disclosure.locationTitle")} body={t("disclosure.locationBody")} used={false} />
          <PermissionRow Icon={Bell} title={t("disclosure.notificationsTitle")} body={t("disclosure.notificationsBody")} used={false} />
          <PermissionRow Icon={Mic} title={t("disclosure.microphoneTitle")} body={t("disclosure.microphoneBody")} used={false} />
        </div>

        <button
          onClick={onOpenPrivacyPolicy}
          style={{
            width: "100%",
            marginTop: 26,
            background: "none",
            border: `0.5px solid ${COLOR.line}`,
            borderRadius: 10,
            padding: "12px",
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 600,
            color: COLOR.ink,
            cursor: "pointer",
          }}
        >
          {t("disclosure.fullPolicyCta")}
        </button>
      </div>
    </div>
  );
}
