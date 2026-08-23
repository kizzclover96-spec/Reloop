import React from "react";
import { ChevronLeft } from "lucide-react";
import { COLOR, SERIF, SANS } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";
import { TERMS_OF_SERVICE } from "./termsOfService";
import { PRIVACY_POLICY } from "./privacyPolicy";
import { DATA_PROCESSING_AGREEMENT } from "./dataProcessingAgreement";
import { REFUND_POLICY } from "./refundPolicy";

export type LegalDocKey = "terms" | "privacy" | "dpa" | "refund";

const DOCS: Record<LegalDocKey, string> = {
  terms: TERMS_OF_SERVICE,
  privacy: PRIVACY_POLICY,
  dpa: DATA_PROCESSING_AGREEMENT,
  refund: REFUND_POLICY,
};

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

/** Minimal markdown-lite renderer — just enough for these four documents: headings, bullets, simple tables, bold, paragraphs. */
function renderBody(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let tableBuffer: string[][] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} style={{ margin: "0 0 14px", paddingLeft: 20 }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink, lineHeight: 1.6, marginBottom: 4 }}>
            {inlineBold(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const [header, ...rows] = tableBuffer;
    out.push(
      <div key={`table-${out.length}`} style={{ overflowX: "auto", marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: 12 }}>
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th key={i} style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1.5px solid ${COLOR.ink}`, fontWeight: 700 }}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "6px 8px", borderBottom: `0.5px solid ${COLOR.lineSoft}`, color: COLOR.inkSoft, verticalAlign: "top" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (!cells.every((c) => /^-+$/.test(c))) tableBuffer.push(cells);
      continue;
    }
    flushTable();

    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
      continue;
    }
    flushList();

    if (!line) continue;

    if (line.startsWith("# ")) {
      out.push(
        <h1 key={out.length} style={{ fontFamily: SERIF, fontSize: 22, color: COLOR.ink, margin: "0 0 14px" }}>
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      out.push(
        <h2 key={out.length} style={{ fontFamily: SERIF, fontSize: 16, color: COLOR.ink, margin: "22px 0 8px" }}>
          {line.slice(3)}
        </h2>
      );
    } else {
      out.push(
        <p key={out.length} style={{ fontFamily: SANS, fontSize: 13, color: COLOR.ink, lineHeight: 1.65, margin: "0 0 12px" }}>
          {inlineBold(line)}
        </p>
      );
    }
  }
  flushList();
  flushTable();

  return out;
}

interface LegalViewerProps {
  docKey: LegalDocKey;
  onBack: () => void;
}

export default function LegalViewer({ docKey, onBack }: LegalViewerProps) {
  const { t } = useLanguage();
  return (
    <div style={{ position: "fixed", inset: 0, background: COLOR.bg, zIndex: 80, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
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
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 40px" }}>{renderBody(DOCS[docKey])}</div>
    </div>
  );
}
