export const PeriodType = {
  SHIFT: 'shift',
  DAILY: 'daily',
  MONTHLY: 'monthly',
} as const;
export type PeriodType = typeof PeriodType[keyof typeof PeriodType];

export const CircuitStage = {
  ROM: 'rom',
  CRUSHING: 'crushing',
  MILLING: 'milling',
  LEACHING: 'leaching',
  ELUTION: 'elution',
  SMELTING: 'smelting',
  TAILINGS: 'tailings',
} as const;
export type CircuitStage = typeof CircuitStage[keyof typeof CircuitStage];

export const MassBalanceRole = {
  FEED: 'feed',
  PRODUCT: 'product',
  TAILINGS: 'tailings',
} as const;
export type MassBalanceRole = typeof MassBalanceRole[keyof typeof MassBalanceRole];

export const DataStatus = {
  DRAFT: 'draft',
  PRELIMINARY: 'preliminary',
  FINAL: 'final',
  LOCKED: 'locked',
} as const;
export type DataStatus = typeof DataStatus[keyof typeof DataStatus];

export const UserRole = {
  MET_ACCOUNTANT: 'met_accountant',
  PLANT_MANAGER: 'plant_manager',
  LAB_TECHNICIAN: 'lab_technician',
  ADMIN: 'admin',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface Period {
  periodType: PeriodType;
  date: string;
  shift?: number;
}

/** Server-side Period with Date object (for MongoDB queries) */
export interface ServerPeriod {
  periodType: string;
  date: Date;
  shift?: number;
}

export interface StreamSummary {
  dryTonnes: number;
  weightedGrade: number;
  containedMetal: number;
}

export interface SamplingPoint {
  _id: string;
  code: string;
  name: string;
  circuitStage: CircuitStage;
  isInput: boolean;
  massBalanceRole?: MassBalanceRole | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ProcessingData {
  _id: string;
  samplingPoint: SamplingPoint;
  period: Period;
  wetTonnes: number;
  moisturePercent: number;
  dryTonnes: number;
  status: DataStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assay {
  _id: string;
  processingData: string | ProcessingData;
  samplingPoint: string | SamplingPoint;
  period: Period;
  grade: number;
  isVerified: boolean;
  labSampleId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MassBalance {
  _id: string;
  period: Period;
  feed: StreamSummary;
  product: StreamSummary;
  tailings: StreamSummary;
  unaccountedMetal: number;
  unaccountedPercent: number;
  status: DataStatus;
}

export interface Recovery {
  _id: string;
  period: Period;
  overallRecovery: number;
  budgetTarget?: number;
  variance?: number;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface Reconciliation {
  _id: string;
  period: Period;
  sourceAName: string;
  sourceBName: string;
  sourceAMetal: number;
  sourceBMetal: number;
  discrepancy: number;
  discrepancyPercent: number;
  threshold: number;
  isFlagged: boolean;
  isResolved: boolean;
  resolutionNotes?: string;
}
