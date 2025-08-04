const assert = require('assert');
const { calculateCharges, loadRatesConfig } = require('../../src/cost-calculator');

function testFileConfig() {
  const usage = [
    { account: 'education', date: '2024-01-15', core_hours: 100 },
    { account: 'research', date: '2024-02-01', core_hours: 50 },
    { account: 'special', date: '2024-02-01', core_hours: 100 },
    { account: 'other', date: '2024-02-01', core_hours: 10 }
  ];
  const config = loadRatesConfig();
  const charges = calculateCharges(usage, config);
  assert.strictEqual(charges['2024-01'].education.cost, 100 * 0.015 * 0.5);
  assert.strictEqual(charges['2024-02'].research.cost, 50 * 0.01);
  assert.strictEqual(charges['2024-02'].special.cost, 100 * 0.025 * 0.9);
  assert.strictEqual(charges['2024-02'].other.cost, 10 * 0.02);
}

function testPassedConfig() {
  const usage = [
    { account: 'acct', date: '2024-03-01', core_hours: 100 }
  ];
  const config = { defaultRate: 0.02, historicalRates: { '2024-03': 0.03 }, overrides: { acct: { discount: 0.25 } } };
  const charges = calculateCharges(usage, config);
  assert.strictEqual(charges['2024-03'].acct.cost, 100 * 0.03 * 0.75);
}

function testInvalidUsageIgnored() {
  const usage = [
    { account: 'bad', date: '2024-04-01', core_hours: 'NaN' }
  ];
  const charges = calculateCharges(usage, { defaultRate: 0.01 });
  assert.deepStrictEqual(charges, {});
}

function run() {
  testFileConfig();
  testPassedConfig();
  testInvalidUsageIgnored();
  console.log('All calculator tests passed.');
}

if (require.main === module) {
  run();
}

module.exports = run;
