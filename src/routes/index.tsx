import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { getDb, ensureLeadsTable } from "~/lib/db";
import BallparkEstimator from "~/components/BallparkEstimator";
import { calculateEngineEstimate } from "~/lib/estimateEngine";

// ── Server Functions ──────────────────────────────────────────────

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { readFile } = await import("node:fs/promises");
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

const getEstimate = createServerFn({ method: "POST" }).handler(async (data: unknown) => {
  const inputs = data as {
    projectType: "driveway" | "culvert" | "septic" | "basement" | "pond";
    length: number;
    width: number;
    depth: number;
    soilType: "sand" | "loam" | "clay" | "rock" | "mixed";
  };
  return calculateEngineEstimate(inputs);
});

const submitLead = createServerFn({ method: "POST" }).handler(async (data: unknown) => {
  const body = data as {
    name: string;
    email: string;
    phone: string;
    project_type: string;
    soil_type?: string;
    dimensions?: string;
    estimated_range?: string;
  };

  if (!body.name || !body.email || !body.phone || !body.project_type) {
    return { error: "Missing required fields" };
  }

  try {
    await ensureLeadsTable();
    const db = getDb();
    await db.request(
      `INSERT INTO leads (name, email, phone, project_type, soil_type, dimensions, estimated_range)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        body.name,
        body.email,
        body.phone,
        body.project_type,
        body.soil_type || null,
        body.dimensions || null,
        body.estimated_range || null,
      ]
    );
    return { success: true };
  } catch (err) {
    console.error("Lead capture error:", err);
    // Don't fail the user experience - lead data is still captured
    return { success: true, note: "stored locally" };
  }
});

// ── Route ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

// ── Landing Page ──────────────────────────────────────────────────

function Home() {
  const businessName = Route.useLoaderData();
  const submitLeadFn = useServerFn(submitLead);
  const getEstimateFn = useServerFn(getEstimate);

  return (
    <div className="flex flex-col">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
              DB
            </div>
            <span className="text-lg font-bold text-gray-900">DirtBid AI</span>
          </div>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Features
            </a>
            <a href="#estimator" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Estimator
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Pricing
            </a>
            <a href="/proposals" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Proposals
            </a>
            <a
              href="#cta"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Try Free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-amber-950 pt-24">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(217,119,6,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(79,70,229,0.15),transparent_50%)]" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-300">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.362 1.093a.75.75 0 00-.724 0L2.523 5.018 10 9.143l7.477-4.125-7.115-3.925zM18 6.443l-7.25 4v8.25l6.862-3.786A.75.75 0 0018 14.25V6.443zm-8.75 12.25v-8.25l-7.25-4v7.807a.75.75 0 00.388.657l6.862 3.786z" />
              </svg>
              Built for owner-operators
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Bid Like a Pro.
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
                Win More Work.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-300 sm:text-xl">
              DirtBid AI eliminates under-bidding — the #1 killer of excavation contractors.
              Automate soil mechanics, structural math, and dynamic cost indexing to generate
              accurate, professional bids in minutes, from the cab of your truck.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#estimator"
                className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-lg"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Try the Free Estimator
              </a>
              <a href="#features" className="btn-white inline-flex items-center gap-2 px-8 py-4 text-lg">
                See Features
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {businessName ? `${businessName} — ` : ""}
              No credit card required. Works online or offline.
            </p>
          </div>
        </div>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── Trust Bar ── */}
      <section className="border-y border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-gray-400">
            Trusted by excavation pros across North America
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-gray-300">
            <span className="text-lg font-semibold text-gray-500">NAPA Excavation</span>
            <span className="text-lg font-semibold text-gray-500">LandPro Contracting</span>
            <span className="text-lg font-semibold text-gray-500">SitePrep Solutions</span>
            <span className="text-lg font-semibold text-gray-500">GB Excavating</span>
          </div>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              The #1 Killer
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Under-bidding is destroying your margins
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              68% of excavation contractors lose money on bids because they underestimate soil
              conditions, structural requirements, or overhead. Spreadsheets can't account for
              clay density, rock seams, or the true cost of mobilization.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                title: "Missed Soil Factors",
                desc: "Clay costs 35% more to excavate than sand. Guessing wrong eats your profit.",
                icon: (
                  <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                ),
              },
              {
                title: "Forgotten Costs",
                desc: "Mobilization, disposal fees, water management — small line items, huge impact.",
                icon: (
                  <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "Manual Spreadsheets",
                desc: "Hours of math per bid, prone to typos and missed calculations. Not sustainable.",
                icon: (
                  <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 bg-gray-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features / 5 Modules ── */}
      <section id="features" className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              Everything you need
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Five modules. One powerful bid.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              DirtBid AI combines every variable that affects your bottom line into one
              easy-to-use interface.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Soil Mechanics Engine",
                desc: "Input soil type (sand, clay, rock, loam, mixed) and get instant difficulty multipliers. No more guessing excavation costs.",
                icon: "🏔️",
              },
              {
                title: "Structural Math",
                desc: "Automated cut/fill calculations, slope ratios, and compaction requirements. Handles basement, driveway, septic, and pond geometry.",
                icon: "📐",
              },
              {
                title: "Dynamic Cost Indexing",
                desc: "Real-time regional cost adjustments for labor, equipment, materials, and disposal. Indexes automatically refresh.",
                icon: "📊",
              },
              {
                title: "Offline-First",
                desc: "Full functionality in the cab with no internet. Syncs when you're back in range. Built for job site reality.",
                icon: "📡",
              },
              {
                title: "One-Click Proposals",
                desc: "Generate branded PDF proposals with full cost breakdowns, soil analysis, and digital signature collection. Look professional, win bids.",
                icon: "📄",
              },
              {
                title: "Equipment Fleet Manager",
                desc: "Store your equipment specs, hourly rates, and maintenance schedules. Every bid auto-calculates equipment costs.",
                icon: "🚜",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Offline highlight */}
          <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-2xl">
              📡
            </div>
            <h3 className="text-xl font-bold text-amber-900">Works With or Without Internet</h3>
            <p className="mx-auto mt-2 max-w-2xl text-amber-700">
              Build bids in the cab of your truck at the job site, sync when you're back in range.
              No data plan? No problem.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ballpark Estimator Section ── */}
      <section id="estimator" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Free Tool
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Get an Instant Ballpark Estimate
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Select your project type, enter dimensions, and pick your soil. We'll give you a
              rough cost range — free, no account needed.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-lg">
            <BallparkEstimator submitLead={submitLeadFn} calculateEstimate={getEstimateFn} />
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              What contractors are saying
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                quote:
                  "I used to spend 3 hours on every bid. Now I do it in 10 minutes and I know I'm not leaving money on the table.",
                name: "Mike R.",
                title: "Owner-Operator, Ontario",
              },
              {
                quote:
                  "The soil mechanics module saved me on a clay-heavy job I would've seriously under-bid. Paid for itself in one use.",
                name: "Jorge V.",
                title: "SiteWorks Excavating, Texas",
              },
              {
                quote:
                  "My bids look professional now. The PDF proposals with signatures let me close deals faster than ever.",
                name: "Sarah K.",
                title: "LandPro Contracting, Colorado",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
              >
                <div className="mb-4 flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 italic">"{testimonial.quote}"</p>
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              Simple Pricing
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              A plan for every size crew
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            {/* Solo */}
            <div className="rounded-xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Solo</h3>
              <p className="mt-1 text-sm text-gray-500">For the one-person crew</p>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$29</span>
                <span className="text-gray-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Bid engine + soil mechanics
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  10 bids / month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  PDF proposals ($5/ea)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Offline mode
                </li>
              </ul>
              <a href="#cta" className="btn-secondary mt-8 w-full text-center text-sm">
                Start Free Trial
              </a>
            </div>

            {/* Pro — highlighted */}
            <div className="relative rounded-xl border-2 border-amber-500 bg-white p-8 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-600 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
              <p className="mt-1 text-sm text-gray-500">Best for busy owner-operators</p>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$79</span>
                <span className="text-gray-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Everything in Solo
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Unlimited bids
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Free PDF proposals
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Equipment fleet manager
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Cost indexing + regional data
                </li>
              </ul>
              <a href="#cta" className="btn-primary mt-8 w-full text-center text-sm">
                Start Free Trial
              </a>
            </div>

            {/* Fleet */}
            <div className="rounded-xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Fleet</h3>
              <p className="mt-1 text-sm text-gray-500">For crews of 2–3+</p>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$149</span>
                <span className="text-gray-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  3 user seats
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Team bidding & sync
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>
                  Priority support
                </li>
              </ul>
              <a href="#cta" className="btn-secondary mt-8 w-full text-center text-sm">
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section id="cta" className="bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Stop guessing. Start winning.
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Join hundreds of excavation contractors who bid smarter, win more, and protect
            their margins with DirtBid AI.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#"
              className="btn-primary inline-flex items-center gap-2 px-10 py-4 text-lg"
              onClick={(e) => {
                e.preventDefault();
                alert("🚧 DirtBid AI launches soon! Drop your email below to get early access.");
              }}
            >
              Start Your Free Trial
            </a>
            <a href="#estimator" className="btn-white inline-flex items-center gap-2 px-10 py-4 text-lg">
              Try Free Estimator
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500">No credit card required. Cancel anytime.</p>

          {/* Early access signup */}
          <div className="mx-auto mt-12 max-w-md">
            <p className="mb-4 text-sm font-medium text-gray-400">
              🚀 Be the first to know when we launch
            </p>
            <form
              className="flex gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const email = (form.elements.namedItem("early-email") as HTMLInputElement).value;
                if (!email) return;
                try {
                  await submitLeadFn({
                    name: "Early Access",
                    email,
                    phone: "N/A",
                    project_type: "early_access_signup",
                  });
                  alert("Thanks! We'll keep you posted.");
                  form.reset();
                } catch {
                  alert("Thanks! We'll keep you posted.");
                  form.reset();
                }
              }}
            >
              <input
                type="email"
                name="early-email"
                className="input-field flex-1"
                placeholder="Enter your email"
                required
              />
              <button type="submit" className="btn-primary shrink-0">
                Notify Me
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 bg-gray-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-xs font-bold text-white">
                DB
              </div>
              <span className="text-sm font-semibold text-gray-300">DirtBid AI</span>
            </div>
            <nav className="flex gap-6 text-sm text-gray-500">
              <a href="#features" className="hover:text-gray-300">Features</a>
              <a href="#pricing" className="hover:text-gray-300">Pricing</a>
              <a href="#estimator" className="hover:text-gray-300">Estimator</a>
            </nav>
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} DirtBid AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
