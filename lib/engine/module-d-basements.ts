// =============================================================================
// Module D: Basements & Ponds
// =============================================================================
// Covers mass earthwork for full basements and stormwater ponds,
// tight-access modifiers for constrained urban sites, clay liner
// volume for pond sealing, benched excavation for deep cuts, and
// dewatering allowances.

export interface BasementInput {
  /** Basement length in feet */
  lengthFt: number;
  /** Basement width in feet */
  widthFt: number;
  /** Excavation depth from grade to subgrade in feet */
  depthFt: number;
  /** Number of bench levels (0 = sloped sides, 1+ = bench cuts) */
  benchCount: number;
  /** Bench width in feet (for benched excavation) */
  benchWidthFt: number;
  /** Side slope ratio (horizontal:vertical, e.g. 1 = 1:1) */
  sideSlopeRatio: number;
  /** Is this a tight-access site? (<15ft equipment clearance) */
  tightAccess: boolean;
  /** Tight access surcharge multiplier on labor (1.0 = none, typical 1.25-1.5) */
  tightAccessMultiplier: number;
  /** Does the pond require a clay liner? */
  needsClayLiner: boolean;
  /** Clay liner thickness in inches */
  clayLinerThicknessIn: number;
  /** Does the site require dewatering? */
  needsDewatering: boolean;
  /** Dewatering allowance as percentage of excavation cost (typical 5-15) */
  dewateringPercent: number;
  /** Soil swell factor */
  soilSwellFactor: number;
  /** Compaction factor for backfill */
  compactionFactor: number;
  /** Cost per cubic yard for clay liner material delivered */
  clayCostPerCY: number;
  /** Cost per cubic yard for imported backfill */
  importBackfillCostPerCY: number;
  /** Labor rate per hour */
  laborRatePerHr: number;
  /** Excavator hourly rate */
  excavatorRatePerHr: number;
  /** Dozer hourly rate */
  dozerRatePerHr: number;
  /** Estimated hours per 100 cubic yards of excavation */
  hoursPer100CY: number;
}

export interface BasementOutput {
  /** Base excavation volume in cubic yards (bank) */
  excavationBaseCY: number;
  /** Side-slope waste volume in cubic yards */
  sideSlopeWasteCY: number;
  /** Total excavation (with sideslopes) in cubic yards */
  excavationTotalCY: number;
  /** Excavation loose volume for trucking */
  excavationLooseCY: number;
  /** Clay liner volume in cubic yards (0 if not needed) */
  clayLinerVolumeCY: number;
  /** Backfill required if any (foundation walls, etc) */
  backfillRequiredCY: number;
  /** Backfill loose to order */
  backfillLooseCY: number;
  /** Surface area of excavation for clay liner calc */
  surfaceAreaSqFt: number;
  /** Tight access labor premium (additional hours) */
  tightAccessPremiumHrs: number;
  /** Dewatering cost allowance */
  dewateringCost: number;
  /** Total labor hours */
  totalLaborHours: number;
  /** Costs breakdown */
  costs: {
    excavation: number; clayLiner: number; backfill: number;
    dewatering: number; tightAccess: number; labor: number;
    equipment: number; total: number;
  };
  lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }>;
}

export function calcSimpleBoxVolumeCY(lengthFt: number, widthFt: number, depthFt: number): number {
  return (lengthFt * widthFt * depthFt) / 27;
}

export function calcSlopedExcavationCY(
  lengthFt: number, widthFt: number, depthFt: number, sideSlope: number
): number {
  if (sideSlope <= 0) return calcSimpleBoxVolumeCY(lengthFt, widthFt, depthFt);
  // For a rectangular pit with sloped sides:
  // V = d/27 * (L*W + (L+s*d)*(W+s*d) + sqrt(L*W*(L+s*d)*(W+s*d))) / 3
  // Slightly simplified using the prismoidal formula:
  // Top length = L + 2*s*d, Top width = W + 2*s*d
  const topL = lengthFt + 2 * sideSlope * depthFt;
  const topW = widthFt + 2 * sideSlope * depthFt;
  // Using average end area method (prismoidal for better accuracy)
  const bottomArea = lengthFt * widthFt;
  const topArea = topL * topW;
  // V = d/27 * (A_bottom + A_top + sqrt(A_bottom * A_top)) / 3
  const avgArea = (bottomArea + topArea + Math.sqrt(bottomArea * topArea)) / 3;
  return (depthFt * avgArea) / 27;
}

export function calcBenchExcavationCY(
  lengthFt: number, widthFt: number, depthFt: number,
  benchCount: number, benchWidthFt: number, sideSlope: number
): number {
  if (benchCount <= 0) return calcSlopedExcavationCY(lengthFt, widthFt, depthFt, sideSlope);
  // Each bench is a smaller sloped pit stacked. Simplified: model as
  // total = sloped pit minus bench shelf volumes.
  const total = calcSlopedExcavationCY(lengthFt, widthFt, depthFt, sideSlope);
  // The benches reduce effective slope by providing flat working areas.
  // Conservative: each bench reduces total by 2% for each bench level.
  const benchReduction = Math.min(1, benchCount * 0.02);
  return total * (1 + benchReduction); // Benching adds a bit more volume
}

export function calcClayLinerVolumeCY(
  lengthFt: number, widthFt: number, depthFt: number,
  thicknessIn: number, sideSlope: number
): number {
  const thicknessFt = thicknessIn / 12;
  // Liner placed on bottom + sloped sides
  const bottomArea = (lengthFt * widthFt) / 27; // CY
  // Side area = perimeter × slope length × thickness
  const topL = lengthFt + 2 * sideSlope * depthFt;
  const topW = widthFt + 2 * sideSlope * depthFt;
  const perimeterMid = 2 * (lengthFt + widthFt); // ~mid depth perimeter
  // Better: compute total liner surface area
  // Bottom = L*W
  // Side walls (4 sides): each is trapezoid
  const sideAreaLength = (lengthFt + topL) / 2 * depthFt; // each side along length
  const sideAreaWidth = (widthFt + topW) / 2 * depthFt;  // each side along width
  const totalLinerArea = bottomArea * 27 + 2 * sideAreaLength + 2 * sideAreaWidth;
  return totalLinerArea * thicknessFt / 27;
}

export function calcBasement(input: BasementInput): BasementOutput {
  const excavationTotalCY = calcBenchExcavationCY(
    input.lengthFt, input.widthFt, input.depthFt,
    input.benchCount, input.benchWidthFt, input.sideSlopeRatio
  );

  // Base volume (simple box, no slopes) for backfill reference
  const excavationBaseCY = calcSimpleBoxVolumeCY(input.lengthFt, input.widthFt, input.depthFt);
  const sideSlopeWasteCY = Math.max(0, excavationTotalCY - excavationBaseCY);
  const excavationLooseCY = excavationTotalCY * input.soilSwellFactor;

  const surfaceAreaSqFt = input.lengthFt * input.widthFt +
    2 * (input.lengthFt + input.widthFt) * input.depthFt; // rough total surface

  const clayLinerVolumeCY = input.needsClayLiner
    ? calcClayLinerVolumeCY(input.lengthFt, input.widthFt, input.depthFt,
        input.clayLinerThicknessIn, input.sideSlopeRatio)
    : 0;

  // Backfill needed for basement: foundation walls reduce void.
  // Typical: foundation wall occupies ~15% of excavation volume
  const backfillRequiredCY = Math.max(0, excavationTotalCY * 0.15);
  const backfillLooseCY = backfillRequiredCY * input.compactionFactor;

  // Base labor hours (per 100 CY)
  const baseHours = (excavationTotalCY / 100) * input.hoursPer100CY;

  // Tight access premium
  const tightAccessPremiumHrs = input.tightAccess
    ? baseHours * (input.tightAccessMultiplier - 1)
    : 0;

  const totalLaborHours = baseHours + tightAccessPremiumHrs;

  const excavCost = baseHours * input.excavatorRatePerHr;
  const dozerCost = baseHours * 0.5 * input.dozerRatePerHr; // dozer used ~50% of time
  const equipmentCost = excavCost + dozerCost;

  const clayLinerCost = clayLinerVolumeCY * input.clayCostPerCY;
  const backfillCost = backfillLooseCY * input.importBackfillCostPerCY;
  const laborCost = totalLaborHours * input.laborRatePerHr;

  const dewateringCost = input.needsDewatering
    ? (laborCost + equipmentCost) * (input.dewateringPercent / 100)
    : 0;

  const tightAccessCost = tightAccessPremiumHrs * (input.laborRatePerHr + input.excavatorRatePerHr);
  const totalCost = laborCost + equipmentCost + clayLinerCost + backfillCost + dewateringCost + tightAccessCost;

  const lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }> = [
    { description: 'Mass excavation (bank measure)', quantity: round2(excavationTotalCY), unit: 'CY', rate: 0, amount: round2(excavCost + dozerCost + laborCost) },
  ];

  if (excavationTotalCY > excavationBaseCY) {
    lineItems.push({
      description: 'Side slope waste & benching', quantity: round2(sideSlopeWasteCY), unit: 'CY',
      rate: 0, amount: round2(excavCost * (sideSlopeWasteCY / excavationTotalCY)),
    });
  }

  if (input.needsClayLiner) {
    lineItems.push({
      description: 'Clay liner (placed & compacted)', quantity: round2(clayLinerVolumeCY), unit: 'CY',
      rate: input.clayCostPerCY, amount: round2(clayLinerCost),
    });
  }

  if (backfillLooseCY > 0) {
    lineItems.push({
      description: 'Imported backfill', quantity: round2(backfillLooseCY), unit: 'CY',
      rate: input.importBackfillCostPerCY, amount: round2(backfillCost),
    });
  }

  if (input.tightAccess) {
    lineItems.push({
      description: `Tight access premium (×${input.tightAccessMultiplier})`, quantity: round2(tightAccessPremiumHrs), unit: 'hr',
      rate: 0, amount: round2(tightAccessCost),
    });
  }

  if (input.needsDewatering) {
    lineItems.push({
      description: 'Dewatering allowance', quantity: input.dewateringPercent, unit: '%',
      rate: 0, amount: round2(dewateringCost),
    });
  }

  lineItems.push(
    { description: 'Labor', quantity: round2(totalLaborHours), unit: 'hr', rate: input.laborRatePerHr, amount: round2(laborCost) },
    { description: 'Excavator operation', quantity: round2(baseHours), unit: 'hr', rate: input.excavatorRatePerHr, amount: round2(excavCost) },
    { description: 'Dozer operation', quantity: round2(baseHours * 0.5), unit: 'hr', rate: input.dozerRatePerHr, amount: round2(dozerCost) },
  );

  return {
    excavationBaseCY: round2(excavationBaseCY),
    sideSlopeWasteCY: round2(sideSlopeWasteCY),
    excavationTotalCY: round2(excavationTotalCY),
    excavationLooseCY: round2(excavationLooseCY),
    clayLinerVolumeCY: round2(clayLinerVolumeCY),
    backfillRequiredCY: round2(backfillRequiredCY),
    backfillLooseCY: round2(backfillLooseCY),
    surfaceAreaSqFt: round2(surfaceAreaSqFt),
    tightAccessPremiumHrs: round2(tightAccessPremiumHrs),
    dewateringCost: round2(dewateringCost),
    totalLaborHours: round2(totalLaborHours),
    costs: {
      excavation: round2(excavCost + dozerCost),
      clayLiner: round2(clayLinerCost),
      backfill: round2(backfillCost),
      dewatering: round2(dewateringCost),
      tightAccess: round2(tightAccessCost),
      labor: round2(laborCost),
      equipment: round2(equipmentCost),
      total: round2(totalCost),
    },
    lineItems,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
