import { ProcessingData } from '../models/ProcessingData.server';
import { Assay } from '../models/Assay.server';
import { MassBalance } from '../models/MassBalance.server';
import type { ISamplingPoint } from '../models/SamplingPoint.server';
import type { ServerPeriod } from '~/types';
import {
  buildStreamSummary,
  calcUnaccountedMetal,
  calcUnaccountedPercent,
} from '../utils/calculations';
import type { StreamEntry } from '../utils/calculations';
import { logAudit } from './auditService.server';

interface ProcessingDataWithAssay {
  dryTonnes: number;
  grade: number;
  hasAssay: boolean;
  circuitStage: string;
  massBalanceRole: string | null;
}

export class MassBalanceService {
  async calculate(period: ServerPeriod, userId?: string) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }

    const processingDataList = await ProcessingData.find(query)
      .populate('samplingPoint')
      .exec();

    if (processingDataList.length === 0) {
      throw new Error('No processing data found for the specified period');
    }

    // Batch-fetch all assays in one query instead of N+1 sequential lookups
    const pdIds = processingDataList.map((pd) => pd._id);
    const assays = await Assay.find({ processingData: { $in: pdIds } }).exec();
    const assayMap = new Map(assays.map((a) => [a.processingData.toString(), a]));

    const entries: ProcessingDataWithAssay[] = [];
    let allAssaysPresent = true;

    for (const pd of processingDataList) {
      const sp = pd.samplingPoint as unknown as ISamplingPoint;
      if (!sp) continue;

      const assay = assayMap.get(pd._id.toString());
      const hasAssay = !!assay;
      if (!hasAssay) allAssaysPresent = false;

      entries.push({
        dryTonnes: pd.dryTonnes,
        grade: hasAssay ? assay!.grade : 0,
        hasAssay,
        circuitStage: sp.circuitStage,
        massBalanceRole: sp.massBalanceRole || null,
      });
    }

    const feedEntries: StreamEntry[] = entries
      .filter((e) => e.massBalanceRole === 'feed')
      .map((e) => ({ dryTonnes: e.dryTonnes, grade: e.grade }));

    const productEntries: StreamEntry[] = entries
      .filter((e) => e.massBalanceRole === 'product')
      .map((e) => ({ dryTonnes: e.dryTonnes, grade: e.grade }));

    const tailingsEntries: StreamEntry[] = entries
      .filter((e) => e.massBalanceRole === 'tailings')
      .map((e) => ({ dryTonnes: e.dryTonnes, grade: e.grade }));

    const feed = buildStreamSummary(feedEntries);
    const product = buildStreamSummary(productEntries);
    const tailings = buildStreamSummary(tailingsEntries);

    const unaccountedMetal = calcUnaccountedMetal(
      feed.containedMetal,
      product.containedMetal,
      tailings.containedMetal
    );
    const unaccountedPercent = calcUnaccountedPercent(unaccountedMetal, feed.containedMetal);

    const status = allAssaysPresent ? 'final' : 'preliminary';

    const upsertQuery: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      upsertQuery['period.shift'] = period.shift;
    }

    const massBalance = await MassBalance.findOneAndUpdate(
      upsertQuery,
      { period, feed, product, tailings, unaccountedMetal, unaccountedPercent, status, ...(userId && { calculatedBy: userId }) },
      { upsert: true, returnDocument: 'after' }
    ).exec();

    logAudit('calculate', 'massBalance', massBalance._id, { feed, product, tailings, unaccountedPercent, status }, undefined, userId);

    return massBalance;
  }

  async calculateMonthly(year: number, month: number, userId?: string) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const dailyBalances = await MassBalance.find({
      'period.periodType': 'daily',
      'period.date': { $gte: startDate, $lte: endDate },
    }).exec();

    if (dailyBalances.length === 0) {
      throw new Error('No daily mass balances found for the specified month');
    }

    const feedEntries = dailyBalances.map((mb) => ({
      dryTonnes: mb.feed.dryTonnes,
      grade: mb.feed.weightedGrade,
    }));
    const productEntries = dailyBalances.map((mb) => ({
      dryTonnes: mb.product.dryTonnes,
      grade: mb.product.weightedGrade,
    }));
    const tailingsEntries = dailyBalances.map((mb) => ({
      dryTonnes: mb.tailings.dryTonnes,
      grade: mb.tailings.weightedGrade,
    }));

    const feed = buildStreamSummary(feedEntries);
    const product = buildStreamSummary(productEntries);
    const tailings = buildStreamSummary(tailingsEntries);

    const unaccountedMetal = calcUnaccountedMetal(
      feed.containedMetal,
      product.containedMetal,
      tailings.containedMetal
    );
    const unaccountedPercent = calcUnaccountedPercent(unaccountedMetal, feed.containedMetal);

    const allFinal = dailyBalances.every((mb) => mb.status === 'final');
    const status = allFinal ? 'final' : 'preliminary';

    const period = { periodType: 'monthly' as const, date: startDate };

    const massBalance = await MassBalance.findOneAndUpdate(
      { 'period.periodType': 'monthly', 'period.date': startDate },
      { period, feed, product, tailings, unaccountedMetal, unaccountedPercent, status, ...(userId && { calculatedBy: userId }) },
      { upsert: true, returnDocument: 'after' }
    ).exec();

    return massBalance;
  }

  async getByPeriod(period: ServerPeriod) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }
    return MassBalance.findOne(query).lean().exec();
  }

  async getRange(start: Date, end: Date, periodType: string) {
    return MassBalance.find({
      'period.periodType': periodType,
      'period.date': { $gte: start, $lte: end },
    })
      .sort({ 'period.date': 1 })
      .lean()
      .exec();
  }

  async approve(id: string, userId?: string) {
    return MassBalance.findByIdAndUpdate(
      id,
      { status: 'locked', approvedAt: new Date(), ...(userId && { approvedBy: userId }) },
      { returnDocument: 'after' }
    ).exec();
  }
}

export const massBalanceService = new MassBalanceService();
