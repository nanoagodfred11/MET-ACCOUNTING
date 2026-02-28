export const PRECISION = {
  WET_TONNES: 1,
  DRY_TONNES: 3,
  MOISTURE_PERCENT: 2,
  GRADE: 2,
  CONTAINED_METAL: 3,
  CONTAINED_METAL_OZ: 3,
  RECOVERY_PERCENT: 2,
  DISCREPANCY_PERCENT: 2,
} as const;

export const KG_TO_TROY_OZ = 32.1507;

export const THRESHOLDS = {
  PLANT_VS_REFINERY: 2.0,
  FEED_VS_PRODUCT: 5.0,
  DEFAULT: 3.0,
} as const;

export const SHIFTS = {
  COUNT: 2,
  DAY: { number: 1, label: 'Day Shift', start: '06:00', end: '18:00' },
  NIGHT: { number: 2, label: 'Night Shift', start: '18:00', end: '06:00' },
} as const;

export const DEFAULT_RECOVERY_TARGET = 87.0;

export const DEFAULT_SAMPLING_POINTS = [
  { code: 'rom_feed', name: 'ROM Feed', circuitStage: 'rom', isInput: false, massBalanceRole: null, sortOrder: 1 },
  { code: 'crush_product', name: 'Crusher Product', circuitStage: 'crushing', isInput: false, massBalanceRole: null, sortOrder: 2 },
  { code: 'mill_feed', name: 'Mill Feed', circuitStage: 'milling', isInput: true, massBalanceRole: 'feed', sortOrder: 3 },
  { code: 'mill_discharge', name: 'Mill Discharge', circuitStage: 'milling', isInput: false, massBalanceRole: null, sortOrder: 4 },
  { code: 'cil_feed', name: 'CIL Feed', circuitStage: 'leaching', isInput: false, massBalanceRole: null, sortOrder: 5 },
  { code: 'cil_tails', name: 'CIL Tailings', circuitStage: 'tailings', isInput: false, massBalanceRole: 'tailings', sortOrder: 6 },
  { code: 'elution_product', name: 'Elution Product', circuitStage: 'elution', isInput: false, massBalanceRole: null, sortOrder: 7 },
  { code: 'smelted_gold', name: 'Smelted Gold Bar', circuitStage: 'smelting', isInput: false, massBalanceRole: 'product', sortOrder: 8 },
] as const;

