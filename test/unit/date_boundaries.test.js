const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const helper = path.join(__dirname, 'date_boundary_helper.js');

function runWithTZ(tz, dateStr) {
  return execFileSync(process.execPath, [helper, dateStr], {
    env: { TZ: tz },
    encoding: 'utf8'
  }).trim();
}

function testPositiveTimezone() {
  const output = runWithTZ('Pacific/Kiritimati', '2024-06-01T00:30:00');
  assert.strictEqual(output, '2024-06-01,2024-06-01');
}

function testNegativeTimezone() {
  const output = runWithTZ('Pacific/Honolulu', '2024-05-31T23:30:00');
  assert.strictEqual(output, '2024-05-01,2024-05-31');
}

function run() {
  testPositiveTimezone();
  testNegativeTimezone();
  console.log('All date boundary tests passed.');
}

if (require.main === module) {
  run();
}

module.exports = run;
