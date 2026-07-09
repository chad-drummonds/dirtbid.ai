// =============================================================================
// Module C: Septic Beds & Tanks
// =============================================================================
// Covers septic tank sizing (gallons/household size), drainfield area
// calculation using perc rates, gravel quantity for bed, distribution pipe,
// and soil excavation volumes.

export interface SepticInput {
  /** Number of bedrooms for tank sizing */
  bedrooms: number;
  /** Number of occupants (if known, otherwise use bedrooms × 1.5) */
  occupants: number;
  /** Soil perc rate in minutes per inch (typical: 5-60) */
  percRateMinPerIn: number;
  /** Drainfield trench bottom width in feet (typical: 2-3) */
  trenchWidthFt: number;
  /** Gravel depth in trench in inches (typical: 12-18) */
  gravelDepthIn: number;
  /** Gravel coverage over pipe in inches (typical: 2) */
  gravelCoverOverPipeIn: number;
  /** Distribution pipe diameter in inches */
  pipeDiameterIn: number;
  /** Number of drainfield trenches */
  trenchCount: number;
  /** Trench length, auto-calculated from area if set to 0 */
  trenchLengthOverrideFt: number;
  /** Does this require a pump chamber? */
  needsPumpChamber: boolean;
  /** Elevation difference from tank to drainfield in feet (for pump sizing) */
  elevationDifferenceFt: number;
  /** Excavation depth for tank hole in feet */
  tankExcavationDepthFt: number;
  /** Tank excavation length in feet */
  tankExcavationLengthFt: number;
  /** Tank excavation width in feet */
  tankExcavationWidthFt: number;
  /** Side slope ratio for tank excavation (horizontal:vertical) */
  tankSideSlope: number;
  /** Soil swell factor */
  soilSwellFactor: number;
  /** Cost per gallon of septic tank */
  tankCostPerGal: number;
  /** Cost per linear foot of perforated pipe */
  pipeCostPerLF: number;
  /** Cost per cubic yard of gravel */
  gravelCostPerCY: number;
  /** Cost per cubic yard of backfill (imported if needed) */
  backfillCostPerCY: number;
  /** Pump chamber cost (total installed) */
  pumpChamberCost: number;
  /** Labor rate per hour */
  laborRatePerHr: number;
  /** Excavator rate per hour */
  excavatorRatePerHr: number;
  /** Estimated excavation hours per cubic yard */
  hoursPerCY: number;
}

export interface SepticOutput {
  /** Recommended tank size in gallons */
  tankSizeGal: number;
  /** Daily flow in gallons per day */
  dailyFlowGPD: number;
  /** Required drainfield area in square feet */
  drainfieldAreaSqFt: number;
  /** Required drainfield area in square feet per bedroom for reference */
  drainfieldSqFtPerBedroom: number;
  /** Gravel volume in cubic yards (compacted) */
  gravelVolumeCY: number;
  /** Perforated pipe length in linear feet */
  pipeLengthLF: number;
  /** Tank excavation volume in cubic yards (bank) */
  tankExcavationCY: number;
  /** Tank excavation loose volume */
  tankExcavationLooseCY: number;
  /** Total backfill volume in cubic yards */
  totalBackfillCY: number;
  /** Backfill to order (loose) */
  backfillLooseCY: number;
  /** Trench excavation volume in cubic yards */
  trenchExcavationCY: number;
  /** Trench excavation loose volume */
  trenchExcavationLooseCY: number;
  /** Trench length per trench */
  trenchLengthFt: number;
  /** Total cost breakdown */
  costs: {
    tank: number; pipe: number; gravel: number; backfill: number;
    pumpChamber: number; labor: number; equipment: number; total: number;
  };
  lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }>;
}

export function calcTankSize(bedrooms: number, occupants: number): number {
  const effective = Math.max(bedrooms * 1.5, occupants);
  // Standard: first 2 people = 300 gal, each additional = 150 gal, min 900 gal
  if (effective <= 2) return 900;
  if (effective <= 4) return 1000;
  if (effective <= 6) return 1250;
  if (effective <= 8) return 1500;
  return 1800;
}

export function calcFlowGPD(occupants: number): number {
  // Standard: 120 gal/person/day for residential
  return occupants * 120;
}

export function calcDrainfieldAreaSqFt(flowGPD: number, percRateMinPerIn: number): number {
  if (percRateMinPerIn <= 0) throw new Error('Perc rate must be positive');
  // Application rate from perc rate (US EPA/state standards approximate):
  // Rate (gal/sqft/day) mapped from perc minutes/inch
  // perc 1-5: 1.6, 6-10: 1.2, 11-15: 0.9, 16-30: 0.72, 31-45: 0.6, 46-60: 0.45, >60: 0.3
  let appRate: number;
  if (percRateMinPerIn <= 5) appRate = 1.6;
  else if (percRateMinPerIn <= 10) appRate = 1.2;
  else if (percRateMinPerIn <= 15) appRate = 0.9;
  else if (percRateMinPerIn <= 30) appRate = 0.72;
  else if (percRateMinPerIn <= 45) appRate = 0.6;
  else if (percRateMinPerIn <= 60) appRate = 0.45;
  else appRate = 0.3;

  return flowGPD / appRate;
}

export function calcTrenchLength(areaSqFt: number, trenchWidthFt: number, trenchCount: number): number {
  if (trenchCount <= 0) throw new Error('Trench count must be positive');
  const totalLinearFt = areaSqFt / trenchWidthFt;
  return totalLinearFt / trenchCount;
}

export function calcGravelVolumeCY(
  trenchLengthFt: number, trenchWidthFt: number, gravelDepthIn: number, pipeDiameterIn: number, gravelCoverIn: number,
  trenchCount: number
): number {
  // Gravel volume = trench cross-section area × length, minus pipe displacement
  const gravelDepthFt = gravelDepthIn / 12;
  const pipeRadiusFt = pipeDiameterIn / 24;
  const pipeCrossSectionFt = Math.PI * pipeRadiusFt * pipeRadiusFt;
  // Gravel area = trenchWidth × gravelDepth - pipe submerged portion
  const gravelAreaPerTrenchFt = (trenchWidthFt * gravelDepthFt) - pipeCrossSectionFt;
  const totalVolumeCF = gravelAreaPerTrenchFt * trenchLengthFt * trenchCount;
  return totalVolumeCF / 27;
}

export function calcTrenchExcavationCY(
  trenchLengthFt: number, trenchWidthFt: number, gravelDepthIn: number, trenchCount: number
): number {
  const gravelDepthFt = gravelDepthIn / 12;
  return (trenchLengthFt * trenchWidthFt * gravelDepthFt * trenchCount) / 27;
}

export function calcTankExcavationCY(
  lengthFt: number, widthFt: number, depthFt: number, sideSlope: number
): number {
  // If no side slope, simple box
  if (sideSlope <= 0) return (lengthFt * widthFt * depthFt) / 27;
  // Truncated pyramid for sloped excavation
  const topLength = lengthFt + 2 * sideSlope * depthFt;
  const topWidth = widthFt + 2 * sideSlope * depthFt;
  // Volume = h/6 × (L1W1 + L2W2 + (L1+L2)(W1+W2))
  // Actually, h/6 × (L1W1 + L2W2 + (L1+L2)(W1+W2))
  // That's the cone formula. Let's use the exact frustum formula:
  // V = h/3 × (A1 + A2 + sqrt(A1 × A2))
  // But for rectangular frustum: V = h/6 × (L1W1 + L2W2 + (L1+L2)(W1+W2))
  const l1 = lengthFt; const w1 = widthFt;
  const l2 = topLength; const w2 = topWidth;
  return (depthFt / 6) * (l1 * w1 + l2 * w2 + (l1 + l2) * (w1 + w2)) / 27;
}

export function calcSeptic(input: SepticInput): SepticOutput {
  const tankSizeGal = calcTankSize(input.bedrooms, input.occupants);
  const dailyFlowGPD = calcFlowGPD(input.occupants);
  const drainfieldAreaSqFt = calcDrainfieldAreaSqFt(dailyFlowGPD, input.percRateMinPerIn);
  const drainfieldSqFtPerBedroom = drainfieldAreaSqFt / input.bedrooms;

  const trenchLengthFt = input.trenchLengthOverrideFt > 0
    ? input.trenchLengthOverrideFt
    : calcTrenchLength(drainfieldAreaSqFt, input.trenchWidthFt, input.trenchCount);

  const gravelVolumeCY = calcGravelVolumeCY(
    trenchLengthFt, input.trenchWidthFt, input.gravelDepthIn, input.pipeDiameterIn,
    input.gravelCoverOverPipeIn, input.trenchCount
  );

  const pipeLengthLF = trenchLengthFt * input.trenchCount * 1.05; // 5% extra for connections

  const trenchExcavationCY = calcTrenchExcavationCY(trenchLengthFt, input.trenchWidthFt, input.gravelDepthIn, input.trenchCount);
  const trenchExcavationLooseCY = trenchExcavationCY * input.soilSwellFactor;

  const tankExcavationCY = calcTankExcavationCY(
    input.tankExcavationLengthFt, input.tankExcavationWidthFt,
    input.tankExcavationDepthFt, input.tankSideSlope
  );
  const tankExcavationLooseCY = tankExcavationCY * input.soilSwellFactor;

  // Backfill = tank excavation - tank volume - gravel displaced by pipe
  const tankVolumeCY = (tankSizeGal * 231) / 46656; // gallons to cubic inches to cubic feet to cubic yards
  const totalBackfillCY = Math.max(0, tankExcavationCY - tankVolumeCY);
  const backfillLooseCY = totalBackfillCY * input.soilSwellFactor;

  const laborHours = (trenchExcavationCY + tankExcavationCY) * input.hoursPerCY;

  const tankCost = tankSizeGal * input.tankCostPerGal;
  const pipeCost = pipeLengthLF * input.pipeCostPerLF;
  const gravelCost = gravelVolumeCY * input.gravelCostPerCY;
  const backfillCost = backfillLooseCY * input.backfillCostPerCY;
  const pumpChamberCost = input.needsPumpChamber ? input.pumpChamberCost : 0;
  const laborCost = laborHours * input.laborRatePerHr;
  const equipmentCost = laborHours * input.excavatorRatePerHr;
  const totalCost = tankCost + pipeCost + gravelCost + backfillCost + pumpChamberCost + laborCost + equipmentCost;

  const lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }> = [
    { description: 'Septic tank', quantity: tankSizeGal, unit: 'gal', rate: input.tankCostPerGal, amount: round2(tankCost) },
    { description: 'Tank excavation', quantity: round2(tankExcavationCY), unit: 'CY', rate: 0, amount: round2(laborCost * 0.4 + equipmentCost * 0.4) },
    { description: 'Trench excavation (drainfield)', quantity: round2(trenchExcavationCY), unit: 'CY', rate: 0, amount: round2(laborCost * 0.6 + equipmentCost * 0.6) },
    { description: 'Gravel for drainfield', quantity: round2(gravelVolumeCY), unit: 'CY', rate: input.gravelCostPerCY, amount: round2(gravelCost) },
    { description: 'Perforated distribution pipe', quantity: round2(pipeLengthLF), unit: 'LF', rate: input.pipeCostPerLF, amount: round2(pipeCost) },
    { description: 'Backfill material', quantity: round2(backfillLooseCY), unit: 'CY', rate: input.backfillCostPerCY, amount: round2(backfillCost) },
  ];

  if (input.needsPumpChamber) {
    lineItems.push({
      description: 'Pump chamber (installed)',
      quantity: 1, unit: 'ea', rate: input.pumpChamberCost, amount: round2(pumpChamberCost),
    });
  }

  lineItems.push(
    { description: 'Labor', quantity: round2(laborHours), unit: 'hr', rate: input.laborRatePerHr, amount: round2(laborCost) },
    { description: 'Equipment operation', quantity: round2(laborHours), unit: 'hr', rate: input.excavatorRatePerHr, amount: round2(equipmentCost) },
  );

  return {
    tankSizeGal, dailyFlowGPD: round2(dailyFlowGPD),
    drainfieldAreaSqFt: round2(drainfieldAreaSqFt),
    drainfieldSqFtPerBedroom: round2(drainfieldSqFtPerBedroom),
    gravelVolumeCY: round2(gravelVolumeCY), pipeLengthLF: round2(pipeLengthLF),
    tankExcavationCY: round2(tankExcavationCY), tankExcavationLooseCY: round2(tankExcavationLooseCY),
    totalBackfillCY: round2(totalBackfillCY), backfillLooseCY: round2(backfillLooseCY),
    trenchExcavationCY: round2(trenchExcavationCY), trenchExcavationLooseCY: round2(trenchExcavationLooseCY),
    trenchLengthFt: round2(trenchLengthFt),
    costs: {
      tank: round2(tankCost), pipe: round2(pipeCost), gravel: round2(gravelCost),
      backfill: round2(backfillCost), pumpChamber: round2(pumpChamberCost),
      labor: round2(laborCost), equipment: round2(equipmentCost), total: round2(totalCost),
    },
    lineItems,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
