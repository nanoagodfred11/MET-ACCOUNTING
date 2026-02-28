import { ProcessingData } from '../models/ProcessingData.server';
import { Assay } from '../models/Assay.server';
import type { ServerPeriod } from '~/types';
import { logAudit } from './auditService.server';

interface ProcessingDataDTO {
  samplingPointId: string;
  period: ServerPeriod;
  wetTonnes: number;
  moisturePercent: number;
  notes?: string;
}

export class ProcessingDataService {
  async create(dto: ProcessingDataDTO, ip?: string, userId?: string) {
    const data = new ProcessingData({
      samplingPoint: dto.samplingPointId,
      period: dto.period,
      wetTonnes: dto.wetTonnes,
      moisturePercent: dto.moisturePercent,
      notes: dto.notes,
      ...(userId && { enteredBy: userId }),
    });
    try {
      const saved = await data.save();
      logAudit('create', 'processingData', saved._id, { wetTonnes: dto.wetTonnes, moisturePercent: dto.moisturePercent }, ip, userId);
      return saved;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new Error('A record already exists for this sampling point and period. Use Edit to modify it.');
      }
      throw err;
    }
  }

  async getByPeriod(period: ServerPeriod) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }
    return ProcessingData.find(query).populate('samplingPoint').lean().exec();
  }

  async getById(id: string) {
    return ProcessingData.findById(id).populate('samplingPoint').exec();
  }

  async update(
    id: string,
    updates: Partial<ProcessingDataDTO>,
    ip?: string,
    userId?: string,
  ) {
    const data = await ProcessingData.findById(id);
    if (!data) return null;

    if (data.status === 'locked') {
      throw new Error('Cannot modify locked processing data');
    }

    const old = { wetTonnes: data.wetTonnes, moisturePercent: data.moisturePercent, notes: data.notes };

    if (updates.wetTonnes !== undefined) data.wetTonnes = updates.wetTonnes;
    if (updates.moisturePercent !== undefined) data.moisturePercent = updates.moisturePercent;
    if (updates.notes !== undefined) data.notes = updates.notes;

    const saved = await data.save();
    logAudit('update', 'processingData', id, { old, new: { wetTonnes: saved.wetTonnes, moisturePercent: saved.moisturePercent, notes: saved.notes } }, ip, userId);
    return saved;
  }

  async delete(id: string, ip?: string, userId?: string) {
    const data = await ProcessingData.findById(id);
    if (!data) throw new Error('Processing data not found');
    if (data.status === 'locked') {
      throw new Error('Cannot delete locked processing data');
    }
    await Assay.deleteMany({ processingData: id });
    await ProcessingData.findByIdAndDelete(id);
    logAudit('delete', 'processingData', id, { wetTonnes: data.wetTonnes, moisturePercent: data.moisturePercent }, ip, userId);
  }

  async lockPeriod(period: ServerPeriod, userId?: string) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }

    const result = await ProcessingData.updateMany(
      { ...query, status: { $ne: 'locked' } },
      {
        $set: {
          status: 'locked',
          lockedAt: new Date(),
          ...(userId && { lockedBy: userId }),
        },
      }
    );
    return result.modifiedCount;
  }
}

export const processingDataService = new ProcessingDataService();
