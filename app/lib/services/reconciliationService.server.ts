import { Reconciliation } from '../models/Reconciliation.server';
import { MassBalance } from '../models/MassBalance.server';
import type { ServerPeriod } from '~/types';
import { calcDiscrepancy, calcDiscrepancyPercent } from '../utils/calculations';
import { THRESHOLDS } from '../config/constants';

interface ReconciliationDTO {
  period: ServerPeriod;
  sourceAName: string;
  sourceBName: string;
  sourceAMetal: number;
  sourceBMetal: number;
  threshold?: number;
}

export class ReconciliationService {
  async create(dto: ReconciliationDTO, userId?: string) {
    const discrepancy = calcDiscrepancy(dto.sourceAMetal, dto.sourceBMetal);
    const discrepancyPercent = calcDiscrepancyPercent(discrepancy, dto.sourceAMetal);
    const threshold = dto.threshold ?? THRESHOLDS.DEFAULT;
    const isFlagged = Math.abs(discrepancyPercent) > threshold;

    const recon = new Reconciliation({
      period: dto.period,
      sourceAName: dto.sourceAName,
      sourceBName: dto.sourceBName,
      sourceAMetal: dto.sourceAMetal,
      sourceBMetal: dto.sourceBMetal,
      discrepancy,
      discrepancyPercent,
      threshold,
      isFlagged,
      ...(userId && { createdBy: userId }),
    });

    return recon.save();
  }

  async autoPlantVsRefinery(period: ServerPeriod, refineryMetal: number, userId?: string) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }

    const massBalance = await MassBalance.findOne(query).exec();
    if (!massBalance) {
      throw new Error('No mass balance found for the specified period');
    }

    return this.create(
      {
        period,
        sourceAName: 'Plant Product',
        sourceBName: 'Refinery Return',
        sourceAMetal: massBalance.product.containedMetal,
        sourceBMetal: refineryMetal,
        threshold: THRESHOLDS.PLANT_VS_REFINERY,
      },
      userId,
    );
  }

  async getFlagged() {
    return Reconciliation.find({ isFlagged: true, isResolved: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async resolve(id: string, resolutionNotes: string, userId?: string) {
    return Reconciliation.findByIdAndUpdate(
      id,
      { isResolved: true, resolvedAt: new Date(), resolutionNotes, ...(userId && { resolvedBy: userId }) },
      { returnDocument: 'after' }
    ).exec();
  }

  async getByPeriod(period: ServerPeriod) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }
    return Reconciliation.find(query).exec();
  }
}

export const reconciliationService = new ReconciliationService();
