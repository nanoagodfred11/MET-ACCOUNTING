/**
 * Demo Seed Script — Populates the system with 7 days of realistic CIL gold plant data.
 */
import mongoose from 'mongoose';
import { User } from '../app/lib/models/User.server';
import { SamplingPoint } from '../app/lib/models/SamplingPoint.server';
import { ProcessingData } from '../app/lib/models/ProcessingData.server';
import { Assay } from '../app/lib/models/Assay.server';
import { MassBalance } from '../app/lib/models/MassBalance.server';
import { Recovery } from '../app/lib/models/Recovery.server';
import { Reconciliation } from '../app/lib/models/Reconciliation.server';
import { MassBalanceService } from '../app/lib/services/massBalanceService.server';
import { RecoveryService } from '../app/lib/services/recoveryService.server';
import { ReconciliationService } from '../app/lib/services/reconciliationService.server';

const MONGODB_URI = 'mongodb://localhost:27017/met_accounting';

const DAILY_DATA = [
  {
    date: '2026-02-21',
    streams: {
      rom_feed:       { wetTonnes: 32500, moisture: 6.5, grade: 2.65 },
      crush_product:  { wetTonnes: 32200, moisture: 5.8, grade: 2.60 },
      mill_feed:      { wetTonnes: 31800, moisture: 5.5, grade: 2.58 },
      mill_discharge: { wetTonnes: 31800, moisture: 38.0, grade: 2.55 },
      cil_feed:       { wetTonnes: 31500, moisture: 40.0, grade: 2.50 },
      cil_tails:      { wetTonnes: 31400, moisture: 42.0, grade: 0.32 },
      elution_product:{ wetTonnes: 0.8, moisture: 0.5, grade: 52000.0 },
      smelted_gold:   { wetTonnes: 0.0795, moisture: 0.0, grade: 850000.0 },
    }
  },
  {
    date: '2026-02-22',
    streams: {
      rom_feed:       { wetTonnes: 33100, moisture: 6.2, grade: 2.71 },
      crush_product:  { wetTonnes: 32800, moisture: 5.5, grade: 2.68 },
      mill_feed:      { wetTonnes: 32400, moisture: 5.2, grade: 2.65 },
      mill_discharge: { wetTonnes: 32400, moisture: 37.5, grade: 2.62 },
      cil_feed:       { wetTonnes: 32100, moisture: 39.5, grade: 2.58 },
      cil_tails:      { wetTonnes: 32000, moisture: 41.5, grade: 0.29 },
      elution_product:{ wetTonnes: 0.85, moisture: 0.5, grade: 51500.0 },
      smelted_gold:   { wetTonnes: 0.0843, moisture: 0.0, grade: 855000.0 },
    }
  },
  {
    date: '2026-02-23',
    streams: {
      rom_feed:       { wetTonnes: 29800, moisture: 7.1, grade: 2.42 },
      crush_product:  { wetTonnes: 29500, moisture: 6.3, grade: 2.38 },
      mill_feed:      { wetTonnes: 29200, moisture: 5.9, grade: 2.35 },
      mill_discharge: { wetTonnes: 29200, moisture: 38.5, grade: 2.32 },
      cil_feed:       { wetTonnes: 28900, moisture: 40.5, grade: 2.28 },
      cil_tails:      { wetTonnes: 28800, moisture: 43.0, grade: 0.35 },
      elution_product:{ wetTonnes: 0.72, moisture: 0.5, grade: 50000.0 },
      smelted_gold:   { wetTonnes: 0.0660, moisture: 0.0, grade: 840000.0 },
    }
  },
  {
    date: '2026-02-24',
    streams: {
      rom_feed:       { wetTonnes: 31200, moisture: 6.8, grade: 2.55 },
      crush_product:  { wetTonnes: 30900, moisture: 6.0, grade: 2.52 },
      mill_feed:      { wetTonnes: 30600, moisture: 5.6, grade: 2.48 },
      mill_discharge: { wetTonnes: 30600, moisture: 37.8, grade: 2.45 },
      cil_feed:       { wetTonnes: 30300, moisture: 39.8, grade: 2.42 },
      cil_tails:      { wetTonnes: 30200, moisture: 42.2, grade: 0.31 },
      elution_product:{ wetTonnes: 0.78, moisture: 0.5, grade: 51000.0 },
      smelted_gold:   { wetTonnes: 0.0733, moisture: 0.0, grade: 848000.0 },
    }
  },
  {
    date: '2026-02-25',
    streams: {
      rom_feed:       { wetTonnes: 34000, moisture: 5.9, grade: 2.80 },
      crush_product:  { wetTonnes: 33700, moisture: 5.2, grade: 2.76 },
      mill_feed:      { wetTonnes: 33300, moisture: 4.8, grade: 2.72 },
      mill_discharge: { wetTonnes: 33300, moisture: 37.0, grade: 2.68 },
      cil_feed:       { wetTonnes: 33000, moisture: 39.0, grade: 2.65 },
      cil_tails:      { wetTonnes: 32900, moisture: 41.0, grade: 0.28 },
      elution_product:{ wetTonnes: 0.90, moisture: 0.5, grade: 53000.0 },
      smelted_gold:   { wetTonnes: 0.0893, moisture: 0.0, grade: 860000.0 },
    }
  },
  {
    date: '2026-02-26',
    streams: {
      rom_feed:       { wetTonnes: 30500, moisture: 7.5, grade: 2.38 },
      crush_product:  { wetTonnes: 30200, moisture: 6.7, grade: 2.35 },
      mill_feed:      { wetTonnes: 29900, moisture: 6.2, grade: 2.30 },
      mill_discharge: { wetTonnes: 29900, moisture: 39.0, grade: 2.28 },
      cil_feed:       { wetTonnes: 29600, moisture: 41.0, grade: 2.25 },
      cil_tails:      { wetTonnes: 29500, moisture: 43.5, grade: 0.38 },
      elution_product:{ wetTonnes: 0.68, moisture: 0.5, grade: 49500.0 },
      smelted_gold:   { wetTonnes: 0.0653, moisture: 0.0, grade: 835000.0 },
    }
  },
  {
    date: '2026-02-27',
    streams: {
      rom_feed:       { wetTonnes: 32000, moisture: 6.3, grade: 2.60 },
      crush_product:  { wetTonnes: 31700, moisture: 5.6, grade: 2.57 },
      mill_feed:      { wetTonnes: 31400, moisture: 5.3, grade: 2.53 },
      mill_discharge: { wetTonnes: 31400, moisture: 37.5, grade: 2.50 },
      cil_feed:       { wetTonnes: 31100, moisture: 39.5, grade: 2.48 },
      cil_tails:      { wetTonnes: 31000, moisture: 42.0, grade: 0.30 },
      elution_product:{ wetTonnes: 0.82, moisture: 0.5, grade: 51800.0 },
      smelted_gold:   { wetTonnes: 0.0775, moisture: 0.0, grade: 852000.0 },
    }
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    SamplingPoint.deleteMany({}),
    ProcessingData.deleteMany({}),
    Assay.deleteMany({}),
    MassBalance.deleteMany({}),
    Recovery.deleteMany({}),
    Reconciliation.deleteMany({}),
  ]);
  console.log('Cleared existing data\n');

  // Create admin user
  const adminUser = await User.create({
    username: 'admin',
    email: 'admin@met-accounting.local',
    password: 'admin123',
    role: 'admin',
  });
  console.log('Created admin user (admin / admin123)');

  // 1. Seed sampling points
  const spData = [
    { code: 'rom_feed', name: 'ROM Feed', circuitStage: 'rom', isInput: false, massBalanceRole: null, sortOrder: 1 },
    { code: 'crush_product', name: 'Crusher Product', circuitStage: 'crushing', isInput: false, massBalanceRole: null, sortOrder: 2 },
    { code: 'mill_feed', name: 'Mill Feed', circuitStage: 'milling', isInput: true, massBalanceRole: 'feed', sortOrder: 3 },
    { code: 'mill_discharge', name: 'Mill Discharge', circuitStage: 'milling', isInput: false, massBalanceRole: null, sortOrder: 4 },
    { code: 'cil_feed', name: 'CIL Feed', circuitStage: 'leaching', isInput: false, massBalanceRole: null, sortOrder: 5 },
    { code: 'cil_tails', name: 'CIL Tailings', circuitStage: 'tailings', isInput: false, massBalanceRole: 'tailings', sortOrder: 6 },
    { code: 'elution_product', name: 'Elution Product', circuitStage: 'elution', isInput: false, massBalanceRole: null, sortOrder: 7 },
    { code: 'smelted_gold', name: 'Smelted Gold Bar', circuitStage: 'smelting', isInput: false, massBalanceRole: 'product', sortOrder: 8 },
  ];

  const samplingPoints = await SamplingPoint.insertMany(spData.map(sp => ({ ...sp, isActive: true })));
  const spMap = new Map(samplingPoints.map(sp => [sp.code, sp]));
  console.log(`Created ${samplingPoints.length} sampling points`);

  // 2. Seed processing data + assays for each day
  for (const day of DAILY_DATA) {
    const period = { periodType: 'daily', date: new Date(day.date) };
    console.log(`\nSeeding ${day.date}...`);

    for (const [code, data] of Object.entries(day.streams)) {
      const sp = spMap.get(code)!;

      const pd = await ProcessingData.create({
        samplingPoint: sp._id,
        period,
        wetTonnes: data.wetTonnes,
        moisturePercent: data.moisture,
        status: 'final',
        enteredBy: adminUser._id,
      });

      await Assay.create({
        processingData: pd._id,
        samplingPoint: sp._id,
        period,
        grade: data.grade,
        isVerified: true,
        verifiedAt: new Date(),
      });
    }
    console.log(`  ✓ 8 processing data + 8 assays created`);
  }

  // 3. Calculate mass balance for each day
  const mbService = new MassBalanceService();

  console.log('\nCalculating mass balances...');
  for (const day of DAILY_DATA) {
    const period = { periodType: 'daily' as const, date: new Date(day.date) };
    const mb = await mbService.calculate(period);
    console.log(`  ${day.date}: Feed ${mb.feed.dryTonnes.toFixed(0)}t @ ${mb.feed.weightedGrade.toFixed(2)} g/t → ${mb.feed.containedMetal.toFixed(3)} kg | Product ${mb.product.containedMetal.toFixed(3)} kg | Unaccounted ${mb.unaccountedPercent.toFixed(2)}%`);
  }

  // 4. Calculate recovery for each day
  const recService = new RecoveryService();

  console.log('\nCalculating recoveries...');
  for (const day of DAILY_DATA) {
    const period = { periodType: 'daily' as const, date: new Date(day.date) };
    const rec = await recService.calculate(period);
    console.log(`  ${day.date}: Recovery ${rec.overallRecovery.toFixed(2)}% | Target ${rec.budgetTarget?.toFixed(1)}% | Variance ${rec.variance?.toFixed(2)}%`);
  }

  // 5. Calculate monthly mass balance
  console.log('\nCalculating monthly rollup...');
  const monthlyMb = await mbService.calculateMonthly(2026, 2);
  console.log(`  Feb 2026: Feed ${monthlyMb.feed.dryTonnes.toFixed(0)}t @ ${monthlyMb.feed.weightedGrade.toFixed(2)} g/t → ${monthlyMb.feed.containedMetal.toFixed(3)} kg`);
  console.log(`  Product: ${monthlyMb.product.containedMetal.toFixed(3)} kg (${(monthlyMb.product.containedMetal * 32.1507).toFixed(3)} oz)`);

  // 6. Create a reconciliation
  const reconService = new ReconciliationService();
  const plantMetal = monthlyMb.product.containedMetal;
  const refineryMetal = plantMetal * 0.985;

  const recon = await reconService.create({
    period: { periodType: 'monthly', date: new Date('2026-02-01') },
    sourceAName: 'Plant Product',
    sourceBName: 'Refinery Return',
    sourceAMetal: plantMetal,
    sourceBMetal: refineryMetal,
    threshold: 2.0,
  });
  console.log(`\nReconciliation: Plant ${plantMetal.toFixed(3)} kg vs Refinery ${refineryMetal.toFixed(3)} kg → Discrepancy ${recon.discrepancyPercent.toFixed(2)}% ${recon.isFlagged ? '⚠ FLAGGED' : '✓ OK'}`);

  console.log('\n=== SEED COMPLETE ===');
  console.log(`  7 days of data (Feb 21-27, 2026)`);
  console.log(`  56 processing data records`);
  console.log(`  56 assay results`);
  console.log(`  7 daily mass balances + 1 monthly`);
  console.log(`  7 recovery calculations`);
  console.log(`  1 reconciliation record`);
  console.log(`\nOpen http://localhost:5173 and login with:`);
  console.log(`  Username: admin`);
  console.log(`  Password: admin123 (or met2024)`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
