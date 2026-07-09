/**
 * Real Engine-Powered Ballpark Estimator
 * 
 * Maps BallparkEstimator inputs to the DirtBid AI engine modules
 * and returns realistic cost ranges. Covers all 5 project types.
 */
import type { ProjectType, SoilType } from "~/components/BallparkEstimator";

// ── Types ────────────────────────────────────────────────────────────

export interface EstimateRequest {
  projectType: ProjectType;
  length: number;
  width: number;
  depth: number;
  soilType: SoilType;
}

export interface EstimateResult {
  low: number;
  high: number;
  volumeCY: number;
  breakdown: string[];
}

// ── Soil Cost Factors (from engine Module E - SOIL_FACTORS) ──────────

const SOIL_SWELL: Record<SoilType, number> = {
  sand: 1.15,
  loam: 1.25,
  clay: 1.30,
  rock: 1.55,
  mixed: 1.25,
};

const SOIL_DENSITY_LCY: Record<SoilType, number> = {
  sand: 2700,
  loam: 2500,
  clay: 2400,
  rock: 4000,
  mixed: 2500,
};

const SOIL_LABEL: Record<SoilType, string> = {
  sand: "Sand",
  loam: "Loam",
  clay: "Clay",
  rock: "Rock",
  mixed: "Mixed",
};

// ── Cost Assumptions ($/hr, $/CY, etc.) ──────────────────────────────

const EXCAVATOR_RATE = 95;     // $/hr
const LABOR_RATE = 65;         // $/hr
const DUMP_TRUCK_RATE = 85;    // $/hr
const AGGREGATE_COST = 35;     // $/CY base
const BACKFILL_COST = 25;      // $/CY
const CONCRETE_COST = 350;     // $/CY
const PIPE_COST_PER_LF = 85;   // $/LF (18" culvert)

const MOBILIZATION_BASE = 500;
const HOURS_PER_100_CY = 4;    // excavation hours per 100 CY bank

// ── Engine Math ──────────────────────────────────────────────────────

function calcVolumeCY(length: number, width: number, depth: number): number {
  return (length * width * depth) / 27;
}

function calcExcavationCost(bankCY: number, soilType: SoilType): number {
  const swellFactor = SOIL_SWELL[soilType];
  const looseCY = bankCY * swellFactor;
  const hours = (bankCY / 100) * HOURS_PER_100_CY;
  return hours * (EXCAVATOR_RATE + LABOR_RATE) + (looseCY * 3); // $3/CY disposal
}

// ── Module Calculators ───────────────────────────────────────────────

function calcDrivewayEstimate(length: number, width: number, depth: number, soilType: SoilType) {
  const areaSqFt = length * width;
  const bankCY = calcVolumeCY(length, width, depth);
  const baseDepthIn = 6;
  const baseCompactedCY = (length * width * (baseDepthIn / 12)) / 27;
  const baseLooseCY = baseCompactedCY * 1.15;

  const excavCost = calcExcavationCost(bankCY, soilType);
  const baseCost = baseLooseCY * AGGREGATE_COST;
  const fabricSY = ((length + 1) * (width + 1)) / 9;
  const fabricCost = fabricSY * 4.5;
  const gradingHours = (areaSqFt / 1000) * 3;
  const laborEquip = gradingHours * (LABOR_RATE + EXCAVATOR_RATE);

  const total = excavCost + baseCost + fabricCost + laborEquip + MOBILIZATION_BASE;

  return {
    low: Math.round(total),
    high: Math.round(total * 1.35),
    breakdown: [
      `Excavation: ${bankCY.toFixed(1)} CY (swell ×${SOIL_SWELL[soilType]})`,
      `Base aggregate: ${baseLooseCY.toFixed(1)} LCY @ $${AGGREGATE_COST}/CY`,
      `Geotextile fabric: ${fabricSY.toFixed(1)} SY @ $4.50/SY`,
      `Grading labor & equipment: ${gradingHours.toFixed(1)} hrs`,
      `Mobilization: $${MOBILIZATION_BASE}`,
    ],
  };
}

function calcCulvertEstimate(length: number, width: number, depth: number, soilType: SoilType) {
  const pipeDiaIn = 18;
  const slopeRatio = 1.5;
  const topWidth = width + 2 * slopeRatio * depth;
  const crossSection = ((width + topWidth) / 2) * depth;
  const excavationCY = (crossSection * length) / 27;
  const pipeArea = Math.PI * ((pipeDiaIn / 24) ** 2);
  const pipeVolumeCY = (pipeArea * length) / 27;
  const beddingCY = (length * width * (6 / 12)) / 27;
  const backfillCY = excavationCY - pipeVolumeCY - beddingCY;

  const excavCost = calcExcavationCost(excavationCY, soilType);
  const pipeCost = length * PIPE_COST_PER_LF;
  const beddingCost = beddingCY * 40;
  const backfillCost = backfillCY * BACKFILL_COST * 1.15;
  const concreteCY = (4 * 6 * (8 / 12) * 2) / 27; // 2 headwalls
  const concreteCost = concreteCY * CONCRETE_COST;

  const total = excavCost + pipeCost + beddingCost + backfillCost + concreteCost + MOBILIZATION_BASE;

  return {
    low: Math.round(total),
    high: Math.round(total * 1.3),
    breakdown: [
      `Trench excavation: ${excavationCY.toFixed(1)} CY (trapezoidal, ${slopeRatio}:1 slope)`,
      `Pipe (${pipeDiaIn}" dia): ${length} LF @ $${PIPE_COST_PER_LF}/LF`,
      `Bedding: ${beddingCY.toFixed(1)} CY`,
      `Backfill: ${backfillCY.toFixed(1)} CY (compacted)`,
      `Concrete headwalls: ${concreteCY.toFixed(1)} CY @ $${CONCRETE_COST}/CY`,
      `Mobilization: $${MOBILIZATION_BASE}`,
    ],
  };
}

function calcSepticEstimate(length: number, width: number, _depth: number, soilType: SoilType) {
  // For septic, use bedrooms derived from typical house size
  const bedrooms = Math.max(2, Math.round((length * width) / 400));
  const tankGal = bedrooms <= 3 ? 1000 : 1000 + (bedrooms - 3) * 250;
  const dailyFlow = bedrooms * 120;
  const percRate = soilType === 'sand' ? 5 : soilType === 'clay' ? 60 : 20;
  const appRate = percRate <= 5 ? 1.6 : percRate <= 10 ? 1.2 : percRate <= 15 ? 0.9 : percRate <= 30 ? 0.72 : percRate <= 45 ? 0.6 : 0.45;
  const drainfieldArea = dailyFlow / appRate;
  const trenchLength = drainfieldArea / 2 / 3;
  const gravelCY = trenchLength * 3 * 0.1;
  const pipeLF = trenchLength * 3 * 1.05;

  const tankExcavCY = calcVolumeCY(8, 6, 6);
  const trenchExcavCY = (trenchLength * 2 * (15 / 12) * 3) / 27;
  const totalExcavCY = tankExcavCY + trenchExcavCY;
  const excavCost = calcExcavationCost(totalExcavCY, soilType);
  const tankCost = tankGal * 0.55;
  const gravelCost = gravelCY * 38;
  const pipeCost = pipeLF * 3.5;

  const total = excavCost + tankCost + gravelCost + pipeCost + MOBILIZATION_BASE;

  return {
    low: Math.round(total),
    high: Math.round(total * 1.3),
    breakdown: [
      `Tank: ${tankGal} gal (${bedrooms}-bedroom home)`,
      `Tank excavation: ${tankExcavCY.toFixed(1)} CY`,
      `Drainfield trenches: ${trenchLength.toFixed(0)} ft each × 3`,
      `Gravel: ${gravelCY.toFixed(1)} CY @ $38/CY`,
      `Perforated pipe: ${pipeLF.toFixed(0)} LF @ $3.50/LF`,
      `Perc rate: ${percRate} min/in (${SOIL_LABEL[soilType]} soil)`,
      `Mobilization: $${MOBILIZATION_BASE}`,
    ],
  };
}

function calcBasementEstimate(length: number, width: number, depth: number, soilType: SoilType) {
  const bankCY = calcVolumeCY(length, width, depth);
  const swellFactor = SOIL_SWELL[soilType];
  const looseCY = bankCY * swellFactor;
  const hours = (bankCY / 100) * HOURS_PER_100_CY;
  const excavCost = hours * (EXCAVATOR_RATE + LABOR_RATE * 1.25); // tight access surcharge
  const backfillCY = bankCY * 0.15 * 1.15;
  const backfillCost = backfillCY * BACKFILL_COST;
  const haulCY = looseCY * 0.85; // 85% hauled away
  const haulHours = (haulCY / 12) * (10 / 30 * 60 + 5 + 3) / 60; // 10mi haul
  const haulCost = haulHours * DUMP_TRUCK_RATE;

  const total = excavCost + backfillCost + haulCost + MOBILIZATION_BASE * 1.5;

  return {
    low: Math.round(total),
    high: Math.round(total * 1.4),
    breakdown: [
      `Mass excavation: ${bankCY.toFixed(1)} CY (${SOIL_LABEL[soilType]} ×${swellFactor} swell)`,
      `Loose volume: ${looseCY.toFixed(1)} LCY (${(looseCY * 0.85).toFixed(0)} CY hauled)`,
      `Backfill: ${backfillCY.toFixed(1)} CY (compacted)`,
      `Hauling: ${haulHours.toFixed(1)} hrs @ $${DUMP_TRUCK_RATE}/hr (10 mi)`,
      `Tight access surcharge: 25% labor premium`,
      `Mobilization: $${MOBILIZATION_BASE * 1.5}`,
    ],
  };
}

function calcPondEstimate(length: number, width: number, depth: number, soilType: SoilType) {
  const slopeRatio = 2.0;
  const topLen = length + 2 * slopeRatio * depth;
  const topWid = width + 2 * slopeRatio * depth;
  const bankCY = calcVolumeCY(length, width, depth) * 1.4; // sloped adds ~40%
  const swellFactor = SOIL_SWELL[soilType];
  const looseCY = bankCY * swellFactor;
  const hours = (bankCY / 100) * HOURS_PER_100_CY;
  const excavCost = hours * (EXCAVATOR_RATE + LABOR_RATE);

  // Clay liner if soil is sandy
  const needsLiner = soilType === 'sand';
  const linerCY = needsLiner ? ((length * width) + 2 * (length + width) * depth * 0.6) * (1 / 12) / 27 : 0;
  const linerCost = linerCY * 45;

  const haulCY = looseCY * 0.6; // 60% hauled (rest used on-site)
  const haulHours = (haulCY / 12) * (5 / 30 * 60 + 5 + 3) / 60;
  const haulCost = haulHours * DUMP_TRUCK_RATE;

  const total = excavCost + linerCost + haulCost + MOBILIZATION_BASE;

  return {
    low: Math.round(total),
    high: Math.round(total * 1.35),
    breakdown: [
      `Pond excavation: ${bankCY.toFixed(1)} CY (${slopeRatio}:1 sloped sides)`,
      `Loose volume: ${looseCY.toFixed(1)} LCY`,
      needsLiner ? `Clay liner: ${linerCY.toFixed(1)} CY @ $45/CY (sandy soil)` : 'No liner needed',
      `Hauling: ${haulHours.toFixed(1)} hrs @ $${DUMP_TRUCK_RATE}/hr`,
      `Mobilization: $${MOBILIZATION_BASE}`,
    ].filter(Boolean),
  };
}

// ── Main Estimator ───────────────────────────────────────────────────

export function calculateEngineEstimate(req: EstimateRequest): EstimateResult {
  const { projectType, length, width, depth, soilType } = req;
  const volumeCY = calcVolumeCY(length, width, depth);

  let result: { low: number; high: number; breakdown: string[] };

  switch (projectType) {
    case 'driveway':
      result = calcDrivewayEstimate(length, width, depth, soilType);
      break;
    case 'culvert':
      result = calcCulvertEstimate(length, width, depth, soilType);
      break;
    case 'septic':
      result = calcSepticEstimate(length, width, depth, soilType);
      break;
    case 'basement':
      result = calcBasementEstimate(length, width, depth, soilType);
      break;
    case 'pond':
      result = calcPondEstimate(length, width, depth, soilType);
      break;
    default:
      result = {
        low: Math.round(volumeCY * 45),
        high: Math.round(volumeCY * 65),
        breakdown: ['Generic estimate based on volume only'],
      };
  }

  return {
    low: result.low,
    high: result.high,
    volumeCY: Math.round(volumeCY * 100) / 100,
    breakdown: result.breakdown,
  };
}