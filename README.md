# DirtBid AI

**Eliminate under-bidding — the #1 killer of excavation contractors.**

Automate soil mechanics, structural math, and dynamic cost indexing to generate accurate, professional bids in minutes — from the cab of your truck, with or without internet.

## Architecture

```
dirtbid.ai/
├── lib/
│   ├── engine/           # Core calculation engine (Modules A-E)
│   │   ├── module-a-driveway.ts
│   │   ├── module-b-culvert.ts
│   │   ├── module-c-septic.ts
│   │   ├── module-d-basements.ts
│   │   ├── module-e-hauling.ts
│   │   └── orchestrator.ts      # Dynamic Cost Orchestrator
│   ├── db/
│   │   └── schema.ts
│   └── pdf/
│       └── generate-proposal.ts
├── __tests__/
│   └── engine/           # 79 Jest tests across all 5 modules
│       ├── module-a-driveway.test.ts
│       ├── module-b-culvert.test.ts
│       ├── module-c-septic.test.ts
│       ├── module-d-basements.test.ts
│       └── module-e-hauling.test.ts
├── src/                  # Marketing site (TanStack Start)
│   ├── components/
│   │   ├── BallparkEstimator.tsx
│   │   └── PdfProposalBuilder.tsx
│   ├── lib/
│   │   ├── estimateEngine.ts    # Real engine-powered estimator
│   │   ├── pdfGenerator.ts
│   │   └── db.ts
│   └── routes/
│       └── index.tsx            # Landing page + server functions
├── pages/                # Legacy Next.js pages
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Core Calculation Engine (Modules A-E)

| Module | Project Type | Key Calculations |
|--------|-------------|------------------|
| **A** | Driveways | Surface area, earthwork volume, aggregate tonnage, geotextile fabric, grading hours |
| **B** | Culverts | Trapezoidal trench excavation, pipe displacement, bedding/backfill, headwall concrete, riprap |
| **C** | Septic | Tank sizing (900-1800 gal), daily flow, drainfield area (perc-rate aware), gravel volume |
| **D** | Basements/Ponds | Sloped/prismoidal excavation, tight access modifier (60%), clay liner, dewatering |
| **E** | Hauling | Swell/compaction for 7 soil types, truckload ceiling (volume vs weight), cycle-time costing, fuel |

## Testing

```bash
npm install
npm test
```

79 tests covering all 5 modules with boundary value analysis:

- Zero, negative, and excessive inputs
- All 7 soil types (clay, sand, gravel, rock, topsoil, silt, common-earth)
- All 5 truck types (standard/large/super dump, transfer, belly dump)
- Floating-point precision within 0.1%

## Marketing Site

The Ballpark Estimator at `/src/components/BallparkEstimator.tsx` provides realistic cost ranges powered by the same engine logic:

- 5 project types with per-item breakdowns
- Soil-type specific swell factors and densities
- Equipment rates, labor costs, and material pricing
- 3-step UX: input → lead capture → results

## Live Preview

The site runs on port 3000 and is published at the team's preview URL.

## Technology Stack

- **Runtime**: Node.js 24, Bun
- **Framework**: TanStack Start (React 19 + Vite + Tailwind CSS)
- **Testing**: Jest + ts-jest (TypeScript)
- **Database**: Neon (serverless Postgres)
- **PDF**: jsPDF + html2canvas
- **Auth**: Planned (Stripe for monetization)