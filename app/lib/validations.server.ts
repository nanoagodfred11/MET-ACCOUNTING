import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
const periodType = z.enum(['daily', 'shift', 'monthly']);
const shiftNum = z.coerce.number().int().min(1).max(2).optional();

export const periodSchema = z.object({
  periodType,
  date: isoDate,
  shift: shiftNum,
});

export const createProcessingDataSchema = z.object({
  samplingPointId: z.string().min(1, 'Sampling point is required'),
  periodType,
  date: isoDate,
  shift: shiftNum,
  wetTonnes: z.coerce.number().min(0, 'Wet tonnes must be >= 0'),
  moisturePercent: z.coerce.number().min(0).max(100, 'Moisture must be 0-100%'),
  notes: z.string().optional().default(''),
});

export const updateProcessingDataSchema = z.object({
  id: z.string().min(1),
  wetTonnes: z.coerce.number().min(0, 'Wet tonnes must be >= 0'),
  moisturePercent: z.coerce.number().min(0).max(100, 'Moisture must be 0-100%'),
  notes: z.string().optional().default(''),
});

export const createAssaySchema = z.object({
  processingDataId: z.string().min(1),
  samplingPointId: z.string().min(1),
  periodType,
  date: isoDate,
  shift: shiftNum,
  grade: z.coerce.number().min(0, 'Grade must be >= 0'),
  labSampleId: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

/** Extract first Zod error message from a ZodError */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message || 'Validation failed';
}
