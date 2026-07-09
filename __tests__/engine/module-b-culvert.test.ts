/**
 * Module B: Culvert Tests (TypeScript)
 * Tests the architect's module-b-culvert.ts exports.
 */
import { describe, it, expect } from '@jest/globals';
import {
  calcTrenchCrossSection, calcTrenchExcavationCY, calcPipeCrossSectionAL,
  calcPipeVolumeCY, calcBeddingVolumeCY, calcBackfillVolumeCY,
  calcBackfillLoose, calcHeadwallConcreteCY, calcRiprapVolumeCY,
  calcCulvert,
} from '../../lib/engine/module-b-culvert';

describe('Module B: Culvert — calcTrenchCrossSection', () => {
  it('calculates trapezoidal cross-section (b=4, depth=4, slope=1.5)', () => {
    // top=4+2*1.5*4=16, area=(4+16)/2*4=40
    const area = calcTrenchCrossSection(4, 4, 1.5);
    expect(area).toBe(40);
  });

  it('handles rectangular trench (slope=0)', () => {
    expect(calcTrenchCrossSection(4, 4, 0)).toBe(16);
  });

  it('throws for zero/negative dimensions', () => {
    expect(() => calcTrenchCrossSection(0, 4, 1)).toThrow('positive');
    expect(() => calcTrenchCrossSection(4, -1, 1)).toThrow('positive');
    expect(() => calcTrenchCrossSection(4, 4, -1)).toThrow('non-negative');
  });
});

describe('Module B: Culvert — calcTrenchExcavationCY', () => {
  it('calculates 40 sqft × 50ft → 2000/27 = 74.07 CY', () => {
    expect(calcTrenchExcavationCY(40, 50)).toBeCloseTo(74.07, 1);
  });
});

describe('Module B: Culvert — calcPipeCrossSectionAL', () => {
  it('calculates area for 18-inch pipe (r=0.75ft, area=1.767)', () => {
    expect(calcPipeCrossSectionAL(18)).toBeCloseTo(1.767, 2);
  });

  it('calculates area for 48-inch pipe (r=2ft, area=12.566)', () => {
    expect(calcPipeCrossSectionAL(48)).toBeCloseTo(12.566, 2);
  });
});

describe('Module B: Culvert — calcPipeVolumeCY', () => {
  it('calculates 1.767 sqft × 50ft / 27 = 3.27 CY', () => {
    const vol = calcPipeVolumeCY(1.767, 50);
    expect(vol).toBeCloseTo(3.27, 1);
  });
});

describe('Module B: Culvert — calcBeddingVolumeCY', () => {
  it('calculates bedding: 50 × 4 × (6/12) / 27', () => {
    expect(calcBeddingVolumeCY(50, 4, 6)).toBeCloseTo(3.70, 1);
  });
});

describe('Module B: Culvert — calcBackfillVolumeCY', () => {
  it('excavation - pipe - bedding', () => {
    expect(calcBackfillVolumeCY(74.07, 3.27, 3.70)).toBeCloseTo(67.10, 1);
  });
});

describe('Module B: Culvert — calcBackfillLoose', () => {
  it('applies compaction factor', () => {
    expect(calcBackfillLoose(67.10, 1.15)).toBeCloseTo(77.17, 1);
  });
  it('throws for zero factor', () => {
    expect(() => calcBackfillLoose(100, 0)).toThrow('positive');
  });
});

describe('Module B: Culvert — calcHeadwallConcreteCY', () => {
  it('calculates 4ft×6ft×8in×2 headwalls', () => {
    // 4*6*(8/12)*2 / 27 = 32/27 = 1.185 CY
    expect(calcHeadwallConcreteCY(4, 6, 8, 2)).toBeCloseTo(1.185, 2);
  });
});

describe('Module B: Culvert — calcRiprapVolumeCY', () => {
  it('calculates 10×8×12" apron', () => {
    // 10*8*(12/12) / 27 = 80/27 = 2.96 CY
    expect(calcRiprapVolumeCY(10, 8, 12)).toBeCloseTo(2.96, 1);
  });
});

describe('Module B: Culvert — calcCulvert integration', () => {
  it('returns complete culvert calculation', () => {
    const result = calcCulvert({
      pipeDiameterIn: 18, lengthFt: 50, trenchBottomWidthFt: 4,
      trenchDepthFt: 4, sideSlopeRatio: 1.5,
      beddingThicknessIn: 6, coverThicknessIn: 12,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      needsHeadwall: true, headwallHeightFt: 4, headwallWidthFt: 6,
      headwallThicknessIn: 8, headwallCount: 2,
      needsRiprap: true, riprapLengthFt: 10, riprapWidthFt: 8, riprapThicknessIn: 12,
      beddingCostPerCY: 40, backfillCostPerCY: 25, concreteCostPerCY: 350,
      riprapCostPerCY: 65, pipeCostPerLF: 85,
      laborRatePerHr: 65, excavatorRatePerHr: 95, hoursPerCY: 0.15,
    });

    expect(result.trenchCrossSectionSqFt).toBe(40);
    expect(result.excavationVolumeCY).toBeCloseTo(74.07, 1);
    expect(result.excavationLooseCY).toBeCloseTo(92.59, 1);
    expect(result.pipeVolumeCY).toBeCloseTo(3.27, 1);
    expect(result.concreteVolumeCY).toBeCloseTo(1.185, 2);
    expect(result.riprapVolumeCY).toBeCloseTo(2.96, 1);
    expect(result.costs.total).toBeGreaterThan(0);
    expect(result.lineItems.length).toBeGreaterThan(5);
  });

  it('handles simple trench without headwall or riprap', () => {
    const result = calcCulvert({
      pipeDiameterIn: 12, lengthFt: 30, trenchBottomWidthFt: 3,
      trenchDepthFt: 3, sideSlopeRatio: 1.0,
      beddingThicknessIn: 4, coverThicknessIn: 12,
      soilSwellFactor: 1.25, compactionFactor: 1.15,
      needsHeadwall: false, headwallHeightFt: 0, headwallWidthFt: 0,
      headwallThicknessIn: 0, headwallCount: 0,
      needsRiprap: false, riprapLengthFt: 0, riprapWidthFt: 0, riprapThicknessIn: 0,
      beddingCostPerCY: 40, backfillCostPerCY: 25, concreteCostPerCY: 0,
      riprapCostPerCY: 0, pipeCostPerLF: 45,
      laborRatePerHr: 65, excavatorRatePerHr: 95, hoursPerCY: 0.15,
    });

    expect(result.concreteVolumeCY).toBe(0);
    expect(result.riprapVolumeCY).toBe(0);
    expect(result.costs.total).toBeGreaterThan(0);
  });
});