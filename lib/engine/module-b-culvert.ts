// =============================================================================
// Module B: Culvert Installation
// =============================================================================
// Covers trapezoidal trench excavation, pipe displacement, bedding material,
// backfill volumes, headwall/wingwall concrete, and riprap outlet protection.

export interface CulvertInput {
  /** Culvert pipe nominal diameter in inches */
  pipeDiameterIn: number;
  /** Total culvert length in feet */
  lengthFt: number;
  /** Trench bottom width in feet (pipe dia + 2×work space, typical: pipeDiaFt + 2) */
  trenchBottomWidthFt: number;
  /** Trench depth from surface to invert in feet */
  trenchDepthFt: number;
  /** Trench side slope ratio (horizontal:vertical, e.g. 1.5 means 1.5:1) */
  sideSlopeRatio: number;
  /** Bedding material thickness under pipe in inches */
  beddingThicknessIn: number;
  /** Cover material thickness over pipe in inches */
  coverThicknessIn: number;
  /** Soil swell factor for excavated material */
  soilSwellFactor: number;
  /** Compaction factor for backfill material */
  compactionFactor: number;
  /** Does this require concrete headwalls? */
  needsHeadwall: boolean;
  /** Headwall height in feet */
  headwallHeightFt: number;
  /** Headwall width (perpendicular to pipe) in feet */
  headwallWidthFt: number;
  /** Headwall thickness in inches */
  headwallThicknessIn: number;
  /** Number of headwalls (2 for both ends, 1 for single) */
  headwallCount: number;
  /** Does this require riprap outlet protection? */
  needsRiprap: boolean;
  /** Riprap apron length in feet */
  riprapLengthFt: number;
  /** Riprap apron width in feet */
  riprapWidthFt: number;
  /** Riprap thickness in inches */
  riprapThicknessIn: number;
  /** Cost per cubic yard of bedding material */
  beddingCostPerCY: number;
  /** Cost per cubic yard of backfill material */
  backfillCostPerCY: number;
  /** Cost per cubic yard of concrete for headwalls */
  concreteCostPerCY: number;
  /** Cost per cubic yard of riprap */
  riprapCostPerCY: number;
  /** Pipe cost per linear foot */
  pipeCostPerLF: number;
  /** Labor rate in dollars per hour */
  laborRatePerHr: number;
  /** Excavator hourly rate in dollars per hour */
  excavatorRatePerHr: number;
  /** Estimated hours of excavation per cubic yard */
  hoursPerCY: number;
}

export interface CulvertOutput {
  /** Cross-sectional area of trapezoidal trench in square feet */
  trenchCrossSectionSqFt: number;
  /** Total trench excavation volume in cubic yards (bank measure) */
  excavationVolumeCY: number;
  /** Excavation volume accounting for swell (loose) */
  excavationLooseCY: number;
  /** Pipe cross-sectional area in square feet */
  pipeCrossSectionSqFt: number;
  /** Pipe volume (displacement) in cubic yards */
  pipeVolumeCY: number;
  /** Bedding material volume in cubic yards */
  beddingVolumeCY: number;
  /** Backfill material volume (compacted) in cubic yards */
  backfillVolumeCY: number;
  /** Backfill material to order (loose) in cubic yards */
  backfillLooseCY: number;
  /** Concrete volume for headwalls in cubic yards (0 if no headwall) */
  concreteVolumeCY: number;
  /** Riprap volume in cubic yards (0 if no riprap) */
  riprapVolumeCY: number;
  /** Total pipe linear feet */
  pipeLengthLF: number;
  /** Estimated labor hours */
  laborHours: number;
  /** Cost breakdown */
  costs: {
    pipe: number;
    bedding: number;
    backfill: number;
    concrete: number;
    riprap: number;
    labor: number;
    equipment: number;
    total: number;
  };
  lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }>;
}

export function calcTrenchCrossSection(bottomWidthFt: number, depthFt: number, sideSlope: number): number {
  if (bottomWidthFt <= 0) throw new Error('Bottom width must be positive');
  if (depthFt <= 0) throw new Error('Depth must be positive');
  if (sideSlope < 0) throw new Error('Side slope must be non-negative');
  // Top width = bottomWidth + 2 × sideSlope × depth
  const topWidth = bottomWidthFt + 2 * sideSlope * depthFt;
  // Trapezoid area = (b1 + b2) / 2 × h
  return ((bottomWidthFt + topWidth) / 2) * depthFt;
}

export function calcTrenchExcavationCY(crossSectionSqFt: number, lengthFt: number): number {
  return (crossSectionSqFt * lengthFt) / 27;
}

export function calcPipeCrossSectionAL(diameterIn: number): number {
  const radiusFt = diameterIn / 24; // inches to feet radius
  return Math.PI * radiusFt * radiusFt;
}

export function calcPipeVolumeCY(crossSectionSqFt: number, lengthFt: number): number {
  return (crossSectionSqFt * lengthFt) / 27;
}

export function calcBeddingVolumeCY(lengthFt: number, bottomWidthFt: number, beddingThicknessIn: number): number {
  const beddingFt = beddingThicknessIn / 12;
  return (lengthFt * bottomWidthFt * beddingFt) / 27;
}

export function calcBackfillVolumeCY(
  excavationCY: number,
  pipeVolumeCY: number,
  beddingVolumeCY: number
): number {
  return excavationCY - pipeVolumeCY - beddingVolumeCY;
}

export function calcBackfillLoose(compactedCY: number, compactionFactor: number): number {
  if (compactionFactor <= 0) throw new Error('Compaction factor must be positive');
  return compactedCY * compactionFactor;
}

export function calcHeadwallConcreteCY(
  heightFt: number, widthFt: number, thicknessIn: number, count: number
): number {
  const thicknessFt = thicknessIn / 12;
  return (heightFt * widthFt * thicknessFt * count) / 27;
}

export function calcRiprapVolumeCY(lengthFt: number, widthFt: number, thicknessIn: number): number {
  const thicknessFt = thicknessIn / 12;
  return (lengthFt * widthFt * thicknessFt) / 27;
}

export function calcCulvert(input: CulvertInput): CulvertOutput {
  const trenchCS = calcTrenchCrossSection(input.trenchBottomWidthFt, input.trenchDepthFt, input.sideSlopeRatio);
  const excavationCY = calcTrenchExcavationCY(trenchCS, input.lengthFt);
  const excavationLooseCY = excavationCY * input.soilSwellFactor;

  const pipeArea = calcPipeCrossSectionAL(input.pipeDiameterIn);
  const pipeVolumeCY = calcPipeVolumeCY(pipeArea, input.lengthFt);
  const beddingVolumeCY = calcBeddingVolumeCY(input.lengthFt, input.trenchBottomWidthFt, input.beddingThicknessIn);

  const backfillCompactCY = calcBackfillVolumeCY(excavationCY, pipeVolumeCY, beddingVolumeCY);
  const backfillLooseCY = calcBackfillLoose(backfillCompactCY, input.compactionFactor);

  const concreteVolumeCY = input.needsHeadwall
    ? calcHeadwallConcreteCY(input.headwallHeightFt, input.headwallWidthFt, input.headwallThicknessIn, input.headwallCount)
    : 0;

  const riprapVolumeCY = input.needsRiprap
    ? calcRiprapVolumeCY(input.riprapLengthFt, input.riprapWidthFt, input.riprapThicknessIn)
    : 0;

  const laborHours = excavationCY * input.hoursPerCY;

  const pipeCost = input.lengthFt * input.pipeCostPerLF;
  const beddingCost = beddingVolumeCY * input.beddingCostPerCY;
  const backfillCost = backfillLooseCY * input.backfillCostPerCY;
  const concreteCost = concreteVolumeCY * input.concreteCostPerCY;
  const riprapCost = riprapVolumeCY * input.riprapCostPerCY;
  const laborCost = laborHours * input.laborRatePerHr;
  const equipmentCost = laborHours * input.excavatorRatePerHr;
  const totalCost = pipeCost + beddingCost + backfillCost + concreteCost + riprapCost + laborCost + equipmentCost;

  const lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }> = [
    { description: 'Trench excavation', quantity: round2(excavationCY), unit: 'CY', rate: 0, amount: round2(laborCost + equipmentCost) },
    { description: 'Culvert pipe', quantity: input.lengthFt, unit: 'LF', rate: input.pipeCostPerLF, amount: round2(pipeCost) },
    { description: 'Bedding material', quantity: round2(beddingVolumeCY), unit: 'CY', rate: input.beddingCostPerCY, amount: round2(beddingCost) },
    { description: 'Backfill material (loose)', quantity: round2(backfillLooseCY), unit: 'CY', rate: input.backfillCostPerCY, amount: round2(backfillCost) },
  ];

  if (input.needsHeadwall) {
    lineItems.push({
      description: `Concrete headwall (${input.headwallCount} ea)`,
      quantity: round2(concreteVolumeCY), unit: 'CY',
      rate: input.concreteCostPerCY, amount: round2(concreteCost),
    });
  }

  if (input.needsRiprap) {
    lineItems.push({
      description: 'Riprap outlet protection',
      quantity: round2(riprapVolumeCY), unit: 'CY',
      rate: input.riprapCostPerCY, amount: round2(riprapCost),
    });
  }

  lineItems.push(
    { description: 'Labor', quantity: round2(laborHours), unit: 'hr', rate: input.laborRatePerHr, amount: round2(laborCost) },
    { description: 'Equipment operation', quantity: round2(laborHours), unit: 'hr', rate: input.excavatorRatePerHr, amount: round2(equipmentCost) },
  );

  return {
    trenchCrossSectionSqFt: round2(trenchCS),
    excavationVolumeCY: round2(excavationCY),
    excavationLooseCY: round2(excavationLooseCY),
    pipeCrossSectionSqFt: round2(pipeArea),
    pipeVolumeCY: round2(pipeVolumeCY),
    beddingVolumeCY: round2(beddingVolumeCY),
    backfillVolumeCY: round2(backfillCompactCY),
    backfillLooseCY: round2(backfillLooseCY),
    concreteVolumeCY: round2(concreteVolumeCY),
    riprapVolumeCY: round2(riprapVolumeCY),
    pipeLengthLF: input.lengthFt,
    laborHours: round2(laborHours),
    costs: {
      pipe: round2(pipeCost), bedding: round2(beddingCost), backfill: round2(backfillCost),
      concrete: round2(concreteCost), riprap: round2(riprapCost),
      labor: round2(laborCost), equipment: round2(equipmentCost), total: round2(totalCost),
    },
    lineItems,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
