/**
 * Seeds demo data for today (2026-03-01) without clearing existing data.
 */
import mongoose from 'mongoose';
import { User } from '../app/lib/models/User.server';
import { SamplingPoint } from '../app/lib/models/SamplingPoint.server';
import { ProcessingData } from '../app/lib/models/ProcessingData.server';
import { Assay } from '../app/lib/models/Assay.server';
import { MassBalanceService } from '../app/lib/services/massBalanceService.server';
import { RecoveryService } from '../app/lib/services/recoveryService.server';
import { ReconciliationService } from '../app/lib/services/reconciliationService.server';

const MONGODB_URI = 'mongodb://localhost:27017/met_accounting';

const TODAY = '2026-03-01';

const STREAMS: Record<string, { wetTonnes: number; moisture: number; grade: number }> = {
  rom_feed:        { wetTonnes: 31800, moisture: 6.7, grade: 2.58 },
  crush_product:   { wetTonnes: 31500, moisture: 5.9, grade: 2.54 },
  mill_feed:       { wetTonnes: 31100, moisture: 5.4, grade: 2.51 },
  mill_discharge:  { wetTonnes: 31100, moisture: 37.8, grade: 2.48 },
  cil_feed:        { wetTonnes: 30800, moisture: 39.8, grade: 2.44 },
  cil_tails:       { wetTonnes: 30700, moisture: 42.5, grade: 0.33 },
  elution_product: { wetTonnes: 0.76, moisture: 0.5, grade: 51200.0 },
  smelted_gold:    { wetTonnes: 0.0748, moisture: 0.0, grade: 847000.0 },
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // Get admin user
  let admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    admin = await User.create({
      username: 'admin',
      email: 'admin@met-accounting.local',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Created admin user');
  }

  // Ensure sampling points exist
  let samplingPoints = await SamplingPoint.find({}).exec();
  if (samplingPoints.length === 0) {
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
    samplingPoints = await SamplingPoint.insertMany(spData.map(sp => ({ ...sp, isActive: true })));
    console.log('Created sampling points');
  }

  const spMap = new Map(samplingPoints.map(sp => [sp.code, sp]));

  // Clear any existing data for today
  const todayDate = new Date(TODAY);
  const todayQuery = { 'period.periodType': 'daily', 'period.date': todayDate };
  await ProcessingData.deleteMany(todayQuery);
  await Assay.deleteMany(todayQuery);
  console.log(`Cleared existing data for ${TODAY}`);

  // Seed processing data + assays
  const period = { periodType: 'daily', date: todayDate };

  for (const [code, data] of Object.entries(STREAMS)) {
    const sp = spMap.get(code)!;

    const pd = await ProcessingData.create({
      samplingPoint: sp._id,
      period,
      wetTonnes: data.wetTonnes,
      moisturePercent: data.moisture,
      status: 'final',
      enteredBy: admin._id,
    });

    await Assay.create({
      processingData: pd._id,
      samplingPoint: sp._id,
      period,
      grade: data.grade,
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: admin._id,
    });
  }
  console.log('Created 8 processing data + 8 assays');

  // Calculate mass balance
  const mbService = new MassBalanceService();
  const mb = await mbService.calculate(period, admin._id.toString());
  console.log(`Mass balance: Feed ${mb.feed.dryTonnes.toFixed(0)}t @ ${mb.feed.weightedGrade.toFixed(2)} g/t → ${mb.feed.containedMetal.toFixed(3)} kg | Product ${mb.product.containedMetal.toFixed(3)} kg | Unaccounted ${mb.unaccountedPercent.toFixed(2)}%`);

  // Calculate recovery
  const recService = new RecoveryService();
  const rec = await recService.calculate(period, undefined, admin._id.toString());
  console.log(`Recovery: ${rec!.overallRecovery.toFixed(2)}% | Variance ${rec!.variance?.toFixed(2)}%`);

  // Reconciliation
  const reconService = new ReconciliationService();
  const refineryMetal = mb.product.containedMetal * 0.988;
  const recon = await reconService.create({
    period,
    sourceAName: 'Plant Product',
    sourceBName: 'Refinery Return',
    sourceAMetal: mb.product.containedMetal,
    sourceBMetal: refineryMetal,
    threshold: 2.0,
  }, admin._id.toString());
  console.log(`Reconciliation: Discrepancy ${recon.discrepancyPercent.toFixed(2)}% ${recon.isFlagged ? '⚠ FLAGGED' : '✓ OK'}`);

  console.log(`\n=== Today (${TODAY}) seeded successfully ===`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
