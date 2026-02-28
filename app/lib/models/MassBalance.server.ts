import mongoose, { Schema, type Document } from 'mongoose';

const PeriodType = { SHIFT: 'shift', DAILY: 'daily', MONTHLY: 'monthly' } as const;
const DataStatus = { DRAFT: 'draft', PRELIMINARY: 'preliminary', FINAL: 'final', LOCKED: 'locked' } as const;

export interface IMassBalance extends Document {
  period: { periodType: string; date: Date; shift?: number };
  feed: { dryTonnes: number; weightedGrade: number; containedMetal: number };
  product: { dryTonnes: number; weightedGrade: number; containedMetal: number };
  tailings: { dryTonnes: number; weightedGrade: number; containedMetal: number };
  unaccountedMetal: number;
  unaccountedPercent: number;
  status: string;
  calculatedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
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

const streamSummarySchema = new Schema(
  {
    dryTonnes: { type: Number, required: true, default: 0 },
    weightedGrade: { type: Number, required: true, default: 0 },
    containedMetal: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const massBalanceSchema = new Schema<IMassBalance>(
  {
    period: { type: periodSchema, required: true },
    feed: { type: streamSummarySchema, required: true },
    product: { type: streamSummarySchema, required: true },
    tailings: { type: streamSummarySchema, required: true },
    unaccountedMetal: { type: Number, required: true, default: 0 },
    unaccountedPercent: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: Object.values(DataStatus),
      default: DataStatus.DRAFT,
    },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

massBalanceSchema.index(
  { 'period.periodType': 1, 'period.date': 1, 'period.shift': 1 },
  { unique: true }
);

export const MassBalance = mongoose.models.MassBalance as mongoose.Model<IMassBalance> || mongoose.model<IMassBalance>('MassBalance', massBalanceSchema);
