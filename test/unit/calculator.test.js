const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  calculateCharges,
  loadRatesConfig,
  normalizeRecord,
  applyRates,
  accumulateCharge,
} = require('../../src/cost-calculator');

async function testFileConfig() {
  const usage = [
    { account: 'education', date: '2024-01-15', core_hours: 100, gpu_hours: 10 },
    { account: 'research', date: '2024-02-01', core_hours: 50, gpu_hours: 5 },
    { account: 'special', date: '2024-02-01', core_hours: 100, gpu_hours: 20 },
    { account: 'other', date: '2024-02-01', core_hours: 10 }
  ];
  const config = await loadRatesConfig();
  const charges = calculateCharges(usage, config);
  assert.strictEqual(charges['2024-01'].education.cost, (100 * 0.015 + 10 * 0.15) * 0.5);
  assert.strictEqual(charges['2024-02'].research.cost, 50 * 0.01 + 5 * 0.1);
  assert.strictEqual(charges['2024-02'].special.cost, (100 * 0.025 + 20 * 0.25) * 0.9);
  assert.strictEqual(charges['2024-02'].other.cost, 10 * 0.02);
  assert.strictEqual(charges['2024-01'].education.gpu_hours, 10);
}

function testNormalizeRecord() {
  const rec = normalizeRecord({
    account: 'acct',
    date: '2024-03-15',
    core_hours: 5,
    gpu_hours: 2,
  });
  assert.deepStrictEqual(rec, {
    account: 'acct',
    month: '2024-03',
    coreHours: 5,
    gpuHours: 2,
  });
  assert.strictEqual(normalizeRecord({ core_hours: -1, gpu_hours: 0 }), null);
}

function testApplyRates() {
  const ctx = {
    defaultRate: 0.02,
    defaultGpuRate: 0.2,
    historicalRates: { '2024-03': 0.03 },
    historicalGpuRates: { '2024-03': 0.3 },
    overrides: { acct: { discount: 0.25 } },
  };
  const rec = { account: 'acct', month: '2024-03', coreHours: 100, gpuHours: 10 };
  const res = applyRates(rec, ctx);
  assert.strictEqual(res.cost, (100 * 0.03 + 10 * 0.3) * 0.75);
}

function testAccumulateCharge() {
  const charges = {};
  const rec = { account: 'acct', month: '2024-03', coreHours: 1, gpuHours: 2, cost: 3 };
  accumulateCharge(charges, rec);
  accumulateCharge(charges, rec);
  assert.deepStrictEqual(charges, {
    '2024-03': { acct: { core_hours: 2, gpu_hours: 4, cost: 6 } },
  });
}

function testPassedConfig() {
  const usage = [
    { account: 'acct', date: '2024-03-01', core_hours: 100, gpu_hours: 10 }
  ];
  const config = {
    defaultRate: 0.02,
    defaultGpuRate: 0.2,
    historicalRates: { '2024-03': 0.03 },
    historicalGpuRates: { '2024-03': 0.3 },
    overrides: { acct: { discount: 0.25 } }
  };
  const charges = calculateCharges(usage, config);
  assert.strictEqual(charges['2024-03'].acct.cost, (100 * 0.03 + 10 * 0.3) * 0.75);
}

function testInvalidUsageIgnored() {
  const usage = [
    { account: 'bad', date: '2024-04-01', core_hours: 'NaN', gpu_hours: 'NaN' }
  ];
  const charges = calculateCharges(usage, { defaultRate: 0.01 });
  assert.deepStrictEqual(charges, {});
}

async function testMissingConfig() {
  const cfgPath = path.join(__dirname, '../../src/rates.json');
  const backup = cfgPath + '.bak';
  fs.renameSync(cfgPath, backup);
  try {
    const cfg = await loadRatesConfig();
    assert.deepStrictEqual(cfg, {});
  } finally {
    fs.renameSync(backup, cfgPath);
  }
}

async function testInvalidConfig() {
  const cfgPath = path.join(__dirname, '../../src/rates.json');
  const original = fs.readFileSync(cfgPath, 'utf8');
  fs.writeFileSync(cfgPath, '{ invalid json', 'utf8');
  try {
    await assert.rejects(loadRatesConfig, SyntaxError);
  } finally {
    fs.writeFileSync(cfgPath, original, 'utf8');
  }
}

function testNegativeInputs() {
  const usage = [
    { account: 'negHours', date: '2024-05-01', core_hours: -5 },
    { account: 'negRate', date: '2024-05-01', core_hours: 5 },
    { account: 'discLow', date: '2024-05-01', core_hours: 5 },
    { account: 'discHigh', date: '2024-05-01', core_hours: 5 },
    { account: 'def', date: '2024-05-01', core_hours: 5 },
  ];
  const config = {
    defaultRate: -0.1,
    overrides: {
      negRate: { rate: -0.2 },
      discLow: { rate: 0.1, discount: -0.5 },
      discHigh: { rate: 0.1, discount: 1.5 },
    },
  };
  const charges = calculateCharges(usage, config);
  const may = charges['2024-05'];
  assert.ok(!('negHours' in may));
  assert.deepStrictEqual(may.negRate, { core_hours: 5, gpu_hours: 0, cost: 0 });
  assert.deepStrictEqual(may.discLow, { core_hours: 5, gpu_hours: 0, cost: 0.5 });
  assert.deepStrictEqual(may.discHigh, { core_hours: 5, gpu_hours: 0, cost: 0 });
  assert.deepStrictEqual(may.def, { core_hours: 5, gpu_hours: 0, cost: 0 });
}

function testRoundingTotals() {
  const usage = [
    { account: 'round', date: '2024-06-01', core_hours: 0.333 },
    { account: 'round', date: '2024-06-02', core_hours: 0.333 },
  ];
  const charges = calculateCharges(usage, { defaultRate: 0.333 });
  const june = charges['2024-06'];
  assert.strictEqual(june.round.core_hours, 0.67);
  assert.strictEqual(june.round.gpu_hours, 0);
  assert.strictEqual(june.round.cost, 0.22);
}

async function run() {
  testNormalizeRecord();
  testApplyRates();
  testAccumulateCharge();
  await testFileConfig();
  testPassedConfig();
  testInvalidUsageIgnored();
  await testMissingConfig();
  await testInvalidConfig();
  testNegativeInputs();
  testRoundingTotals();
  console.log('All calculator tests passed.');
}

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = run;
