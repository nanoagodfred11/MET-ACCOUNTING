import { Recovery } from '../models/Recovery.server';
import { MassBalance } from '../models/MassBalance.server';
import type { ServerPeriod } from '~/types';
import { calcRecovery, round } from '../utils/calculations';
import { PRECISION, DEFAULT_RECOVERY_TARGET } from '../config/constants';

export class RecoveryService {
  async calculate(period: ServerPeriod, budgetTarget?: number, userId?: string) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }

    const massBalance = await MassBalance.findOne(query).exec();
    if (!massBalance) {
      throw new Error('No mass balance found for the specified period. Calculate mass balance first.');
    }

    const overallRecovery = calcRecovery(
      massBalance.product.containedMetal,
      massBalance.feed.containedMetal
    );

    const target = budgetTarget ?? DEFAULT_RECOVERY_TARGET;
    const variance = round(overallRecovery - target, PRECISION.RECOVERY_PERCENT);

    const recovery = await Recovery.findOneAndUpdate(
      query,
      {
        period,
        massBalance: massBalance._id,
        overallRecovery,
        budgetTarget: target,
        variance,
        ...(userId && { calculatedBy: userId }),
      },
      { upsert: true, returnDocument: 'after' }
    ).exec();

    return recovery;
  }

  async getTrend(start: Date, end: Date, periodType: string = 'daily') {
    return Recovery.find({
      'period.periodType': periodType,
      'period.date': { $gte: start, $lte: end },
    })
      .sort({ 'period.date': 1 })
      .lean()
      .exec();
  }

  async getMonthlySummary(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const results = await Recovery.aggregate([
      {
        $match: {
          'period.periodType': 'daily',
          'period.date': { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          averageRecovery: { $avg: '$overallRecovery' },
          minRecovery: { $min: '$overallRecovery' },
          maxRecovery: { $max: '$overallRecovery' },
          dataPoints: { $sum: 1 },
        },
      },
    ]);

    if (results.length === 0) {
      return { averageRecovery: 0, minRecovery: 0, maxRecovery: 0, dataPoints: 0 };
    }

    const r = results[0];
    return {
      averageRecovery: round(r.averageRecovery, PRECISION.RECOVERY_PERCENT),
      minRecovery: r.minRecovery,
      maxRecovery: r.maxRecovery,
      dataPoints: r.dataPoints,
    };
  }
}

export const recoveryService = new RecoveryService();
