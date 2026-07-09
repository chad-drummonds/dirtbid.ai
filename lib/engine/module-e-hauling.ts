// =============================================================================
// Module E: Dynamic Hauling & Soil Volume Mechanics
// =============================================================================
// Covers swell and compaction factors for all common soil types,
// truck load calculation, cycle-time based costing, haul road
// speed/distance optimization, and material balance (cut/fill).

export type SoilType = 'clay' | 'silt' | 'sand' | 'gravel' | 'topsoil' | 'rock' | 'common-earth';

/** Reference swell and compaction factors by soil type (USACE/national standards) */
export const SOIL_FACTORS: Record<SoilType, { swellFactor: number; compactionFactor: number; densityLbsPerCY: number }> = {
  'clay':            { swellFactor: 1.30, compactionFactor: 1.20, densityLbsPerCY: 2400 },
  'silt':            { swellFactor: 1.25, compactionFactor: 1.15, densityLbsPerCY: 2200 },
  'sand':            { swellFactor: 1.15, compactionFactor: 1.10, densityLbsPerCY: 2700 },
  'gravel':          { swellFactor: 1.12, compactionFactor: 1.08, densityLbsPerCY: 3000 },
  'topsoil':         { swellFactor: 1.35, compactionFactor: 1.25, densityLbsPerCY: 1800 },
  'rock':            { swellFactor: 1.55, compactionFactor: 1.40, densityLbsPerCY: 4000 },
  'common-earth':    { swellFactor: 1.25, compactionFactor: 1.15, densityLbsPerCY: 2500 },
};

export interface HaulingInput {
  /** Material volume to haul in cubic yards (bank measure) */
  bankVolumeCY: number;
  /** Soil type for swell/compaction/density factors */
  soilType: SoilType;
  /** Override swell factor (0 = use soil type default) */
  swellFactorOverride: number;
  /** Override compaction factor (0 = use soil type default) */
  compactionFactorOverride: number;
  /** Truck capacity in loose cubic yards */
  truckCapacityLCY: number;
  /** Truck payload capacity in tons */
  truckPayloadTons: number;
  /** One-way haul distance in miles */
  haulDistanceMiles: number;
  /** Average haul speed loaded in mph */
  avgSpeedLoadedMph: number;
  /** Average haul speed empty in mph */
  avgSpeedEmptyMph: number;
  /** Load time per truck in minutes */
  loadTimeMinutes: number;
  /** Dump time per truck in minutes */
  dumpTimeMinutes: number;
  /** Truck hourly operating cost (fuel, maintenance, tires) */
  truckOpCostPerHr: number;
  /** Truck driver hourly wage */
  driverWagePerHr: number;
  /** Number of trucks available */
  truckCount: number;
  /** Fuel cost per gallon */
  fuelCostPerGal: number;
  /** Estimated truck fuel consumption in miles per gallon (loaded) */
  fuelConsumptionLoadedMPG: number;
  /** Estimated truck fuel consumption in miles per gallon (empty) */
  fuelConsumptionEmptyMPG: number;
  /** Profit margin percentage for line items */
  profitMarginPercent: number;
}

export interface HaulingOutput {
  /** Swell factor used (either override or soil type default) */
  swellFactorUsed: number;
  /** Compaction factor used */
  compactionFactorUsed: number;
  /** Loose cubic yards to be hauled */
  looseVolumeLCY: number;
  /** Compacted volume in cubic yards */
  compactedVolumeCY: number;
  /** Total weight of material in tons */
  totalWeightTons: number;
  /** Number of truck loads required */
  truckLoads: number;
  /** Cycle time per truck in minutes */
  cycleTimeMinutes: number;
  /** Trips per truck per day (8-hr shift) */
  tripsPerTruckPerDay: number;
  /** Total hours for all trucks */
  totalHours: number;
  /** Total hours per truck */
  hoursPerTruck: number;
  /** Hauling cost breakdown */
  costs: {
    truckOperation: number;
    driverWages: number;
    fuel: number;
    totalHauling: number;
    totalHaulingPerCY: number;
  };
  /** Line items for bid */
  lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }>;
}

export interface CycleTimeInput {
  haulDistanceMiles: number;
  speedLoadedMph: number;
  speedEmptyMph: number;
  loadTimeMin: number;
  dumpTimeMin: number;
}

/**
 * Convert bank measure CY to loose CY using swell factor.
 * V_loose = V_bank × swellFactor
 */
export function bankToLoose(bankCY: number, swellFactor: number): number {
  if (bankCY < 0) throw new Error('Volume cannot be negative');
  if (swellFactor <= 0) throw new Error('Swell factor must be positive');
  return bankCY * swellFactor;
}

/**
 * Convert loose CY to compacted CY using compaction factor.
 * V_compacted = V_loose / compactionFactor
 */
export function looseToCompacted(looseCY: number, compactionFactor: number): number {
  if (looseCY < 0) throw new Error('Volume cannot be negative');
  if (compactionFactor <= 0) throw new Error('Compaction factor must be positive');
  return looseCY / compactionFactor;
}

/**
 * Convert bank CY directly to compacted CY.
 * V_compacted = V_bank × swellFactor / compactionFactor
 */
export function bankToCompacted(bankCY: number, swellFactor: number, compactionFactor: number): number {
  return looseToCompacted(bankToLoose(bankCY, swellFactor), compactionFactor);
}

/**
 * Calculate total weight in tons from bank volume and soil density.
 */
export function calcTotalWeightTons(bankVolumeCY: number, densityLbsPerCY: number): number {
  return (bankVolumeCY * densityLbsPerCY) / 2000;
}

/**
 * Calculate number of truck loads needed.
 * Loads = max(ceil(looseCY / truckCapacityLCY), ceil(weightTons / payloadTons))
 */
export function calcTruckLoads(looseCY: number, capacityLCY: number, weightTons: number, payloadTons: number): number {
  if (capacityLCY <= 0) throw new Error('Truck capacity must be positive');
  if (payloadTons <= 0) throw new Error('Payload must be positive');
  return Math.max(Math.ceil(looseCY / capacityLCY), Math.ceil(weightTons / payloadTons));
}

/**
 * Calculate cycle time in minutes.
 * Cycle = load + (distance/speed_loaded × 60) + dump + (distance/speed_empty × 60)
 */
export function calcCycleTimeMinutes(input: CycleTimeInput): number {
  if (input.haulDistanceMiles < 0) throw new Error('Haul distance cannot be negative');
  if (input.speedLoadedMph <= 0 || input.speedEmptyMph <= 0) throw new Error('Speed must be positive');
  if (input.loadTimeMin < 0 || input.dumpTimeMin < 0) throw new Error('Time cannot be negative');

  const travelLoadedMin = (input.haulDistanceMiles / input.speedLoadedMph) * 60;
  const travelEmptyMin = (input.haulDistanceMiles / input.speedEmptyMph) * 60;

  return input.loadTimeMin + travelLoadedMin + input.dumpTimeMin + travelEmptyMin;
}

/**
 * Calculate trips per truck per day (8-hr shift, 480 minutes).
 */
export function calcTripsPerDay(cycleMinutes: number, shiftMinutes: number = 480): number {
  if (cycleMinutes <= 0) throw new Error('Cycle time must be positive');
  return Math.floor(shiftMinutes / cycleMinutes);
}

/**
 * Calculate total hauling hours.
 */
export function calcTotalHours(loads: number, cycleMinutes: number, truckCount: number): number {
  if (truckCount <= 0) throw new Error('Truck count must be positive');
  // Total truck-minutes = loads × cycle / truckCount (parallel)
  const totalTruckMinutes = (loads * cycleMinutes) / truckCount;
  return totalTruckMinutes / 60;
}

/**
 * Calculate fuel cost for one round trip.
 */
export function calcTripFuelCost(
  distanceMiles: number, loadedMPG: number, emptyMPG: number, fuelCostPerGal: number
): number {
  if (loadedMPG <= 0 || emptyMPG <= 0) throw new Error('Fuel consumption must be positive');
  const fuelLoaded = distanceMiles / loadedMPG;
  const fuelEmpty = distanceMiles / emptyMPG;
  return (fuelLoaded + fuelEmpty) * fuelCostPerGal;
}

/**
 * Complete hauling calculation.
 */
export function calcHauling(input: HaulingInput): HaulingOutput {
  const swellFactor = input.swellFactorOverride > 0 ? input.swellFactorOverride : SOIL_FACTORS[input.soilType].swellFactor;
  const compactionFactor = input.compactionFactorOverride > 0 ? input.compactionFactorOverride : SOIL_FACTORS[input.soilType].compactionFactor;
  const density = SOIL_FACTORS[input.soilType].densityLbsPerCY;

  const looseVolumeLCY = bankToLoose(input.bankVolumeCY, swellFactor);
  const compactedVolumeCY = looseToCompacted(looseVolumeLCY, compactionFactor);
  const totalWeightTons = calcTotalWeightTons(input.bankVolumeCY, density);

  // If capacity is zero, just skip hauling calc
  const truckLoads = input.truckCapacityLCY > 0
    ? calcTruckLoads(looseVolumeLCY, input.truckCapacityLCY, totalWeightTons, input.truckPayloadTons)
    : 0;

  let cycleTimeMinutes = 0;
  let tripsPerTruckPerDay = 0;
  let totalHours = 0;
  let hoursPerTruck = 0;
  let truckOpCost = 0;
  let tripFuelCost = 0;
  let driverWages = 0;
  let fuelCost = 0;

  if (truckLoads > 0 && input.truckCount > 0) {
    cycleTimeMinutes = calcCycleTimeMinutes({
      haulDistanceMiles: input.haulDistanceMiles,
      speedLoadedMph: input.avgSpeedLoadedMph,
      speedEmptyMph: input.avgSpeedEmptyMph,
      loadTimeMin: input.loadTimeMinutes,
      dumpTimeMin: input.dumpTimeMinutes,
    });

    tripsPerTruckPerDay = calcTripsPerDay(cycleTimeMinutes);
    totalHours = calcTotalHours(truckLoads, cycleTimeMinutes, input.truckCount);
    hoursPerTruck = totalHours / input.truckCount;

    truckOpCost = totalHours * input.truckOpCostPerHr;
    driverWages = totalHours * input.driverWagePerHr;

    tripFuelCost = calcTripFuelCost(
      input.haulDistanceMiles,
      input.fuelConsumptionLoadedMPG,
      input.fuelConsumptionEmptyMPG,
      input.fuelCostPerGal
    );
    fuelCost = tripFuelCost * truckLoads;
  }

  const totalHauling = truckOpCost + driverWages + fuelCost;
  const totalHaulingPerCY = input.bankVolumeCY > 0 ? totalHauling / input.bankVolumeCY : 0;

  const lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }> = [
    { description: `Haul ${input.soilType} (loose)`, quantity: round2(looseVolumeLCY), unit: 'LCY', rate: 0, amount: round2(totalHauling) },
    { description: `Swell factor used`, quantity: swellFactor, unit: '', rate: 0, amount: 0 },
  ];

  if (truckLoads > 0) {
    lineItems.push({ description: 'Truck loads', quantity: truckLoads, unit: 'loads', rate: 0, amount: 0 });
    lineItems.push({ description: 'Cycle time', quantity: round2(cycleTimeMinutes), unit: 'min', rate: 0, amount: 0 });
    lineItems.push({ description: 'Truck operation', quantity: round2(totalHours), unit: 'hr', rate: input.truckOpCostPerHr, amount: round2(truckOpCost) });
    lineItems.push({ description: 'Driver wages', quantity: round2(totalHours), unit: 'hr', rate: input.driverWagePerHr, amount: round2(driverWages) });
    lineItems.push({ description: 'Fuel cost', quantity: truckLoads, unit: 'trips', rate: round2(tripFuelCost / (truckLoads || 1)), amount: round2(fuelCost) });
  }

  lineItems.push({ description: 'Total hauling cost per CY (bank)', quantity: 1, unit: 'CY', rate: round2(totalHaulingPerCY), amount: round2(totalHauling) });

  return {
    swellFactorUsed: swellFactor,
    compactionFactorUsed: compactionFactor,
    looseVolumeLCY: round2(looseVolumeLCY),
    compactedVolumeCY: round2(compactedVolumeCY),
    totalWeightTons: round2(totalWeightTons),
    truckLoads,
    cycleTimeMinutes: round2(cycleTimeMinutes),
    tripsPerTruckPerDay,
    totalHours: round2(totalHours),
    hoursPerTruck: round2(hoursPerTruck),
    costs: {
      truckOperation: round2(truckOpCost),
      driverWages: round2(driverWages),
      fuel: round2(fuelCost),
      totalHauling: round2(totalHauling),
      totalHaulingPerCY: round2(totalHaulingPerCY),
    },
    lineItems,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
