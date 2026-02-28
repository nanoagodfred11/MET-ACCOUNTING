import mongoose, { Schema, type Document } from 'mongoose';

const CircuitStage = {
  ROM: 'rom',
  CRUSHING: 'crushing',
  MILLING: 'milling',
  LEACHING: 'leaching',
  ELUTION: 'elution',
  SMELTING: 'smelting',
  TAILINGS: 'tailings',
} as const;

const MassBalanceRole = {
  FEED: 'feed',
  PRODUCT: 'product',
  TAILINGS: 'tailings',
} as const;

export interface ISamplingPoint extends Document {
  code: string;
  name: string;
  circuitStage: string;
  isInput: boolean;
  massBalanceRole?: string | null;
  isActive: boolean;
  sortOrder: number;
}

const samplingPointSchema = new Schema<ISamplingPoint>({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  circuitStage: {
    type: String,
    enum: Object.values(CircuitStage),
    required: true,
  },
  isInput: { type: Boolean, required: true },
  massBalanceRole: {
    type: String,
    enum: [...Object.values(MassBalanceRole), null],
    default: null,
  },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
});

samplingPointSchema.index({ circuitStage: 1 });
samplingPointSchema.index({ isInput: 1, isActive: 1 });

export const SamplingPoint = mongoose.models.SamplingPoint as mongoose.Model<ISamplingPoint> || mongoose.model<ISamplingPoint>('SamplingPoint', samplingPointSchema);
