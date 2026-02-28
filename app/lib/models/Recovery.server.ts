import mongoose, { Schema, type Document } from 'mongoose';

const PeriodType = { SHIFT: 'shift', DAILY: 'daily', MONTHLY: 'monthly' } as const;

export interface IRecovery extends Document {
  period: { periodType: string; date: Date; shift?: number };
  massBalance: mongoose.Types.ObjectId;
  overallRecovery: number;
  budgetTarget?: number;
  variance?: number;
  stageRecoveries?: Map<string, number>;
  calculatedBy?: mongoose.Types.ObjectId;
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

const recoverySchema = new Schema<IRecovery>(
  {
    period: { type: periodSchema, required: true },
    massBalance: { type: Schema.Types.ObjectId, ref: 'MassBalance', required: true },
    overallRecovery: { type: Number, required: true },
    budgetTarget: { type: Number },
    variance: { type: Number },
    stageRecoveries: {
      type: Map,
      of: Number,
    },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

recoverySchema.index(
  { 'period.periodType': 1, 'period.date': 1, 'period.shift': 1 },
  { unique: true }
);
recoverySchema.index({ massBalance: 1 });

export const Recovery = mongoose.models.Recovery as mongoose.Model<IRecovery> || mongoose.model<IRecovery>('Recovery', recoverySchema);
