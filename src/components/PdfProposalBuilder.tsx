import { useState, type FormEvent } from "react";
import SignaturePad from "./SignaturePad";
import { generateProposalPDF, type BidData } from "~/lib/pdfGenerator";

type ProjectType = "driveway" | "culvert" | "septic" | "basement" | "pond" | "mass-excavation";
type SoilType = "sand" | "loam" | "clay" | "rock" | "mixed";

const PROJECT_LABELS: Record<ProjectType, string> = {
  driveway: "Driveway Installation",
  culvert: "Culvert / Drainage",
  septic: "Septic System",
  basement: "Basement / Foundation",
  pond: "Pond / Retention Basin",
  "mass-excavation": "Mass Earthwork",
};

const SOIL_LABELS: Record<SoilType, string> = {
  sand: "Sand (Easy)",
  loam: "Loam (Moderate)",
  clay: "Clay (Hard)",
  rock: "Rock / Limestone (Very Hard)",
  mixed: "Mixed / Fill (Variable)",
};

const SOIL_FACTORS: Record<SoilType, number> = {
  sand: 1.0,
  loam: 1.15,
  clay: 1.35,
  rock: 1.8,
  mixed: 1.25,
};

const PROJECT_MODIFIERS: Record<ProjectType, number> = {
  driveway: 1.0,
  culvert: 1.2,
  septic: 1.4,
  basement: 1.3,
  pond: 0.85,
  "mass-excavation": 0.9,
};

const BASE_COST_PER_CY = 45;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PdfProposalBuilder() {
  const [step, setStep] = useState<"form" | "preview" | "generated">("form");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");

  const [form, setForm] = useState({
    // Contractor
    contractorName: "Your Company Name",
    contractorEmail: "you@example.com",
    contractorPhone: "(555) 123-4567",
    contractorAddress: "",

    // Client
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",

    // Project
    projectName: "",
    projectType: "driveway" as ProjectType,
    projectAddress: "",
    description: "",

    // Soil
    soilType: "loam" as SoilType,
    soilNotes: "",

    // Dimensions
    length: 50,
    width: 12,
    depth: 1,

    // Costs (auto-calculated but overridable)
    excavationRate: 45,
    laborRate: 65,
    equipmentRate: 85,
    disposalRate: 30,
    materialRate: 20,

    // Margin
    marginPercent: 20,

    // Schedule
    validUntilDays: 30,
    estimatedStartDays: 14,
    estimatedDurationDays: 5,

    // Signature
    signerName: "",
  });

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function calculateBid(): BidData {
    const cubicYards = (form.length * form.width * form.depth) / 27;
    const soilFactor = SOIL_FACTORS[form.soilType];
    const projectModifier = PROJECT_MODIFIERS[form.projectType];

    const basePerCy = form.excavationRate * soilFactor * projectModifier;
    const excavationCost = Math.round(cubicYards * basePerCy);
    const disposalCost = Math.round(cubicYards * form.disposalRate);
    const mobilizationCost = 500;
    const materialCost = Math.round(cubicYards * form.materialRate);
    const laborCost = Math.round((cubicYards / 10) * form.laborRate * 8); // ~8 hrs per 10cy
    const equipmentCost = Math.round((cubicYards / 10) * form.equipmentRate * 8);
    const soilAdjustment = Math.round(excavationCost * (soilFactor - 1));

    const subtotal =
      excavationCost +
      disposalCost +
      mobilizationCost +
      materialCost +
      laborCost +
      equipmentCost +
      soilAdjustment;

    const marginAmount = Math.round(subtotal * (form.marginPercent / 100));
    const total = subtotal + marginAmount;

    const today = new Date();
    const proposalDate = formatDate(today);

    return {
      contractorName: form.contractorName,
      contractorEmail: form.contractorEmail,
      contractorPhone: form.contractorPhone,
      contractorAddress: form.contractorAddress,

      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      clientAddress: form.clientAddress,

      projectName: form.projectName || `${PROJECT_LABELS[form.projectType]} Project`,
      projectType: PROJECT_LABELS[form.projectType],
      projectAddress: form.projectAddress,
      description:
        form.description ||
        `Excavation for ${PROJECT_LABELS[form.projectType].toLowerCase()} including site preparation, excavation, material handling, and site restoration.`,

      soilType: SOIL_LABELS[form.soilType],
      soilNotes: form.soilNotes,

      length: form.length,
      width: form.width,
      depth: form.depth,
      cubicYards,

      excavationCost,
      disposalCost,
      mobilizationCost,
      materialCost,
      laborCost,
      equipmentCost,
      soilAdjustment,

      subtotal,
      marginPercent: form.marginPercent,
      marginAmount,
      total,

      proposalDate,
      validUntil: formatDate(addDays(today, form.validUntilDays)),
      estimatedStart: formatDate(addDays(today, form.estimatedStartDays)),
      estimatedCompletion: formatDate(
        addDays(today, form.estimatedStartDays + form.estimatedDurationDays)
      ),

      signatureDataUrl: signatureDataUrl || undefined,
      signatureName: form.signerName || undefined,
      signatureDate: signatureDataUrl ? formatDate(new Date()) : undefined,
    };
  }

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const data = calculateBid();
      const doc = generateProposalPDF(data);
      const blob = doc.output("blob");
      setPdfBlob(blob);
      setStep("generated");
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please check your inputs.");
    }

    setGenerating(false);
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DirtBid_Proposal_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  };

  // Compute live estimate for preview
  const liveData = calculateBid();

  return (
    <div className="space-y-8">
      {/* ── FORM STEP ── */}
      {step === "form" && (
        <form onSubmit={handleGenerate} className="space-y-8">
          {/* Client Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Client Information</h2>
            <p className="mb-4 text-sm text-gray-500">Who are you bidding for?</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Client Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={form.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  className="input-field"
                  required
                  value={form.clientEmail}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  className="input-field"
                  required
                  value={form.clientPhone}
                  onChange={(e) => updateField("clientPhone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.clientAddress}
                  onChange={(e) => updateField("clientAddress", e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Project Details</h2>
            <p className="mb-4 text-sm text-gray-500">Describe the excavation project</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Project Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.projectName}
                  onChange={(e) => updateField("projectName", e.target.value)}
                  placeholder="Smith Driveway Installation"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Project Type
                </label>
                <select
                  className="select-field"
                  value={form.projectType}
                  onChange={(e) => updateField("projectType", e.target.value as ProjectType)}
                >
                  {Object.entries(PROJECT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Soil Type
                </label>
                <select
                  className="select-field"
                  value={form.soilType}
                  onChange={(e) => updateField("soilType", e.target.value as SoilType)}
                >
                  {Object.entries(SOIL_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Project Address
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={form.projectAddress}
                  onChange={(e) => updateField("projectAddress", e.target.value)}
                  placeholder="456 Job Site Rd"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Description / Scope of Work
                </label>
                <textarea
                  className="input-field min-h-[80px] resize-y"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe the work to be performed..."
                />
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Excavation Dimensions</h2>
            <p className="mb-4 text-sm text-gray-500">
              Enter the size of the area to be excavated
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Length (ft)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={form.length}
                  onChange={(e) => updateField("length", Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Width (ft)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={form.width}
                  onChange={(e) => updateField("width", Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Depth (ft)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={0.5}
                  step={0.5}
                  value={form.depth}
                  onChange={(e) => updateField("depth", Math.max(0.5, Number(e.target.value)))}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Volume: ~{Math.max(1, Math.round((form.length * form.width * form.depth) / 27))} cu yds
            </p>
          </div>

          {/* Cost Settings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Cost Settings</h2>
            <p className="mb-4 text-sm text-gray-500">
              Adjust rates to match your business
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Excavation $/cy
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={form.excavationRate}
                  onChange={(e) =>
                    updateField("excavationRate", Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Labor $/hr
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={form.laborRate}
                  onChange={(e) =>
                    updateField("laborRate", Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Equipment $/hr
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={form.equipmentRate}
                  onChange={(e) =>
                    updateField("equipmentRate", Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Disposal $/cy
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  value={form.disposalRate}
                  onChange={(e) =>
                    updateField("disposalRate", Math.max(0, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Materials $/cy
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  value={form.materialRate}
                  onChange={(e) =>
                    updateField("materialRate", Math.max(0, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Margin %
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  max={100}
                  value={form.marginPercent}
                  onChange={(e) =>
                    updateField("marginPercent", Math.max(0, Math.min(100, Number(e.target.value))))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Valid for (days)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={form.validUntilDays}
                  onChange={(e) =>
                    updateField("validUntilDays", Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Est. Duration (days)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={form.estimatedDurationDays}
                  onChange={(e) =>
                    updateField(
                      "estimatedDurationDays",
                      Math.max(1, Number(e.target.value))
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Live Estimate Preview */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-base font-bold text-amber-900">Estimate Preview</h3>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <span className="text-amber-700">Excavation:</span>
                <span className="ml-2 font-semibold text-amber-900">
                  {formatCurrency(liveData.excavationCost)}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Disposal:</span>
                <span className="ml-2 font-semibold text-amber-900">
                  {formatCurrency(liveData.disposalCost)}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Labor:</span>
                <span className="ml-2 font-semibold text-amber-900">
                  {formatCurrency(liveData.laborCost)}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Equipment:</span>
                <span className="ml-2 font-semibold text-amber-900">
                  {formatCurrency(liveData.equipmentCost)}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Materials:</span>
                <span className="ml-2 font-semibold text-amber-900">
                  {formatCurrency(liveData.materialCost)}
                </span>
              </div>
              <div>
                <span className="text-amber-700">Soil Adj:</span>
                <span className="ml-2 font-semibold text-amber-900">
                  {formatCurrency(liveData.soilAdjustment)}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-amber-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-800">
                  Subtotal: {formatCurrency(liveData.subtotal)}
                </span>
                <span className="text-lg font-bold text-amber-900">
                  Total: {formatCurrency(liveData.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Signature</h2>
            <p className="mb-4 text-sm text-gray-500">
              Sign to include on the proposal (optional)
            </p>
            <SignaturePad
              onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
              onClear={() => setSignatureDataUrl("")}
            />
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Signer's Name
              </label>
              <input
                type="text"
                className="input-field max-w-sm"
                value={form.signerName}
                onChange={(e) => updateField("signerName", e.target.value)}
                placeholder="Your name as it appears on the proposal"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              All fields marked with * are required
            </p>
            <button
              type="submit"
              disabled={generating || !form.clientName || !form.clientEmail || !form.clientPhone}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-lg disabled:opacity-50"
            >
              {generating ? (
                <>Generating...</>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Generate PDF Proposal
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── GENERATED STEP ── */}
      {step === "generated" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-900">Proposal Generated!</h2>
          <p className="mt-2 text-green-700">
            Your professional branded PDF proposal is ready.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleDownload}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-lg"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary inline-flex items-center gap-2 px-8 py-3 text-lg"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Preview / Print
            </button>
            <button
              onClick={() => setStep("form")}
              className="text-sm font-medium text-gray-600 underline hover:text-gray-900"
            >
              Create Another
            </button>
          </div>

          <div className="mx-auto mt-8 max-w-md rounded-lg border border-green-200 bg-white p-4 text-left text-sm text-gray-600">
            <p className="font-medium text-gray-900">📄 What's included in your proposal:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Professional branded header with DirtBid AI logo</li>
              <li>From / To sections with contact details</li>
              <li>Project overview with soil type analysis</li>
              <li>Excavation dimensions and volume calculations</li>
              <li>Detailed cost breakdown (6 line items + soil adjustment)</li>
              <li>Subtotal, margin, and total pricing</li>
              <li>Project schedule with dates</li>
              <li>Terms & conditions</li>
              <li>Digital signature capture</li>
              <li>Page numbers and footer</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
