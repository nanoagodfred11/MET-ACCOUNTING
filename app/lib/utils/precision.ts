import Decimal from 'decimal.js';
import { PRECISION, KG_TO_TROY_OZ } from '../config/constants';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function round(value: number | string | Decimal, decimals: number): number {
  return new Decimal(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
}

export function calcDryTonnes(wetTonnes: number, moisturePercent: number): number {
  const result = new Decimal(wetTonnes)
    .times(new Decimal(1).minus(new Decimal(moisturePercent).div(100)));
  return round(result, PRECISION.DRY_TONNES);
}

export function calcContainedMetal(dryTonnes: number, gradeGPerTon: number): number {
  const result = new Decimal(dryTonnes).times(gradeGPerTon).div(1000);
  return round(result, PRECISION.CONTAINED_METAL);
}

export function calcWeightedAvgGrade(
  entries: Array<{ dryTonnes: number; grade: number }>
): number {
  if (entries.length === 0) return 0;

  let totalProduct = new Decimal(0);
  let totalTonnes = new Decimal(0);

  for (const e of entries) {
    totalProduct = totalProduct.plus(new Decimal(e.dryTonnes).times(e.grade));
    totalTonnes = totalTonnes.plus(e.dryTonnes);
  }

  if (totalTonnes.isZero()) return 0;
  return round(totalProduct.div(totalTonnes), PRECISION.GRADE);
}

export function calcRecovery(productMetal: number, feedMetal: number): number {
  if (feedMetal === 0) return 0;
  const result = new Decimal(productMetal).div(feedMetal).times(100);
  return round(result, PRECISION.RECOVERY_PERCENT);
}

export function calcDiscrepancy(sourceA: number, sourceB: number): number {
  return round(new Decimal(sourceA).minus(sourceB), PRECISION.CONTAINED_METAL);
}

export function calcDiscrepancyPercent(discrepancy: number, sourceA: number): number {
  if (sourceA === 0) return 0;
  const result = new Decimal(discrepancy).div(sourceA).times(100);
  return round(result, PRECISION.DISCREPANCY_PERCENT);
}

export function kgToOz(kg: number): number {
  return round(new Decimal(kg).times(KG_TO_TROY_OZ), PRECISION.CONTAINED_METAL_OZ);
}

export function preciseSum(values: number[]): number {
  return values.reduce((acc, v) => new Decimal(acc).plus(v).toNumber(), 0);
}
