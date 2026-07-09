/**
 * Module E: Hauling Tests (TypeScript)
 * Tests the architect's module-e-hauling.ts exports.
 * Covers all soil types, truckload ceiling (volume vs weight), cycle-time costing.
 */
import { describe, it, expect } from '@jest/globals';
import {
  bankToLoose, looseToCompacted, bankToCompacted,
  calcTotalWeightTons, calcTruckLoads, calcCycleTimeMinutes,
  calcTripsPerDay, calcTotalHours, calcTripFuelCost,
  calcHauling, SOIL_FACTORS,
} from '../../lib/engine/module-e-hauling';

describe('Module E: Hauling — SOIL_FACTORS', () => {
  it('has all 7 soil types', () => {
    const types = Object.keys(SOIL_FACTORS);
    expect(types).toContain('clay');
    expect(types).toContain('sand');
    expect(types).toContain('gravel');
    expect(types).toContain('rock');
    expect(types).toContain('topsoil');
    expect(types).toContain('silt');
    expect(types).toContain('common-earth');
  });

  it('all swell factors are >= 1.0', () => {
    for (const s of Object.values(SOIL_FACTORS)) {
      expect(s.swellFactor).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('rock has highest swell factor', () => {
    expect(SOIL_FACTORS.rock.swellFactor).toBe(1.55);
  });
});

describe('Module E: Hauling — bankToLoose', () => {
  it('converts 100 bank CY of clay (1.30) → 130 LCY', () => {
    expect(bankToLoose(100, 1.30)).toBe(130);
  });

  it('throws for negative volume', () => {
    expect(() => bankToLoose(-1, 1.25)).toThrow('negative');
  });

  it('throws for zero/negative swell factor', () => {
    expect(() => bankToLoose(100, 0)).toThrow('positive');
  });
});

describe('Module E: Hauling — looseToCompacted', () => {
  it('converts 100 LCY with comp 1.20 → 83.33 CY', () => {
    expect(looseToCompacted(100, 1.20)).toBeCloseTo(83.33, 1);
  });
});

describe('Module E: Hauling — bankToCompacted', () => {
  it('100 BCY clay: 100*1.30/1.20 = 108.33', () => {
    expect(bankToCompacted(100, 1.30, 1.20)).toBeCloseTo(108.33, 1);
  });
});

describe('Module E: Hauling — calcTotalWeightTons', () => {
  it('100 CY clay (2400 lbs/CY) = 120 tons', () => {
    expect(calcTotalWeightTons(100, 2400)).toBe(120);
  });

  it('100 CY rock (4000 lbs/CY) = 200 tons', () => {
    expect(calcTotalWeightTons(100, 4000)).toBe(200);
  });
});

describe('Module E: Hauling — calcTruckLoads', () => {
  it('volume-limited: 125 LCY / 12 cap = 11 loads', () => {
    // 125 LCY at 12 CY/load, 160 tons at 20 tons/load = 8 loads
    // max = max(11, 8) = 11
    expect(calcTruckLoads(125, 12, 160, 20)).toBe(11);
  });

  it('weight-limited: heavy material', () => {
    // 200 tons at 20 tons/load = 10 loads, 150 LCY at 12 = 13 loads
    // max(13, 10) = 13
    expect(calcTruckLoads(150, 12, 200, 20)).toBe(13);
  });

  it('throws for zero capacity', () => {
    expect(() => calcTruckLoads(100, 0, 50, 20)).toThrow('positive');
    expect(() => calcTruckLoads(100, 12, 50, 0)).toThrow('positive');
  });
});

describe('Module E: Hauling — calcCycleTimeMinutes', () => {
  it('10 miles at 30 mph load + 5 load + 3 dump = 48 min', () => {
    const result = calcCycleTimeMinutes({
      haulDistanceMiles: 10, speedLoadedMph: 30, speedEmptyMph: 30,
      loadTimeMin: 5, dumpTimeMin: 3,
    });
    // travel = (10/30*60)*2 = 40, +5+3 = 48
    expect(result).toBe(48);
  });

  it('handles different loaded/empty speeds', () => {
    // 10/25*60=24 loaded + 10/35*60=17.14 empty + 5+3 = 49.14
    const result = calcCycleTimeMinutes({
      haulDistanceMiles: 10, speedLoadedMph: 25, speedEmptyMph: 35,
      loadTimeMin: 5, dumpTimeMin: 3,
    });
    expect(result).toBeCloseTo(49.14, 1);
  });

  it('throws for negative distance', () => {
    expect(() => calcCycleTimeMinutes({
      haulDistanceMiles: -1, speedLoadedMph: 30, speedEmptyMph: 30,
      loadTimeMin: 5, dumpTimeMin: 3,
    })).toThrow('negative');
  });
});

describe('Module E: Hauling — calcTripsPerDay', () => {
  it('48 min cycle → 10 trips per day (480/48 = 10)', () => {
    expect(calcTripsPerDay(48)).toBe(10);
  });
});

describe('Module E: Hauling — calcTotalHours', () => {
  it('11 loads × 48 min / 1 truck / 60 = 8.8 hrs', () => {
    expect(calcTotalHours(11, 48, 1)).toBeCloseTo(8.8, 1);
  });

  it('2 trucks cuts hours in half', () => {
    expect(calcTotalHours(11, 48, 2)).toBeCloseTo(4.4, 1);
  });
});

describe('Module E: Hauling — calcTripFuelCost', () => {
  it('10 mi round trip: 10/5 + 10/6 = 3.67 gal × $4 = $14.67', () => {
    const cost = calcTripFuelCost(10, 5, 6, 4);
    expect(cost).toBeCloseTo(14.67, 1);
  });
});

describe('Module E: Hauling — calcHauling integration', () => {
  it('returns complete hauling calculation for clay', () => {
    const result = calcHauling({
      bankVolumeCY: 200, soilType: 'clay',
      swellFactorOverride: 0, compactionFactorOverride: 0,
      truckCapacityLCY: 12, truckPayloadTons: 20,
      haulDistanceMiles: 10, avgSpeedLoadedMph: 30, avgSpeedEmptyMph: 35,
      loadTimeMinutes: 5, dumpTimeMinutes: 3,
      truckOpCostPerHr: 45, driverWagePerHr: 28, truckCount: 1,
      fuelCostPerGal: 4, fuelConsumptionLoadedMPG: 5, fuelConsumptionEmptyMPG: 6,
      profitMarginPercent: 15,
    });

    // Clay: swell=1.30, 200→260 LCY
    expect(result.swellFactorUsed).toBe(1.30);
    expect(result.looseVolumeLCY).toBe(260);
    // Rock density 4000, clay 2400
    // Weight: 200 * 2400 / 2000 = 240 tons
    expect(result.totalWeightTons).toBe(240);
    // Loads: max(260/12=22, 240/20=12) = 22
    expect(result.truckLoads).toBe(22);
    expect(result.cycleTimeMinutes).toBeCloseTo(45.14, 1);
    expect(result.costs.totalHauling).toBeGreaterThan(0);
    expect(result.costs.truckOperation).toBeGreaterThan(0);
    expect(result.costs.driverWages).toBeGreaterThan(0);
    expect(result.costs.fuel).toBeGreaterThan(0);
  });

  it('calculates for rock (heaviest material)', () => {
    const result = calcHauling({
      bankVolumeCY: 200, soilType: 'rock',
      swellFactorOverride: 0, compactionFactorOverride: 0,
      truckCapacityLCY: 12, truckPayloadTons: 20,
      haulDistanceMiles: 5, avgSpeedLoadedMph: 25, avgSpeedEmptyMph: 30,
      loadTimeMinutes: 5, dumpTimeMinutes: 3,
      truckOpCostPerHr: 45, driverWagePerHr: 28, truckCount: 2,
      fuelCostPerGal: 4, fuelConsumptionLoadedMPG: 4, fuelConsumptionEmptyMPG: 5,
      profitMarginPercent: 15,
    });

    expect(result.swellFactorUsed).toBe(1.55);
    expect(result.looseVolumeLCY).toBe(310);
    expect(result.totalWeightTons).toBe(400); // 200*4000/2000
    expect(result.truckLoads).toBeGreaterThan(0);
    expect(result.costs.totalHauling).toBeGreaterThan(0);
  });

  it('uses override factors when provided', () => {
    const result = calcHauling({
      bankVolumeCY: 100, soilType: 'common-earth',
      swellFactorOverride: 1.10, compactionFactorOverride: 1.05,
      truckCapacityLCY: 12, truckPayloadTons: 20,
      haulDistanceMiles: 3, avgSpeedLoadedMph: 30, avgSpeedEmptyMph: 35,
      loadTimeMinutes: 4, dumpTimeMinutes: 2,
      truckOpCostPerHr: 45, driverWagePerHr: 28, truckCount: 1,
      fuelCostPerGal: 4, fuelConsumptionLoadedMPG: 5, fuelConsumptionEmptyMPG: 6,
      profitMarginPercent: 10,
    });

    expect(result.swellFactorUsed).toBe(1.10);
    expect(result.looseVolumeLCY).toBe(110);
  });

  it('handles zero truck capacity gracefully', () => {
    const result = calcHauling({
      bankVolumeCY: 100, soilType: 'sand',
      swellFactorOverride: 0, compactionFactorOverride: 0,
      truckCapacityLCY: 0, truckPayloadTons: 0,
      haulDistanceMiles: 0, avgSpeedLoadedMph: 0, avgSpeedEmptyMph: 0,
      loadTimeMinutes: 0, dumpTimeMinutes: 0,
      truckOpCostPerHr: 0, driverWagePerHr: 0, truckCount: 0,
      fuelCostPerGal: 0, fuelConsumptionLoadedMPG: 0, fuelConsumptionEmptyMPG: 0,
      profitMarginPercent: 0,
    });
    expect(result.truckLoads).toBe(0);
    expect(result.looseVolumeLCY).toBeGreaterThan(0);
  });
});