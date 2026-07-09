/**
 * Module C: Septic Tests (TypeScript)
 * Tests the architect's module-c-septic.ts exports.
 */
import { describe, it, expect } from '@jest/globals';
import {
  calcTankSize, calcFlowGPD, calcDrainfieldAreaSqFt,
  calcTrenchLength, calcGravelVolumeCY, calcTrenchExcavationCY,
  calcTankExcavationCY, calcSeptic,
} from '../../lib/engine/module-c-septic';

describe('Module C: Septic — calcTankSize', () => {
  it('returns 900 gal for 1 bedroom (1.5 eff occupants = 1.5 ≤ 2)', () => {
    expect(calcTankSize(1, 1)).toBe(900);
  });

  it('returns sized tank based on effective occupants', () => {
    // bedrooms=2, occupants=3 → effective=max(3,3)=3 → ≤4 → 1000
    expect(calcTankSize(2, 3)).toBe(1000);
    // bedrooms=3, occupants=4 → effective=max(4.5,4)=4.5 → ≤6 → 1250
    expect(calcTankSize(3, 4)).toBe(1250);
  });

  it('returns larger tank for more occupants', () => {
    const sixOcc = calcTankSize(3, 6);
    expect(sixOcc).toBe(1250);
  });

  it('uses max of bedrooms×1.5 vs occupants', () => {
    const withOcc = calcTankSize(1, 5); // effective=5, should be 1250
    expect(withOcc).toBe(1250);
  });
});

describe('Module C: Septic — calcFlowGPD', () => {
  it('calculates 360 GPD for 3 occupants', () => {
    expect(calcFlowGPD(3)).toBe(360);
  });
});

describe('Module C: Septic — calcDrainfieldAreaSqFt', () => {
  it('calculates area: 360 GPD / 0.9 rate = 400 sqft (perc=15min/in)', () => {
    const area = calcDrainfieldAreaSqFt(360, 15);
    expect(area).toBeCloseTo(400, 0);
  });

  it('needs more area for slower perc rates', () => {
    const fast = calcDrainfieldAreaSqFt(360, 5);   // 1.6 rate → 225
    const slow = calcDrainfieldAreaSqFt(360, 60);    // 0.45 rate → 800
    expect(fast).toBe(225);
    expect(slow).toBe(800);
  });

  it('throws for zero perc rate', () => {
    expect(() => calcDrainfieldAreaSqFt(360, 0)).toThrow('positive');
  });
});

describe('Module C: Septic — calcTrenchLength', () => {
  it('calculates 400 sqft / 2ft / 3 trenches = 66.67 ft/trench', () => {
    expect(calcTrenchLength(400, 2, 3)).toBeCloseTo(66.67, 1);
  });
});

describe('Module C: Septic — calcGravelVolumeCY', () => {
  it('calculates gravel volume with pipe displacement', () => {
    const vol = calcGravelVolumeCY(66.67, 2, 15, 4, 2, 3);
    expect(vol).toBeGreaterThan(0);
  });
});

describe('Module C: Septic — calcTankExcavationCY', () => {
  it('calculates simple box (no side slope)', () => {
    // 8×6×6 / 27 = 288/27 = 10.67 CY
    expect(calcTankExcavationCY(8, 6, 6, 0)).toBeCloseTo(10.67, 1);
  });

  it('calculates sloped excavation', () => {
    const vol = calcTankExcavationCY(8, 6, 6, 1.0);
    expect(vol).toBeGreaterThan(10.67); // sloped has more volume
  });
});

describe('Module C: Septic — calcSeptic integration', () => {
  it('returns complete septic calculation for 3-bedroom home', () => {
    const result = calcSeptic({
      bedrooms: 3, occupants: 4, percRateMinPerIn: 20,
      trenchWidthFt: 2, gravelDepthIn: 15, gravelCoverOverPipeIn: 2,
      pipeDiameterIn: 4, trenchCount: 3, trenchLengthOverrideFt: 0,
      needsPumpChamber: false, elevationDifferenceFt: 0,
      tankExcavationDepthFt: 6, tankExcavationLengthFt: 8, tankExcavationWidthFt: 6,
      tankSideSlope: 0, soilSwellFactor: 1.25,
      tankCostPerGal: 0.50, pipeCostPerLF: 3.50, gravelCostPerCY: 35,
      backfillCostPerCY: 15, pumpChamberCost: 0,
      laborRatePerHr: 65, excavatorRatePerHr: 95, hoursPerCY: 0.15,
    });

    // bedrooms=3, occupants=4 → effective=4.5 → ≤6 → 1250
    expect(result.tankSizeGal).toBe(1250);
    expect(result.dailyFlowGPD).toBe(480);
    expect(result.drainfieldAreaSqFt).toBeGreaterThan(0);
    expect(result.gravelVolumeCY).toBeGreaterThan(0);
    expect(result.costs.total).toBeGreaterThan(0);
  });

  it('handles 4-bedroom with pump chamber', () => {
    const result = calcSeptic({
      bedrooms: 4, occupants: 5, percRateMinPerIn: 10,
      trenchWidthFt: 3, gravelDepthIn: 18, gravelCoverOverPipeIn: 2,
      pipeDiameterIn: 4, trenchCount: 2, trenchLengthOverrideFt: 0,
      needsPumpChamber: true, elevationDifferenceFt: 8,
      tankExcavationDepthFt: 6, tankExcavationLengthFt: 10, tankExcavationWidthFt: 6,
      tankSideSlope: 0.5, soilSwellFactor: 1.25,
      tankCostPerGal: 0.55, pipeCostPerLF: 4.00, gravelCostPerCY: 38,
      backfillCostPerCY: 18, pumpChamberCost: 1500,
      laborRatePerHr: 65, excavatorRatePerHr: 95, hoursPerCY: 0.15,
    });

    expect(result.tankSizeGal).toBe(1250);
    expect(result.costs.pumpChamber).toBeGreaterThan(0);
    expect(result.lineItems.some(li => li.description.includes('Pump'))).toBe(true);
  });
});