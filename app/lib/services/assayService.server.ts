import { Assay } from '../models/Assay.server';
import type { ServerPeriod } from '~/types';

interface AssayDTO {
  processingDataId: string;
  samplingPointId: string;
  period: ServerPeriod;
  grade: number;
  labSampleId?: string;
  notes?: string;
}

export class AssayService {
  async create(dto: AssayDTO) {
    const assay = new Assay({
      processingData: dto.processingDataId,
      samplingPoint: dto.samplingPointId,
      period: dto.period,
      grade: dto.grade,
      labSampleId: dto.labSampleId,
      notes: dto.notes,
    });
    return assay.save();
  }

  async getByPeriod(period: ServerPeriod) {
    const query: Record<string, unknown> = {
      'period.periodType': period.periodType,
      'period.date': period.date,
    };
    if (period.shift !== undefined) {
      query['period.shift'] = period.shift;
    }
    return Assay.find(query).populate('samplingPoint').lean().exec();
  }

  async getById(id: string) {
    return Assay.findById(id).populate(['samplingPoint', 'processingData']).lean().exec();
  }

  async getPending() {
    return Assay.find({ isVerified: false })
      .populate(['samplingPoint', 'processingData'])
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
  }

  async getVerified() {
    return Assay.find({ isVerified: true })
      .populate(['samplingPoint', 'processingData'])
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  async verify(id: string, userId?: string) {
    return Assay.findByIdAndUpdate(
      id,
      {
        isVerified: true,
        verifiedAt: new Date(),
        ...(userId && { verifiedBy: userId }),
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async unverify(id: string) {
    return Assay.findByIdAndUpdate(
      id,
      {
        isVerified: false,
        verifiedAt: undefined,
        verifiedBy: undefined,
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async getForProcessingData(processingDataId: string) {
    return Assay.findOne({ processingData: processingDataId }).exec();
  }
}

export const assayService = new AssayService();
