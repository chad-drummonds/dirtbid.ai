/**
 * Module A: Driveway Tests (TypeScript)
 * Tests the architect's module-a-driveway.ts exports.
 * Covers: surface area, earthwork volume, swollen volume, aggregate,
 * fabric area, grading hours, and full calcDriveway integration.
 */
import { describe, it, expect } from '@jest/globals';
import {
  calcDrivewaySurfaceArea,
  calcEarthworkVolumeCY,
  calcSwollenVolume,
  calcAggregateVolumeCY,
  calcLooseAggregateVolume,
  calcFabricAreaSY,
  calcGradingHours,
  calcDriveway,
} from '../../lib/engine/module-a-driveway';

describe('Module A: Driveway — calcDrivewaySurfaceArea', () => {
  it('calculates area for standard 12×50 driveway', () => {
    expect(calcDrivewaySurfaceArea(50, 12)).toBe(600);
  });

  it('throws for zero/invalid dimensions', () => {
    expect(() => calcDrivewaySurfaceArea(0, 10)).toThrow('positive');
    expect(() => calcDrivewaySurfaceArea(10, -1)).toThrow('positive');
  });
});

describe('Module A: Driveway — calcEarthworkVolumeCY', () => {
  it('calculates volume for 10×50×6" excavation', () => {
    // 10 * 50 * (6/12) = 250 cuft / 27 = 9.259 CY
    const vol = calcEarthworkVolumeCY(10, 50, 6);
    expect(vol).toBeCloseTo(9.259, 2);
  });

  it('calculates volume for deep 20×30×96" excavation', () => {
    const vol = calcEarthworkVolumeCY(20, 30, 96);
    expect(vol).toBeCloseTo(177.78, 1);
  });
});

describe('Module A: Driveway — calcSwollenVolume', () => {
  it('applies swell factor for clay (1.30)', () => {
    expect(calcSwollenVolume(100, 1.30)).toBe(130);
  });

  it('applies swell factor for rock (1.50)', () => {
    expect(calcSwollenVolume(200, 1.50)).toBe(300);
  });

  it('throws for zero/negative swell factor', () => {
    expect(() => calcSwollenVolume(100, 0)).toThrow('positive');
    expect(() => calcSwollenVolume(100, -1)).toThrow('positive');
  });
});

describe('Module A: Driveway — calcAggregateVolumeCY', () => {
  it('calculates aggregate for 12×50×6" base', () => {
    // 12 * 50 * (6/12) / 27 = 300 / 27 = 11.111 CY
    const vol = calcAggregateVolumeCY(12, 50, 6);
    expect(vol).toBeCloseTo(11.11, 1);
  });
});

describe('Module A: Driveway — calcLooseAggregateVolume', () => {
  it('applies compaction factor', () => {
    expect(calcLooseAggregateVolume(100, 1.15)).toBeCloseTo(115, 5);
  });

  it('throws for zero/negative compaction factor', () => {
    expect(() => calcLooseAggregateVolume(100, 0)).toThrow('positive');
  });
});

describe('Module A: Driveway — calcFabricAreaSY', () => {
  it('calculates fabric for 12×50 with 6" overlap each side', () => {
    // (50 + 2*0.5) * (12 + 2*0.5) / 9 = 51*13/9 = 663/9 = 73.67 SY
    const area = calcFabricAreaSY(50, 12, 6);
    expect(area).toBeCloseTo(73.67, 1);
  });

  it('handles no overlap', () => {
    const area = calcFabricAreaSY(50, 12, 0);
    expect(area).toBe(600 / 9); // 66.67 SY
  });
});

describe('Module A: Driveway — calcGradingHours', () => {
  it('calculates hours for 720 sqft at 2 hrs/1000sqft', () => {
    expect(calcGradingHours(720, 2)).toBe(1.44); // 720/1000 * 2
  });
});

describe('Module A: Driveway — calcDriveway integration', () => {
  it('returns complete driveway calculation with all fields', () => {
    const result = calcDriveway({
      lengthFt: 60,
      widthFt: 12,
      depthIn: 8,
      baseLayers: 1,
      baseThicknessIn: 6,
      subBaseThicknessIn: 0,
      needsFabric: true,
      fabricOverlapIn: 6,
      slopePercent: 2,
      soilSwellFactor: 1.25,
      compactionFactor: 1.15,
      baseAggregateCostPerCY: 35,
      subBaseAggregateCostPerCY: 0,
      fabricCostPerSY: 4.5,
      laborRatePerHr: 65,
      equipmentRatePerHr: 95,
      hoursPer1000SqFt: 3,
    });

    // surface = 60*12 = 720 sqft
    expect(result.surfaceAreaSqFt).toBe(720);
    // earthwork = 720 * (8/12) / 27 = 480/27 = 17.78 CY
    expect(result.earthworkVolumeCY).toBeCloseTo(17.78, 1);
    expect(result.earthworkSwollenCY).toBeCloseTo(22.22, 1);
    // baseVolume = 720 * (6/12) / 27 = 360/27 = 13.33 CY
    expect(result.baseVolumeCY).toBeCloseTo(13.33, 1);
    expect(result.fabricAreaSY).toBeGreaterThan(0);
    expect(result.gradingHours).toBeCloseTo(2.16, 1);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.lineItems.length).toBeGreaterThan(3);
  });

  it('handles 2-layer base with sub-base', () => {
    const result = calcDriveway({
      lengthFt: 50, widthFt: 10, depthIn: 8,
      baseLayers: 2, baseThicknessIn: 6, subBaseThicknessIn: 4,
      needsFabric: false, fabricOverlapIn: 0, slopePercent: 2,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      baseAggregateCostPerCY: 35, subBaseAggregateCostPerCY: 28,
      fabricCostPerSY: 0, laborRatePerHr: 65, equipmentRatePerHr: 95,
      hoursPer1000SqFt: 3,
    });

    expect(result.subBaseVolumeCY).toBeGreaterThan(0);
    expect(result.totalAggregateLooseCY).toBeGreaterThan(result.baseVolumeCY);
    expect(result.lineItems.some(li => li.description.includes('Sub-base'))).toBe(true);
  });

  // Boundary: near-zero values
  it('handles minimum dimensions', () => {
    const result = calcDriveway({
      lengthFt: 5, widthFt: 4, depthIn: 4,
      baseLayers: 1, baseThicknessIn: 4, subBaseThicknessIn: 0,
      needsFabric: false, fabricOverlapIn: 0, slopePercent: 0,
      soilSwellFactor: 1.0, compactionFactor: 1.0,
      baseAggregateCostPerCY: 1, subBaseAggregateCostPerCY: 0,
      fabricCostPerSY: 0, laborRatePerHr: 1, equipmentRatePerHr: 1,
      hoursPer1000SqFt: 1,
    });
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.surfaceAreaSqFt).toBe(20);
  });

  // Error cases
  it('throws for zero length', () => {
    expect(() => calcDriveway({
      lengthFt: 0, widthFt: 10, depthIn: 8,
      baseLayers: 1, baseThicknessIn: 6, subBaseThicknessIn: 0,
      needsFabric: false, fabricOverlapIn: 0, slopePercent: 0,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      baseAggregateCostPerCY: 35, subBaseAggregateCostPerCY: 0,
      fabricCostPerSY: 0, laborRatePerHr: 65, equipmentRatePerHr: 95,
      hoursPer1000SqFt: 3,
    })).toThrow('positive');
  });
});