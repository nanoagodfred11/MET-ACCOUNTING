import {
  calcDryTonnes,
  calcContainedMetal,
  calcWeightedAvgGrade,
  calcRecovery,
  calcDiscrepancy,
  calcDiscrepancyPercent,
  preciseSum,
  round,
} from './precision';
import { PRECISION } from '../config/constants';
import type { StreamSummary } from '~/types';

export interface StreamEntry {
  dryTonnes: number;
  grade: number;
}

export function buildStreamSummary(entries: StreamEntry[]): StreamSummary {
  const dryTonnes = round(
    preciseSum(entries.map((e) => e.dryTonnes)),
    PRECISION.DRY_TONNES
  );
  const weightedGrade = calcWeightedAvgGrade(entries);
  const containedMetal = calcContainedMetal(dryTonnes, weightedGrade);

  return { dryTonnes, weightedGrade, containedMetal };
}

export function calcUnaccountedMetal(
  feedMetal: number,
  productMetal: number,
  tailsMetal: number
): number {
  return round(
    preciseSum([feedMetal, -productMetal, -tailsMetal]),
    PRECISION.CONTAINED_METAL
  );
}

export function calcUnaccountedPercent(unaccounted: number, feedMetal: number): number {
  return calcDiscrepancyPercent(unaccounted, feedMetal);
}

export {
  calcDryTonnes,
  calcContainedMetal,
  calcWeightedAvgGrade,
  calcRecovery,
  calcDiscrepancy,
  calcDiscrepancyPercent,
  preciseSum,
  round,
};
