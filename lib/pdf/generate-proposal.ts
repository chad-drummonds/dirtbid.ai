// =============================================================================
// generate-proposal.ts — One-Click PDF Proposal Generator
// =============================================================================
// Compiles bid data from the orchestrator into a professional branded PDF
// using jspdf + jspdf-autotable. Designed for server-side use (Next.js API).
// Exports: generateBidPDF(bidData, companyInfo): Promise<Buffer>
// =============================================================================

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BidResponse, BidModuleType } from "../engine/orchestrator";

// ── Types ───────────────────────────────────────────────────────────────────

export interface CompanyInfo {
  name: string;
  tagline?: string;
  address?: string;
  cityStateZip?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoBase64?: string; // optional base64-encoded logo image
}

export interface BidProposalData {
  /** The full engine bid response */
  bid: BidResponse;
  /** Client-facing info */
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  /** Proposal validity (default 30 days) */
  validUntil?: string;
  /** Payment terms */
  paymentTerms?: string;
  /** Additional notes */
  notes?: string;
  /** Base64-encoded signature image (PNG) */
  signatureDataUrl?: string;
  /** Signer name */
  signerName?: string;
  /** Signer title */
  signerTitle?: string;
  /** Proposal number (auto-generated if omitted) */
  proposalNumber?: string;
}

// ── Color Palette ───────────────────────────────────────────────────────────

const C = {
  primary: [217, 119, 6] as [number, number, number],       // amber-600
  primaryDark: [180, 83, 9] as [number, number, number],    // amber-700
  primaryLight: [251, 237, 211] as [number, number, number],// amber-100
  text: [55, 65, 81] as [number, number, number],           // gray-700
  textLight: [107, 114, 128] as [number, number, number],   // gray-500
  textMuted: [156, 163, 175] as [number, number, number],   // gray-400
  border: [229, 231, 235] as [number, number, number],      // gray-200
  bgLight: [249, 250, 251] as [number, number, number],     // gray-50
  green: [22, 163, 74] as [number, number, number],         // green-600
  white: [255, 255, 255] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],           // red-600
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ── Main Generator ──────────────────────────────────────────────────────────

/**
 * Generate a professional branded PDF proposal.
 *
 * @param bidData - The full bid response from the engine + additional proposal info
 * @param companyInfo - Your company branding and contact details
 * @returns A Buffer containing the PDF file (ready to serve from an API endpoint)
 */
export async function generateBidPDF(
  bidData: BidProposalData,
  companyInfo: CompanyInfo,
): Promise<Buffer> {
  const doc = new jsPDF("p", "mm", "a4");
  const now = new Date();
  let y = MARGIN;

  // ── Page management ──

  function checkPage(needed: number) {
    if (y + needed > PAGE_HEIGHT - MARGIN - 15) {
      addFooter();
      doc.addPage();
      y = MARGIN;
      drawHeader();
    }
  }

  // ── Header (repeated on each page after first) ──

  let headerDrawn = false;
  function drawHeader() {
    if (headerDrawn) {
      // Small header on continuation pages
      doc.setFillColor(...C.primary);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 6, "F");
      doc.setTextColor(...C.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`${companyInfo.name} — Proposal`, MARGIN + 2, y + 4);
      doc.text(`Page ${doc.getNumberOfPages()}`, PAGE_WIDTH - MARGIN - 2, y + 4, { align: "right" });
      y += 10;
    }
    headerDrawn = true;
  }

  // ── Footer ──

  function addFooter() {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.textMuted);
      doc.text(
        `${companyInfo.name} • ${companyInfo.phone || ""} • ${companyInfo.email || ""}`,
        MARGIN,
        PAGE_HEIGHT - 8,
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        PAGE_WIDTH - MARGIN,
        PAGE_HEIGHT - 8,
        { align: "right" },
      );
    }
  }

  // ── Section Title ──

  function sectionTitle(title: string) {
    checkPage(14);
    doc.setFillColor(...C.primary);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 7, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, MARGIN + 3, y + 5);
    doc.setTextColor(...C.text);
    y += 11;
  }

  // ── Label:Value ──

  function kv(label: string, value: string, indent = 0) {
    checkPage(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.textLight);
    doc.text(label, MARGIN + indent, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(value, MARGIN + indent + (label.length > 16 ? 0 : 45), y);
    y += 5;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER / HEADER
  // ═════════════════════════════════════════════════════════════════════════

  // Top branding bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PAGE_WIDTH, 8, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${companyInfo.name}  |  ${companyInfo.tagline || "Professional Excavation Estimating"}`, MARGIN, 5.5);

  // Logo area
  y = 18;
  doc.setFillColor(...C.primaryDark);
  doc.rect(MARGIN, y, 14, 14, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DB", MARGIN + 3, y + 10);
  doc.setTextColor(...C.text);

  // Company name & contact
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(companyInfo.name, MARGIN + 20, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.textLight);
  let cx = MARGIN + 20;
  if (companyInfo.address) {
    doc.text(companyInfo.address, cx, y + 15);
  }
  if (companyInfo.cityStateZip) {
    doc.text(companyInfo.cityStateZip, cx, y + 19);
  }

  // Right side — proposal info
  const rightX = PAGE_WIDTH - MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.primaryDark);
  doc.text("PROPOSAL", rightX, y + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.textLight);
  const proposalNum =
    bidData.proposalNumber || `DB-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
  doc.text(`# ${proposalNum}`, rightX, y + 10, { align: "right" });
  doc.text(`Date: ${formatDate(now)}`, rightX, y + 14, { align: "right" });
  doc.text(
    `Valid Until: ${bidData.validUntil || formatDate(addDays(now, 30))}`,
    rightX,
    y + 18,
    { align: "right" },
  );

  y += 26;

  // Divider
  doc.setDrawColor(...C.border);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  // ═════════════════════════════════════════════════════════════════════════
  // CLIENT INFO & PROJECT INFO
  // ═════════════════════════════════════════════════════════════════════════

  sectionTitle("PROJECT INFORMATION");

  kv("Prepared For:", bidData.clientName);
  if (bidData.clientCompany) kv("Company:", bidData.clientCompany);
  if (bidData.clientAddress) kv("Address:", bidData.clientAddress);
  if (bidData.clientEmail) kv("Email:", bidData.clientEmail);
  if (bidData.clientPhone) kv("Phone:", bidData.clientPhone);
  y += 2;

  kv("Project:", bidData.bid.projectName);
  kv("Location:", bidData.bid.projectLocation);
  kv("Generated:", formatDate(new Date(bidData.bid.generatedAt)));

  y += 4;

  // ═════════════════════════════════════════════════════════════════════════
  // SOIL ANALYSIS SUMMARY
  // ═════════════════════════════════════════════════════════════════════════

  // Extract soil info from hauling module if available
  const haulingModule = bidData.bid.modules.find((m) => m.type === "hauling");
  const soilDetails = haulingModule?.details as
    | {
        soilType?: string;
        swellFactor?: number;
        compactionFactor?: number;
        truckloads?: number;
        totalBankCy?: number;
      }
    | undefined;

  if (soilDetails && soilDetails.soilType) {
    sectionTitle("SOIL ANALYSIS");

    kv("Soil Type:", soilDetails.soilType);
    if (soilDetails.swellFactor !== undefined) {
      kv("Swell Factor:", `${(soilDetails.swellFactor * 100).toFixed(0)}%`);
    }
    if (soilDetails.compactionFactor !== undefined) {
      kv("Compaction Factor:", `${(soilDetails.compactionFactor * 100).toFixed(0)}%`);
    }
    if (soilDetails.totalBankCy !== undefined) {
      kv("Bank Volume:", `${Math.round(soilDetails.totalBankCy)} cu yds`);
    }
    if (soilDetails.truckloads !== undefined) {
      kv("Estimated Truckloads:", `${Math.round(soilDetails.truckloads)} loads`);
    }

    y += 3;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MODULES SUMMARY
  // ═════════════════════════════════════════════════════════════════════════

  if (bidData.bid.modules.length > 0) {
    sectionTitle("SCOPE OF WORK");

    for (const mod of bidData.bid.modules) {
      checkPage(6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.primaryDark);
      doc.text(`• ${mod.label}`, MARGIN, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.textLight);
      doc.text(`Base Cost: ${fmt(mod.baseCost)}  |  Markup (${((mod.adjustedCost / mod.baseCost - 1) * 100).toFixed(0)}%): ${fmt(mod.markupAmount)}  |  Adjusted: ${fmt(mod.adjustedCost)}`, MARGIN + 4, y);
      y += 6;
    }

    y += 2;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // COST BREAKDOWN TABLE (using jspdf-autotable)
  // ═════════════════════════════════════════════════════════════════════════

  checkPage(20);
  sectionTitle("COST BREAKDOWN");

  const tableRows: string[][] = [];
  for (const item of bidData.bid.lineItems) {
    tableRows.push([
      item.description,
      String(item.quantity),
      item.unit,
      fmt(item.rate),
      fmt(item.amount),
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit", "Rate", "Amount"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: C.text,
    },
    columnStyles: {
      0: { cellWidth: 70, halign: "left" },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN },
    tableLineColor: C.border,
    tableLineWidth: 0.3,
    didParseCell: (data) => {
      // Highlight overhead/profit/bond rows
      const desc = String(data.cell.raw);
      if (
        desc.startsWith("Overhead") ||
        desc.startsWith("Profit") ||
        desc.startsWith("Sales") ||
        desc.startsWith("Bond")
      ) {
        data.cell.styles.fillColor = C.primaryLight;
      }
    },
  });

  // @ts-expect-error - autoTable appends to doc and sets lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  // ── Grand Total Box ──

  checkPage(14);

  // Subtotal
  doc.setDrawColor(...C.border);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.textLight);
  doc.text("Subtotal (before markup)", MARGIN, y);
  doc.text(fmt(bidData.bid.subtotalBeforeMarkup), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 5;

  doc.text("Module Markup", MARGIN, y);
  doc.text(fmt(bidData.bid.totalMarkup), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 5;

  doc.text("Subtotal (after markup)", MARGIN + 5, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.text);
  doc.text(fmt(bidData.bid.subtotalAfterMarkup), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.textLight);
  doc.text(`Regional Adjustment (${((bidData.bid.regionalAdjustment / (bidData.bid.subtotalAfterMarkup - bidData.bid.regionalAdjustment || 1)) * 100).toFixed(1)}%)`, MARGIN, y);
  doc.text(fmt(bidData.bid.regionalAdjustment), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 5;

  doc.text("Overhead", MARGIN, y);
  doc.text(fmt(bidData.bid.overheadAmount), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 5;

  doc.text("Profit Margin", MARGIN, y);
  doc.text(fmt(bidData.bid.profitAmount), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 5;

  doc.text("Sales Tax", MARGIN, y);
  doc.text(fmt(bidData.bid.salesTaxAmount), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 5;

  doc.text("Bond & Insurance", MARGIN, y);
  doc.text(fmt(bidData.bid.bondInsuranceAmount), PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 8;

  // Grand total highlighted
  doc.setFillColor(...C.primaryDark);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 9, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("GRAND TOTAL", MARGIN + 4, y + 6.5);
  doc.text(fmt(bidData.bid.grandTotal), PAGE_WIDTH - MARGIN - 4, y + 6.5, { align: "right" });
  y += 15;

  // ═════════════════════════════════════════════════════════════════════════
  // PAYMENT TERMS
  // ═════════════════════════════════════════════════════════════════════════

  checkPage(20);
  sectionTitle("PAYMENT TERMS");

  const terms = bidData.paymentTerms
    ? bidData.paymentTerms.split("\n")
    : [
        "50% deposit due upon acceptance of this proposal.",
        "25% due at 50% completion.",
        "25% due upon final completion and acceptance.",
        "All amounts in U.S. Dollars.",
      ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  for (const term of terms) {
    checkPage(5);
    doc.text(`• ${term}`, MARGIN + 2, y);
    y += 4.5;
  }

  y += 4;

  if (bidData.validUntil) {
    kv("Proposal Valid Until:", bidData.validUntil);
    y += 2;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // NOTES
  // ═════════════════════════════════════════════════════════════════════════

  if (bidData.notes) {
    checkPage(20);
    sectionTitle("NOTES");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(bidData.notes, CONTENT_WIDTH);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, MARGIN, y);
      y += 4;
    }
    y += 4;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SIGNATURE AREA
  // ═════════════════════════════════════════════════════════════════════════

  checkPage(35);
  sectionTitle("ACCEPTANCE & SIGNATURE");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  doc.text(
    "By signing below, you acknowledge and agree to the terms and pricing outlined in this proposal.",
    MARGIN,
    y,
  );
  y += 8;

  // Signature line
  if (bidData.signatureDataUrl) {
    const imgData = bidData.signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    doc.addImage(imgData, "PNG", MARGIN, y, 55, 18);
    y += 22;
  } else {
    doc.setDrawColor(...C.border);
    doc.line(MARGIN, y, MARGIN + 65, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text("Signature", MARGIN, y + 4);
    doc.line(MARGIN + 75, y, MARGIN + 130, y);
    doc.text("Date", MARGIN + 75, y + 4);
    y += 12;
  }

  if (bidData.signerName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(`Signed by: ${bidData.signerName}`, MARGIN, y);
    y += 5;
  }
  if (bidData.signerTitle) {
    doc.text(`Title: ${bidData.signerTitle}`, MARGIN, y);
    y += 5;
  }
  if (bidData.signatureDataUrl) {
    doc.text(`Date: ${formatDate(now)}`, MARGIN, y);
    y += 5;
  }

  y += 5;

  // Acceptance text
  doc.setDrawColor(...C.border);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text(
    "This proposal is a confidential document. Unauthorized distribution is prohibited.",
    MARGIN,
    y,
    { align: "left" },
  );

  // ── Finalize ──
  addFooter();

  return Buffer.from(doc.output("arraybuffer"));
}
