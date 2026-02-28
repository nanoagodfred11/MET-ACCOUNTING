import mongoose, { Schema, type Document } from 'mongoose';
import { THRESHOLDS } from '../config/constants';

const PeriodType = { SHIFT: 'shift', DAILY: 'daily', MONTHLY: 'monthly' } as const;

export interface IReconciliation extends Document {
  period: { periodType: string; date: Date; shift?: number };
  sourceAName: string;
  sourceBName: string;
  sourceAMetal: number;
  sourceBMetal: number;
  discrepancy: number;
  discrepancyPercent: number;
  threshold: number;
  isFlagged: boolean;
  isResolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdBy?: mongoose.Types.ObjectId;
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

const reconciliationSchema = new Schema<IReconciliation>(
  {
    period: { type: periodSchema, required: true },
    sourceAName: { type: String, required: true, trim: true },
    sourceBName: { type: String, required: true, trim: true },
    sourceAMetal: { type: Number, required: true },
    sourceBMetal: { type: Number, required: true },
    discrepancy: { type: Number, required: true },
    discrepancyPercent: { type: Number, required: true },
    threshold: { type: Number, default: THRESHOLDS.DEFAULT },
    isFlagged: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

reconciliationSchema.index({ 'period.periodType': 1, 'period.date': 1 });
reconciliationSchema.index({ isFlagged: 1, isResolved: 1, createdAt: -1 });

export const Reconciliation = mongoose.models.Reconciliation as mongoose.Model<IReconciliation> || mongoose.model<IReconciliation>('Reconciliation', reconciliationSchema);
