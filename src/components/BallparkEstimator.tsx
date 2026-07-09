import { useState, type FormEvent } from "react";

export type ProjectType = "driveway" | "culvert" | "septic" | "basement" | "pond";
export type SoilType = "sand" | "loam" | "clay" | "rock" | "mixed";

interface EstimateInputs {
  projectType: ProjectType;
  length: number;
  width: number;
  depth: number;
  soilType: SoilType;
}

interface EstimateResult {
  low: number;
  high: number;
  volumeCY: number;
  breakdown: string[];
}

interface LeadInfo {
  name: string;
  email: string;
  phone: string;
}

interface Props {
  submitLead: (data: Record<string, unknown>) => Promise<{ error?: string; success?: boolean }>;
  calculateEstimate: (inputs: EstimateInputs) => Promise<EstimateResult>;
}

const PROJECT_LABELS: Record<ProjectType, string> = {
  driveway: "Driveway Installation",
  culvert: "Culvert / Drainage",
  septic: "Septic System",
  basement: "Basement / Foundation",
  pond: "Pond / Retention Basin",
};

const SOIL_LABELS: Record<SoilType, string> = {
  sand: "Sand (Easy)",
  loam: "Loam (Moderate)",
  clay: "Clay (Hard)",
  rock: "Rock / Limestone (Very Hard)",
  mixed: "Mixed / Fill (Variable)",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BallparkEstimator({ submitLead, calculateEstimate }: Props) {
  const [step, setStep] = useState<"input" | "lead" | "result">("input");
  const [inputs, setInputs] = useState<EstimateInputs>({
    projectType: "driveway",
    length: 50,
    width: 12,
    depth: 1,
    soilType: "loam",
  });
  const [lead, setLead] = useState<LeadInfo>({ name: "", email: "", phone: "" });
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleViewEstimate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await calculateEstimate(inputs);
      setEstimate(result);
      setStep("lead");
    } catch {
      setError("Failed to calculate estimate. Please try again.");
    }
  };

  const handleSubmitLead = async (e: FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.email || !lead.phone) {
      setError("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      await submitLead({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        project_type: PROJECT_LABELS[inputs.projectType],
        soil_type: SOIL_LABELS[inputs.soilType],
        dimensions: `${inputs.length}' x ${inputs.width}' x ${inputs.depth}'`,
        estimated_range: `${formatCurrency(estimate!.low)} – ${formatCurrency(estimate!.high)}`,
      });
    } catch (err) {
      console.warn("Lead submission had an issue, but showing results anyway:", err);
    }

    setSubmitting(false);
    setStep("result");
  };

  return (
    <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
      {/* Header */}
      <div className="rounded-t-2xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-5 sm:px-8">
        <h3 className="text-xl font-bold text-white">Instant Ballpark Estimator</h3>
        <p className="mt-1 text-sm text-amber-100">
          Get a rough cost range for your excavation project — free, no account needed.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {/* Step 1: Input */}
        {step === "input" && (
          <form onSubmit={handleViewEstimate} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Project Type
              </label>
              <select
                className="select-field"
                value={inputs.projectType}
                onChange={(e) =>
                  setInputs({ ...inputs, projectType: e.target.value as ProjectType })
                }
              >
                {Object.entries(PROJECT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Length (ft)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  value={inputs.length}
                  onChange={(e) =>
                    setInputs({ ...inputs, length: Math.max(1, Number(e.target.value)) })
                  }
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
                  value={inputs.width}
                  onChange={(e) =>
                    setInputs({ ...inputs, width: Math.max(1, Number(e.target.value)) })
                  }
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
                  value={inputs.depth}
                  onChange={(e) =>
                    setInputs({ ...inputs, depth: Math.max(0.5, Number(e.target.value)) })
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Soil Type
              </label>
              <select
                className="select-field"
                value={inputs.soilType}
                onChange={(e) =>
                  setInputs({ ...inputs, soilType: e.target.value as SoilType })
                }
              >
                {Object.entries(SOIL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-gray-500">
              This is a rough estimate based on industry averages. Actual costs vary by
              region, access, and site conditions.
            </p>

            <button type="submit" className="btn-primary w-full text-lg">
              Get My Estimate
            </button>
          </form>
        )}

        {/* Step 2: Lead Capture */}
        {step === "lead" && estimate && (
          <form onSubmit={handleSubmitLead} className="space-y-5">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-800">
                Your estimated range:{" "}
                <span className="text-lg font-bold text-amber-900">
                  {formatCurrency(estimate.low)} – {formatCurrency(estimate.high)}
                </span>
              </p>
            </div>

            <p className="text-sm text-gray-600">
              Enter your details below to see the full breakdown and get a detailed quote
              from a local contractor.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Your Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={lead.name}
                onChange={(e) => setLead({ ...lead, name: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="john@example.com"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="(555) 123-4567"
                value={lead.phone}
                onChange={(e) => setLead({ ...lead, phone: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full text-lg disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Show My Full Estimate"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              We'll never share your info. This helps connect you with local pros.
            </p>
          </form>
        )}

        {/* Step 3: Results */}
        {step === "result" && estimate && (
          <div className="space-y-5">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="font-semibold text-green-800">Estimate Ready</p>
              </div>
              <p className="text-sm text-green-700">
                Project: <strong>{PROJECT_LABELS[inputs.projectType]}</strong>
              </p>
              <p className="text-sm text-green-700">
                Soil: <strong>{SOIL_LABELS[inputs.soilType]}</strong>
              </p>
              <p className="text-sm text-green-700">
                Volume:{" "}
                <strong>
                  ~{estimate.volumeCY} cu yds
                </strong>
              </p>
              <div className="mt-3 border-t border-green-200 pt-3">
                <p className="text-sm text-green-700">Estimated Cost Range:</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(estimate.low)} – {formatCurrency(estimate.high)}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">Cost Breakdown:</p>
              <ul className="list-disc list-inside space-y-1">
                {estimate.breakdown.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-400">
                *Does not include permits, engineering fees, or utility relocation. For a
                binding quote from a licensed contractor, claim your detailed bid below.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a href="#cta" className="btn-primary w-full text-center">
                Get Your Professional Bid
              </a>
              <button
                onClick={() => {
                  setStep("input");
                  setEstimate(null);
                }}
                className="btn-secondary w-full text-sm"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
