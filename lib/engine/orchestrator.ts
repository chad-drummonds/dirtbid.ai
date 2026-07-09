// =============================================================================
// Dynamic Cost Orchestrator
// =============================================================================
// Coordinates labor, materials, fuel, equipment depreciation, and
// subcontractor fees across all 5 calculation modules. Provides
// multi-variable "what-if" adjustment.

import { calcDriveway, DrivewayInput, DrivewayOutput } from './module-a-driveway';
import { calcCulvert, CulvertInput, CulvertOutput } from './module-b-culvert';
import { calcSeptic, SepticInput, SepticOutput } from './module-c-septic';
import { calcBasement, BasementInput, BasementOutput } from './module-d-basements';
import { calcHauling, HaulingInput, HaulingOutput, SOIL_FACTORS, SoilType } from './module-e-hauling';

export type BidModuleType = 'driveway' | 'culvert' | 'septic' | 'basement' | 'hauling';

export interface BidModuleConfig {
  type: BidModuleType;
  label: string;
  enabled: boolean;
  markupPercent: number;
  /** Multiplier adjustments for what-if analysis */
  multipliers?: {
    labor?: number;
    material?: number;
    equipment?: number;
  };
}

export interface BidRequest {
  projectName: string;
  projectLocation: string;
  modules: BidModuleConfig[];
  driveway?: DrivewayInput;
  culvert?: CulvertInput;
  septic?: SepticInput;
  basement?: BasementInput;
  hauling?: HaulingInput;
  /** Regional cost index multiplier (1.0 = national average) */
  regionalCostIndex: number;
  /** General contractor overhead percent */
  overheadPercent: number;
  /** Profit margin percent */
  profitMarginPercent: number;
  /** Sales tax percent on materials */
  salesTaxPercent: number;
  /** Bond & insurance percent */
  bondInsurancePercent: number;
}

export interface ModuleResult {
  type: BidModuleType;
  label: string;
  baseCost: number;
  adjustedCost: number;
  markupAmount: number;
  details: DrivewayOutput | CulvertOutput | SepticOutput | BasementOutput | HaulingOutput | null;
}

export interface BidResponse {
  projectName: string;
  projectLocation: string;
  generatedAt: string;
  modules: ModuleResult[];
  subtotalBeforeMarkup: number;
  totalMarkup: number;
  subtotalAfterMarkup: number;
  overheadAmount: number;
  profitAmount: number;
  salesTaxAmount: number;
  bondInsuranceAmount: number;
  regionalAdjustment: number;
  grandTotal: number;
  lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }>;
}

/**
 * Execute a single calculation module and return cost.
 */
function executeModule(config: BidModuleConfig, request: BidRequest): ModuleResult {
  let baseCost = 0;
  let details: any = null;

  const applyMultipliers = (labor: number, material: number, equipment: number) => {
    const mLabor = config.multipliers?.labor ?? 1.0;
    const mMaterial = config.multipliers?.material ?? 1.0;
    const mEquipment = config.multipliers?.equipment ?? 1.0;
    return labor * mLabor + material * mMaterial + equipment * mEquipment;
  };

  switch (config.type) {
    case 'driveway': {
      if (!request.driveway) throw new Error('Driveway input required');
      const result = calcDriveway(request.driveway);
      details = result;
      baseCost = applyMultipliers(
        result.laborCosts.total,
        result.materialCosts.total,
        result.equipmentCosts.total,
      );
      break;
    }
    case 'culvert': {
      if (!request.culvert) throw new Error('Culvert input required');
      const result = calcCulvert(request.culvert);
      details = result;
      baseCost = applyMultipliers(
        result.costs.labor,
        result.costs.pipe + result.costs.bedding + result.costs.backfill + result.costs.concrete + result.costs.riprap,
        result.costs.equipment,
      );
      break;
    }
    case 'septic': {
      if (!request.septic) throw new Error('Septic input required');
      const result = calcSeptic(request.septic);
      details = result;
      baseCost = applyMultipliers(
        result.costs.labor,
        result.costs.tank + result.costs.pipe + result.costs.gravel + result.costs.backfill + result.costs.pumpChamber,
        result.costs.equipment,
      );
      break;
    }
    case 'basement': {
      if (!request.basement) throw new Error('Basement input required');
      const result = calcBasement(request.basement);
      details = result;
      baseCost = applyMultipliers(
        result.costs.labor,
        result.costs.clayLiner + result.costs.backfill,
        result.costs.equipment + result.costs.excavation,
      );
      break;
    }
    case 'hauling': {
      if (!request.hauling) throw new Error('Hauling input required');
      const result = calcHauling(request.hauling);
      details = result;
      baseCost = applyMultipliers(
        result.costs.driverWages,
        result.costs.fuel,
        result.costs.truckOperation,
      );
      break;
    }
  }

  const markupAmount = baseCost * (config.markupPercent / 100);
  const adjustedCost = baseCost + markupAmount;

  return { type: config.type, label: config.label, baseCost, adjustedCost, markupAmount, details };
}

/**
 * Generate a complete bid from a BidRequest.
 */
export function generateBid(request: BidRequest): BidResponse {
  const moduleResults = request.modules
    .filter(m => m.enabled)
    .map(m => executeModule(m, request));

  const subtotalBeforeMarkup = moduleResults.reduce((s, m) => s + m.baseCost, 0);
  const totalMarkup = moduleResults.reduce((s, m) => s + m.markupAmount, 0);
  const subtotalAfterMarkup = moduleResults.reduce((s, m) => s + m.adjustedCost, 0);

  const regionalAdjustment = subtotalAfterMarkup * (request.regionalCostIndex - 1);
  const afterRegional = subtotalAfterMarkup + regionalAdjustment;

  const overheadAmount = afterRegional * (request.overheadPercent / 100);
  const profitAmount = (afterRegional + overheadAmount) * (request.profitMarginPercent / 100);
  const salesTaxAmount = subtotalBeforeMarkup * (request.salesTaxPercent / 100);
  const bondInsuranceAmount = (afterRegional + overheadAmount + profitAmount) * (request.bondInsurancePercent / 100);

  const grandTotal = afterRegional + overheadAmount + profitAmount + salesTaxAmount + bondInsuranceAmount;

  const lineItems: Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }> = [];

  for (const mod of moduleResults) {
    lineItems.push({
      description: `${mod.label} — base cost`,
      quantity: 1, unit: 'ls',
      rate: round2(mod.baseCost),
      amount: round2(mod.baseCost),
    });
    if (mod.details && 'lineItems' in mod.details && Array.isArray((mod.details as any).lineItems)) {
      for (const li of (mod.details as any).lineItems as Array<{ description: string; quantity: number; unit: string; rate: number; amount: number }>) {
        if (li.amount > 0 || li.description.startsWith('Swell')) {
          lineItems.push({ ...li });
        }
      }
    }
  }

  lineItems.push({ description: 'Overhead', quantity: 1, unit: 'ls', rate: round2(overheadAmount), amount: round2(overheadAmount) });
  lineItems.push({ description: 'Profit margin', quantity: 1, unit: 'ls', rate: round2(profitAmount), amount: round2(profitAmount) });
  lineItems.push({ description: 'Sales tax', quantity: 1, unit: 'ls', rate: round2(salesTaxAmount), amount: round2(salesTaxAmount) });
  lineItems.push({ description: 'Bond & insurance', quantity: 1, unit: 'ls', rate: round2(bondInsuranceAmount), amount: round2(bondInsuranceAmount) });

  return {
    projectName: request.projectName,
    projectLocation: request.projectLocation,
    generatedAt: new Date().toISOString(),
    modules: moduleResults,
    subtotalBeforeMarkup: round2(subtotalBeforeMarkup),
    totalMarkup: round2(totalMarkup),
    subtotalAfterMarkup: round2(subtotalAfterMarkup),
    overheadAmount: round2(overheadAmount),
    profitAmount: round2(profitAmount),
    salesTaxAmount: round2(salesTaxAmount),
    bondInsuranceAmount: round2(bondInsuranceAmount),
    regionalAdjustment: round2(regionalAdjustment),
    grandTotal: round2(grandTotal),
    lineItems,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
