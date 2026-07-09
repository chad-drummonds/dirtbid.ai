import { jsPDF } from "jspdf";

export interface BidData {
  // Contractor info
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  contractorAddress: string;

  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;

  // Project info
  projectName: string;
  projectType: string;
  projectAddress: string;
  description: string;

  // Soil & site
  soilType: string;
  soilNotes: string;

  // Dimensions
  length: number;
  width: number;
  depth: number;
  cubicYards: number;

  // Cost breakdown
  excavationCost: number;
  disposalCost: number;
  mobilizationCost: number;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  soilAdjustment: number;

  // Totals
  subtotal: number;
  marginPercent: number;
  marginAmount: number;
  total: number;

  // Dates
  proposalDate: string;
  validUntil: string;
  estimatedStart: string;
  estimatedCompletion: string;

  // Signature
  signatureDataUrl?: string;
  signatureName?: string;
  signatureDate?: string;
}

const COLORS = {
  primary: [217, 119, 6] as [number, number, number], // amber-600
  primaryDark: [180, 83, 9] as [number, number, number], // amber-700
  text: [55, 65, 81] as [number, number, number], // gray-700
  textLight: [107, 114, 128] as [number, number, number], // gray-500
  border: [229, 231, 235] as [number, number, number], // gray-200
  bgLight: [249, 250, 251] as [number, number, number], // gray-50
  green: [22, 163, 74] as [number, number, number], // green-600
  white: [255, 255, 255] as [number, number, number],
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateProposalPDF(data: BidData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Helper Functions ──

  function addSectionTitle(title: string) {
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin + 3, y + 5.5);
    doc.setTextColor(...COLORS.text);
    y += 12;
  }

  function addLabelValue(label: string, value: string, indent = 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textLight);
    doc.text(label, margin + indent, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.text(value, margin + indent + (label.length > 15 ? 0 : 50), y);
    y += 5.5;
  }

  function addLineItem(label: string, amount: number, indent = 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(label, margin + indent, y);
    doc.text(formatCurrency(amount), pageWidth - margin - 30, y, { align: "right" });
    y += 5.5;
  }

  function checkPageBreak(needed: number) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // ── HEADER ──
  checkPageBreak(40);

  // Logo/Name area
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, 12, 12, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DB", margin + 2.5, y + 8.5);
  doc.setTextColor(...COLORS.text);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("DirtBid AI", margin + 18, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);
  doc.text("Professional Excavation Proposal", margin + 18, y + 15);

  // Proposal number & date on right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text("PROPOSAL", pageWidth - margin, y + 7, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);
  const proposalNum = `#DB-${Date.now().toString(36).toUpperCase()}`;
  doc.text(proposalNum, pageWidth - margin, y + 12, { align: "right" });
  doc.text(`Date: ${data.proposalDate}`, pageWidth - margin, y + 16, { align: "right" });

  y += 22;

  // Divider
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── FROM / TO ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text("FROM", margin, y);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 5;
  doc.text(data.contractorName, margin, y); y += 4;
  doc.text(data.contractorEmail, margin, y); y += 4;
  doc.text(data.contractorPhone, margin, y); y += 4;
  if (data.contractorAddress) {
    doc.text(data.contractorAddress, margin, y); y += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text("TO", pageWidth / 2, y - 17);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.clientName, pageWidth / 2, y - 12);
  doc.text(data.clientEmail, pageWidth / 2, y - 8);
  doc.text(data.clientPhone, pageWidth / 2, y - 4);
  if (data.clientAddress) {
    doc.text(data.clientAddress, pageWidth / 2, y);
  }
  y += 8;

  // Divider
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── PROJECT OVERVIEW ──
  checkPageBreak(40);
  addSectionTitle("PROJECT OVERVIEW");

  addLabelValue("Project:", data.projectName);
  addLabelValue("Type:", data.projectType);
  addLabelValue("Address:", data.projectAddress || "As discussed");
  addLabelValue("Soil Type:", data.soilType);
  if (data.soilNotes) {
    addLabelValue("Soil Notes:", data.soilNotes);
  }

  y += 3;

  // ── SCOPE OF WORK ──
  checkPageBreak(40);
  addSectionTitle("SCOPE OF WORK");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);

  const scopeLines = doc.splitTextToSize(
    data.description || "Excavation services as specified in the project details above.",
    contentWidth
  );
  for (const line of scopeLines) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 3;

  // ── DIMENSIONS ──
  checkPageBreak(30);
  addSectionTitle("EXCAVATION DIMENSIONS");

  addLabelValue("Length:", `${data.length} ft`);
  addLabelValue("Width:", `${data.width} ft`);
  addLabelValue("Depth:", `${data.depth} ft`);
  addLabelValue("Volume:", `~${Math.round(data.cubicYards)} cubic yards`);

  y += 3;

  // ── COST BREAKDOWN ──
  checkPageBreak(80);
  addSectionTitle("COST BREAKDOWN");

  // Draw table header
  doc.setFillColor(...COLORS.bgLight);
  doc.rect(margin, y, contentWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text("Item", margin + 3, y + 4);
  doc.text("Amount", pageWidth - margin - 3, y + 4, { align: "right" });
  y += 8;

  // Line items
  addLineItem("Excavation (base)", data.excavationCost);
  addLineItem("Material handling & disposal", data.disposalCost);
  addLineItem("Mobilization & site prep", data.mobilizationCost);
  addLineItem("Materials", data.materialCost);
  addLineItem("Labor", data.laborCost);
  addLineItem("Equipment", data.equipmentCost);

  doc.setDrawColor(...COLORS.border);
  doc.line(margin + 3, y, pageWidth - margin - 3, y);
  y += 3;

  addLineItem("Soil adjustment factor", data.soilAdjustment);

  // Subtotal
  doc.setDrawColor(...COLORS.border);
  doc.line(margin + 3, y, pageWidth - margin - 3, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Subtotal", margin, y);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, y, { align: "right" });
  y += 6;

  // Margin
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textLight);
  doc.text(`Margin (${data.marginPercent}%)`, margin, y);
  doc.text(formatCurrency(data.marginAmount), pageWidth - margin, y, { align: "right" });
  y += 6;

  // TOTAL
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.white);
  doc.text("TOTAL", margin + 3, y + 5.5);
  doc.text(formatCurrency(data.total), pageWidth - margin - 3, y + 5.5, { align: "right" });
  y += 14;

  // ── SCHEDULE ──
  checkPageBreak(30);
  addSectionTitle("SCHEDULE");

  addLabelValue("Proposal Date:", data.proposalDate);
  addLabelValue("Valid Until:", data.validUntil);
  addLabelValue("Estimated Start:", data.estimatedStart);
  addLabelValue("Estimated Completion:", data.estimatedCompletion);

  y += 3;

  // ── TERMS ──
  checkPageBreak(30);
  addSectionTitle("TERMS & CONDITIONS");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);

  const terms = [
    "This proposal is valid for 30 days from the date above.",
    "Payment terms: 50% deposit due upon acceptance, 50% upon completion.",
    "Any additional work outside the scope will be billed separately.",
    "Site access and utility locations are the responsibility of the client.",
    "Weather and site conditions may affect the schedule.",
  ];

  for (const term of terms) {
    doc.text(`• ${term}`, margin + 2, y);
    y += 4;
  }

  y += 4;

  // ── SIGNATURE SECTION ──
  checkPageBreak(50);
  addSectionTitle("ACCEPTANCE & SIGNATURE");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text(
    "By signing below, you accept the terms and pricing outlined in this proposal.",
    margin,
    y
  );
  y += 8;

  // Signature line
  if (data.signatureDataUrl) {
    // Add signature image
    const imgData = data.signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    doc.addImage(imgData, "PNG", margin, y, 60, 20);
    y += 22;
  } else {
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, y, margin + 70, y);
    y += 4;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.text("Signature", margin, y);
    y += 8;
  }

  doc.line(margin + 80, y - 22, margin + 150, y - 22);
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);
  doc.text("Date", margin + 80, y - 18);

  if (data.signatureName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(`Signed by: ${data.signatureName}`, margin, y);
    y += 5;
  }
  if (data.signatureDate) {
    doc.text(`Date: ${data.signatureDate}`, margin, y);
    y += 5;
  }

  // ── FOOTER ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text(
      `DirtBid AI • Page ${i} of ${pageCount} • Generated ${data.proposalDate}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  return doc;
}
