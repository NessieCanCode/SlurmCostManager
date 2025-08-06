'use strict';

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const schemaPromise = fs.promises
  .readFile(path.join(__dirname, 'rates-schema.json'), 'utf8')
  .then(JSON.parse);
const ajv = new Ajv();

/**
 * Load rate configuration from rates.json.
 *
 * @returns {Object} rate configuration
 */
async function loadRatesConfig() {
  const cfgPath = path.join(__dirname, 'rates.json');
  try {
    const [data, schema] = await Promise.all([
      fs.promises.readFile(cfgPath, 'utf8'),
      schemaPromise,
    ]);
    const cfg = JSON.parse(data);
    const valid = ajv.validate(schema, cfg);
    if (!valid) {
      const msg = ajv.errors?.[0]?.message || 'Invalid rate configuration';
      throw new Error(`Invalid rate configuration: ${msg}`);
    }
    return cfg;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return {};
    }
    if (e instanceof SyntaxError) {
      console.error(`Invalid JSON in rate configuration: ${e.message}`);
    } else {
      console.error(`Error loading rate configuration: ${e.message}`);
    }
    throw e;
  }
}

/**
 * Calculate charges from usage records applying rates and overrides.
 *
 * @param {Array} usage - Array of {account, date, core_hours}
 * @param {Object} config - Configuration with defaultRate, historicalRates, overrides
 * @returns {Object} charges grouped by month then account
 */
function calculateCharges(usage, config) {
  if (!config) {
    throw new Error('rate configuration required');
  }
  const defaultRate =
    typeof config.defaultRate === 'number' && config.defaultRate > 0
      ? config.defaultRate
      : 0;
  const historical = config.historicalRates || {};
  const overrides = config.overrides || {};

  const charges = {};

  for (const record of usage) {
    if (!record || typeof record.core_hours !== 'number' || record.core_hours <= 0) {
      continue;
    }
    const account = record.account || 'unknown';
    const month = (record.date || '').slice(0, 7); // YYYY-MM
    const ovr = overrides[account] || {};
    const rate = typeof ovr.rate === 'number'
      ? ovr.rate
      : (typeof historical[month] === 'number' ? historical[month] : defaultRate);
    const validRate = rate > 0 ? rate : 0;
    let cost = record.core_hours * validRate;
    const rawDiscount = typeof ovr.discount === 'number' ? ovr.discount : 0;
    const discount = Math.min(1, Math.max(0, rawDiscount));
    if (discount > 0) {
      cost *= (1 - discount);
    }

    if (!charges[month]) charges[month] = {};
    if (!charges[month][account]) {
      charges[month][account] = { core_hours: 0, cost: 0 };
    }
    charges[month][account].core_hours += record.core_hours;
    charges[month][account].cost += cost;
  }

  for (const month of Object.keys(charges)) {
    for (const account of Object.keys(charges[month])) {
      const entry = charges[month][account];
      entry.core_hours = Number(entry.core_hours.toFixed(2));
      entry.cost = Number(entry.cost.toFixed(2));
    }
  }

  return charges;
}

module.exports = {
  calculateCharges,
  loadRatesConfig,
};
