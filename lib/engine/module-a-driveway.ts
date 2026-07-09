// =============================================================================
// Module A: Driveways & Access Roads
// =============================================================================
// Covers grading volume, base aggregate requirements, geotextile fabric area,
// surface course materials, and compaction factors for residential/commercial
// driveways and access roads used by heavy equipment.

export interface DrivewayInput {
  /** Total driveway length in feet */
  lengthFt: number;
  /** Driveway width in feet (typical: 10-16 for residential, 12-20 for access) */
  widthFt: number;
  /** Depth of total excavation/grading in inches (typical: 8-12 for residential) */
  depthIn: number;
  /** Number of base aggregate layers (1 = base only, 2 = base + sub-base) */
  baseLayers: 1 | 2;
  /** Thickness of base aggregate layer in inches */
  baseThicknessIn: number;
  /** Thickness of sub-base aggregate layer in inches (if baseLayers === 2) */
  subBaseThicknessIn: number;
  /** Does the driveway require geotextile fabric? */
  needsFabric: boolean;
  /** Fabric overlap on edges in inches (typical: 6-12) */
  fabricOverlapIn: number;
  /** Slope percentage (0 = flat, typical: 2-8 for drainage) */
  slopePercent: number;
  /** Soil swell factor (1.0 = no swell, typical: 1.1-1.4 for common soils) */
  soilSwellFactor: number;
  /** Compaction factor (1.0 = no compaction, typical: 1.15-1.25 for aggregates) */
  compactionFactor: number;
  /** Cost per cubic yard of base aggregate in dollars */
  baseAggregateCostPerCY: number;
  /** Cost per cubic yard of sub-base aggregate in dollars */
  subBaseAggregateCostPerCY: number;
  /** Cost per square yard of geotextile fabric in dollars */
  fabricCostPerSY: number;
  /** Labor rate for grading operation in dollars per hour */
  laborRatePerHr: number;
  /** Equipment hourly rate (dozer/grader) in dollars per hour */
  equipmentRatePerHr: number;
  /** Estimated hours of grading per 1000 sq ft */
  hoursPer1000SqFt: number;
}

export interface DrivewayOutput {
  surfaceAreaSqFt: number;
  earthworkVolumeCY: number;
  earthworkSwollenCY: number;
  baseVolumeCY: number;
  subBaseVolumeCY: number;
  totalAggregateLooseCY: number;
  fabricAreaSY: number;
  gradingHours: number;
  materialCosts: {
    baseAggregate: number;
    subBaseAggregate: number;
    fabric: number;
    total: number;
  };
  laborCosts: { grading: number; total: number };
  equipmentCosts: { grading: number; total: number };
  totalCost: number;
  lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }>;
}

export function calcDrivewaySurfaceArea(lengthFt: number, widthFt: number): number {
  if (lengthFt <= 0 || widthFt <= 0) throw new Error('Length and width must be positive');
  return lengthFt * widthFt;
}

export function calcEarthworkVolumeCY(lengthFt: number, widthFt: number, depthIn: number): number {
  const depthFt = depthIn / 12;
  return (lengthFt * widthFt * depthFt) / 27;
}

export function calcSwollenVolume(bankVolumeCY: number, swellFactor: number): number {
  if (swellFactor <= 0) throw new Error('Swell factor must be positive');
  return bankVolumeCY * swellFactor;
}

export function calcAggregateVolumeCY(lengthFt: number, widthFt: number, thicknessIn: number): number {
  const thicknessFt = thicknessIn / 12;
  return (lengthFt * widthFt * thicknessFt) / 27;
}

export function calcLooseAggregateVolume(compactedCY: number, compactionFactor: number): number {
  if (compactionFactor <= 0) throw new Error('Compaction factor must be positive');
  return compactedCY * compactionFactor;
}

export function calcFabricAreaSY(lengthFt: number, widthFt: number, overlapIn: number): number {
  const overlapFt = overlapIn / 12;
  return ((lengthFt + 2 * overlapFt) * (widthFt + 2 * overlapFt)) / 9;
}

export function calcGradingHours(surfaceAreaSqFt: number, hoursPer1000SqFt: number): number {
  return (surfaceAreaSqFt / 1000) * hoursPer1000SqFt;
}

export function calcDriveway(input: DrivewayInput): DrivewayOutput {
  if (input.lengthFt <= 0) throw new Error('Driveway length must be positive');
  if (input.widthFt <= 0) throw new Error('Driveway width must be positive');
  if (input.depthIn <= 0) throw new Error('Depth must be positive');

  const surfaceAreaSqFt = calcDrivewaySurfaceArea(input.lengthFt, input.widthFt);
  const earthworkVolumeCY = calcEarthworkVolumeCY(input.lengthFt, input.widthFt, input.depthIn);
  const earthworkSwollenCY = calcSwollenVolume(earthworkVolumeCY, input.soilSwellFactor);

  const baseVolumeCompactedCY = calcAggregateVolumeCY(input.lengthFt, input.widthFt, input.baseThicknessIn);
  const baseVolumeLooseCY = calcLooseAggregateVolume(baseVolumeCompactedCY, input.compactionFactor);

  let subBaseVolumeCY = 0;
  let subBaseLooseCY = 0;
  if (input.baseLayers === 2) {
    const subBaseCompacted = calcAggregateVolumeCY(input.lengthFt, input.widthFt, input.subBaseThicknessIn);
    subBaseVolumeCY = subBaseCompacted;
    subBaseLooseCY = calcLooseAggregateVolume(subBaseCompacted, input.compactionFactor);
  }

  const totalAggregateLooseCY = baseVolumeLooseCY + subBaseLooseCY;
  const fabricAreaSY = input.needsFabric ? calcFabricAreaSY(input.lengthFt, input.widthFt, input.fabricOverlapIn) : 0;
  const gradingHours = calcGradingHours(surfaceAreaSqFt, input.hoursPer1000SqFt);

  const baseAggregateCost = baseVolumeLooseCY * input.baseAggregateCostPerCY;
  const subBaseAggregateCost = subBaseLooseCY * input.subBaseAggregateCostPerCY;
  const fabricCost = fabricAreaSY * input.fabricCostPerSY;
  const totalMaterialCost = baseAggregateCost + subBaseAggregateCost + fabricCost;

  const gradingLaborCost = gradingHours * input.laborRatePerHr;
  const gradingEquipmentCost = gradingHours * input.equipmentRatePerHr;
  const totalCost = totalMaterialCost + gradingLaborCost + gradingEquipmentCost;

  const lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }> = [];

  lineItems.push({
    description: 'Earthwork excavation & grading',
    quantity: earthworkVolumeCY,
    unit: 'CY',
    rate: input.laborRatePerHr + input.equipmentRatePerHr,
    amount: gradingLaborCost + gradingEquipmentCost,
  });

  lineItems.push({
    description: 'Base aggregate (compacted)',
    quantity: baseVolumeLooseCY,
    unit: 'CY',
    rate: input.baseAggregateCostPerCY,
    amount: baseAggregateCost,
  });

  if (input.baseLayers === 2) {
    lineItems.push({
      description: 'Sub-base aggregate (compacted)',
      quantity: subBaseLooseCY,
      unit: 'CY',
      rate: input.subBaseAggregateCostPerCY,
      amount: subBaseAggregateCost,
    });
  }

  if (input.needsFabric) {
    lineItems.push({
      description: 'Geotextile fabric (installed)',
      quantity: fabricAreaSY,
      unit: 'SY',
      rate: input.fabricCostPerSY,
      amount: fabricCost,
    });
  }

  lineItems.push({
    description: 'Grading labor',
    quantity: gradingHours,
    unit: 'hr',
    rate: input.laborRatePerHr,
    amount: gradingLaborCost,
  });

  lineItems.push({
    description: 'Equipment operation',
    quantity: gradingHours,
    unit: 'hr',
    rate: input.equipmentRatePerHr,
    amount: gradingEquipmentCost,
  });

  return {
    surfaceAreaSqFt: round2(surfaceAreaSqFt),
    earthworkVolumeCY: round2(earthworkVolumeCY),
    earthworkSwollenCY: round2(earthworkSwollenCY),
    baseVolumeCY: round2(baseVolumeCompactedCY),
    subBaseVolumeCY: round2(subBaseVolumeCY),
    totalAggregateLooseCY: round2(totalAggregateLooseCY),
    fabricAreaSY: round2(fabricAreaSY),
    gradingHours: round2(gradingHours),
    materialCosts: {
      baseAggregate: round2(baseAggregateCost),
      subBaseAggregate: round2(subBaseAggregateCost),
      fabric: round2(fabricCost),
      total: round2(totalMaterialCost),
    },
    laborCosts: { grading: round2(gradingLaborCost), total: round2(gradingLaborCost) },
    equipmentCosts: { grading: round2(gradingEquipmentCost), total: round2(gradingEquipmentCost) },
    totalCost: round2(totalCost),
    lineItems,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
