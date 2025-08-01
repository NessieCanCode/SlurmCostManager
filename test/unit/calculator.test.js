const assert = require('assert');
const { calculateCharges } = require('../../src/cost-calculator');

function testDefaultRate() {
  const usage = [
    { account: 'acct1', date: '2024-06-01', core_hours: 100 },
    { account: 'acct1', date: '2024-06-02', core_hours: 50 }
  ];
  const charges = calculateCharges(usage, { defaultRate: 0.01 });
  assert.strictEqual(charges['2024-06'].acct1.cost, 150 * 0.01);
}

function testHistoricalRate() {
  const usage = [
    { account: 'acct1', date: '2024-07-01', core_hours: 100 }
  ];
  const charges = calculateCharges(usage, { defaultRate: 0.01, historicalRates: { '2024-07': 0.02 } });
  assert.strictEqual(charges['2024-07'].acct1.cost, 100 * 0.02);
}

function testAccountOverride() {
  const usage = [
    { account: 'acct2', date: '2024-06-01', core_hours: 200 }
  ];
  const charges = calculateCharges(usage, { defaultRate: 0.01, overrides: { acct2: { rate: 0.005 } } });
  assert.strictEqual(charges['2024-06'].acct2.cost, 200 * 0.005);
}

function testDiscount() {
  const usage = [
    { account: 'acct3', date: '2024-06-01', core_hours: 100 }
  ];
  const charges = calculateCharges(usage, { defaultRate: 0.01, overrides: { acct3: { discount: 0.5 } } });
  assert.strictEqual(charges['2024-06'].acct3.cost, 100 * 0.01 * 0.5);
}

function run() {
  testDefaultRate();
  testHistoricalRate();
  testAccountOverride();
  testDiscount();
  console.log('All calculator tests passed.');
}

if (require.main === module) {
  run();
}

module.exports = run;
