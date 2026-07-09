/**
 * Module D: Basement/Pond Tests (TypeScript)
 * Tests the architect's module-d-basements.ts exports.
 */
import { describe, it, expect } from '@jest/globals';
import {
  calcSimpleBoxVolumeCY, calcSlopedExcavationCY, calcBenchExcavationCY,
  calcClayLinerVolumeCY, calcBasement,
} from '../../lib/engine/module-d-basements';

describe('Module D: Basement — calcSimpleBoxVolumeCY', () => {
  it('calculates 40×30×8ft = 9600/27 = 355.56 CY', () => {
    expect(calcSimpleBoxVolumeCY(40, 30, 8)).toBeCloseTo(355.56, 1);
  });
});

describe('Module D: Basement — calcSlopedExcavationCY', () => {
  it('calculates sloped excavation (larger than simple box)', () => {
    const sloped = calcSlopedExcavationCY(40, 30, 8, 1.0);
    const simple = calcSimpleBoxVolumeCY(40, 30, 8);
    expect(sloped).toBeGreaterThan(simple);
  });

  it('equals simple box when slope=0', () => {
    expect(calcSlopedExcavationCY(40, 30, 8, 0))
      .toBeCloseTo(calcSimpleBoxVolumeCY(40, 30, 8), 2);
  });
});

describe('Module D: Basement — calcBenchExcavationCY', () => {
  it('returns sloped volume when benchCount=0', () => {
    const bench = calcBenchExcavationCY(40, 30, 8, 0, 0, 1.0);
    const sloped = calcSlopedExcavationCY(40, 30, 8, 1.0);
    expect(bench).toBeCloseTo(sloped, 1);
  });
});

describe('Module D: Basement — calcClayLinerVolumeCY', () => {
  it('calculates clay liner for rectangular excavation', () => {
    const vol = calcClayLinerVolumeCY(40, 30, 8, 12, 1.0);
    expect(vol).toBeGreaterThan(0);
  });

  it('requires more liner for thicker clay', () => {
    const thin = calcClayLinerVolumeCY(40, 30, 8, 6, 1.0);
    const thick = calcClayLinerVolumeCY(40, 30, 8, 12, 1.0);
    expect(thick).toBeGreaterThan(thin);
  });
});

describe('Module D: Basement — calcBasement integration', () => {
  it('returns complete basement calculation (normal access)', () => {
    const result = calcBasement({
      lengthFt: 40, widthFt: 30, depthFt: 8,
      benchCount: 0, benchWidthFt: 0, sideSlopeRatio: 1.0,
      tightAccess: false, tightAccessMultiplier: 1.0,
      needsClayLiner: false, clayLinerThicknessIn: 0,
      needsDewatering: false, dewateringPercent: 0,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      clayCostPerCY: 45, importBackfillCostPerCY: 20,
      laborRatePerHr: 65, excavatorRatePerHr: 95, dozerRatePerHr: 85,
      hoursPer100CY: 4,
    });

    expect(result.excavationBaseCY).toBeCloseTo(355.56, 1);
    expect(result.excavationTotalCY).toBeGreaterThan(result.excavationBaseCY);
    expect(result.excavationLooseCY).toBeGreaterThan(result.excavationTotalCY);
    expect(result.clayLinerVolumeCY).toBe(0);
    expect(result.tightAccessPremiumHrs).toBe(0);
    expect(result.costs.total).toBeGreaterThan(0);
  });

  it('applies tight access multiplier (1.5×)', () => {
    const normal = calcBasement({
      lengthFt: 40, widthFt: 30, depthFt: 8,
      benchCount: 0, benchWidthFt: 0, sideSlopeRatio: 0,
      tightAccess: false, tightAccessMultiplier: 1.0,
      needsClayLiner: false, clayLinerThicknessIn: 0,
      needsDewatering: false, dewateringPercent: 0,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      clayCostPerCY: 45, importBackfillCostPerCY: 20,
      laborRatePerHr: 65, excavatorRatePerHr: 95, dozerRatePerHr: 85,
      hoursPer100CY: 4,
    });

    const tight = calcBasement({
      lengthFt: 40, widthFt: 30, depthFt: 8,
      benchCount: 0, benchWidthFt: 0, sideSlopeRatio: 0,
      tightAccess: true, tightAccessMultiplier: 1.5,
      needsClayLiner: false, clayLinerThicknessIn: 0,
      needsDewatering: false, dewateringPercent: 0,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      clayCostPerCY: 45, importBackfillCostPerCY: 20,
      laborRatePerHr: 65, excavatorRatePerHr: 95, dozerRatePerHr: 85,
      hoursPer100CY: 4,
    });

    expect(tight.tightAccessPremiumHrs).toBeGreaterThan(0);
    expect(tight.totalLaborHours).toBeGreaterThan(normal.totalLaborHours);
  });

  it('includes clay liner and dewatering when specified', () => {
    const result = calcBasement({
      lengthFt: 40, widthFt: 30, depthFt: 8,
      benchCount: 0, benchWidthFt: 0, sideSlopeRatio: 1.0,
      tightAccess: false, tightAccessMultiplier: 1.0,
      needsClayLiner: true, clayLinerThicknessIn: 12,
      needsDewatering: true, dewateringPercent: 10,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      clayCostPerCY: 45, importBackfillCostPerCY: 20,
      laborRatePerHr: 65, excavatorRatePerHr: 95, dozerRatePerHr: 85,
      hoursPer100CY: 4,
    });

    expect(result.clayLinerVolumeCY).toBeGreaterThan(0);
    expect(result.dewateringCost).toBeGreaterThan(0);
    expect(result.costs.clayLiner).toBeGreaterThan(0);
    expect(result.costs.dewatering).toBeGreaterThan(0);
  });
});