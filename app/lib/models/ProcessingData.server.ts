import mongoose, { Schema, type Document } from 'mongoose';
import { calcDryTonnes } from '../utils/precision';

const PeriodType = { SHIFT: 'shift', DAILY: 'daily', MONTHLY: 'monthly' } as const;
const DataStatus = { DRAFT: 'draft', PRELIMINARY: 'preliminary', FINAL: 'final', LOCKED: 'locked' } as const;

export interface IProcessingData extends Document {
  samplingPoint: mongoose.Types.ObjectId;
  period: { periodType: string; date: Date; shift?: number };
  wetTonnes: number;
  moisturePercent: number;
  dryTonnes: number;
  status: string;
  enteredBy?: mongoose.Types.ObjectId;
  lockedBy?: mongoose.Types.ObjectId;
  lockedAt?: Date;
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

const processingDataSchema = new Schema<IProcessingData>(
  {
    samplingPoint: { type: Schema.Types.ObjectId, ref: 'SamplingPoint', required: true },
    period: { type: periodSchema, required: true },
    wetTonnes: { type: Number, required: true, min: 0 },
    moisturePercent: { type: Number, required: true, min: 0, max: 100 },
    dryTonnes: { type: Number, min: 0 },
    status: {
      type: String,
      enum: Object.values(DataStatus),
      default: DataStatus.DRAFT,
    },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

processingDataSchema.pre('save', function () {
  this.dryTonnes = calcDryTonnes(this.wetTonnes, this.moisturePercent);
});

processingDataSchema.index(
  { samplingPoint: 1, 'period.periodType': 1, 'period.date': 1, 'period.shift': 1 },
  { unique: true }
);

processingDataSchema.index({ 'period.periodType': 1, 'period.date': 1 });

export const ProcessingData = mongoose.models.ProcessingData as mongoose.Model<IProcessingData> || mongoose.model<IProcessingData>('ProcessingData', processingDataSchema);
