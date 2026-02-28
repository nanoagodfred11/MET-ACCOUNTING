import mongoose, { Schema, type Document } from 'mongoose';

const PeriodType = { SHIFT: 'shift', DAILY: 'daily', MONTHLY: 'monthly' } as const;

export interface IAssay extends Document {
  processingData: mongoose.Types.ObjectId;
  samplingPoint: mongoose.Types.ObjectId;
  period: { periodType: string; date: Date; shift?: number };
  grade: number;
  isVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  labSampleId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const periodSchema = new Schema(
  {
    periodType: { type: String, enum: Object.values(PeriodType), required: true },
    date: { type: Date, required: true },
    shift: { type: Number, min: 1, max: 3 },
  },
  { _id: false }
);

const assaySchema = new Schema<IAssay>(
  {
    processingData: { type: Schema.Types.ObjectId, ref: 'ProcessingData', required: true },
    samplingPoint: { type: Schema.Types.ObjectId, ref: 'SamplingPoint', required: true },
    period: { type: periodSchema, required: true },
    grade: { type: Number, required: true, min: 0 },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    labSampleId: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true }
);

assaySchema.index({ processingData: 1 }, { unique: true });
assaySchema.index({ 'period.periodType': 1, 'period.date': 1 });
assaySchema.index({ isVerified: 1 });
assaySchema.index({ samplingPoint: 1 });

export const Assay = mongoose.models.Assay as mongoose.Model<IAssay> || mongoose.model<IAssay>('Assay', assaySchema);
