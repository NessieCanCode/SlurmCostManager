'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * Load rate configuration from rates.json.
 *
 * @returns {Promise<Object>} rate configuration
 */
async function loadRatesConfig() {
  const cfgPath = path.join(__dirname, 'rates.json');
  try {
    const data = await fs.readFile(cfgPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return {};
    }
    if (e instanceof SyntaxError) {
      console.error('Invalid JSON in rate configuration', {
        path: cfgPath,
        error: e.message,
      });
    } else {
      console.error('Error loading rate configuration', {
        path: cfgPath,
        error: e.message,
        code: e.code,
      });
    }
    throw e;
  }
}

/**
 * Normalize a usage record.
 *
 * @param {Object} record - Raw usage record
 * @returns {Object|null} normalized record or null if invalid
 */
function normalizeRecord(record) {
  if (!record) {
    return null;
  }
  const account = record.account || 'unknown';
  const month = (record.date || '').slice(0, 7); // YYYY-MM
  const coreHours =
    typeof record.core_hours === 'number' && record.core_hours > 0
      ? record.core_hours
      : 0;
  const gpuHours =
    typeof record.gpu_hours === 'number' && record.gpu_hours > 0
      ? record.gpu_hours
      : 0;
  if (coreHours <= 0 && gpuHours <= 0) {
    return null;
  }
  return { account, month, coreHours, gpuHours };
}

/**
 * Apply rates, overrides, and discounts to a normalized record.
 *
 * @param {Object} record - Normalized record
 * @param {Object} ctx - Rate context
 * @returns {Object} record with cost
 */
function applyRates(record, ctx) {
  const { account, month, coreHours, gpuHours } = record;
  const ovr = ctx.overrides[account] || {};
  const rate =
    typeof ovr.rate === 'number'
      ? ovr.rate
      : typeof ctx.historicalRates[month] === 'number'
        ? ctx.historicalRates[month]
        : ctx.defaultRate;
  const gpuRate =
    typeof ovr.gpuRate === 'number'
      ? ovr.gpuRate
      : typeof ctx.historicalGpuRates[month] === 'number'
        ? ctx.historicalGpuRates[month]
        : ctx.defaultGpuRate;
  const validRate = rate > 0 ? rate : 0;
  const validGpuRate = gpuRate > 0 ? gpuRate : 0;
  let cost = coreHours * validRate + gpuHours * validGpuRate;
  const rawDiscount = typeof ovr.discount === 'number' ? ovr.discount : 0;
  const discount = Math.min(1, Math.max(0, rawDiscount));
  if (discount > 0) {
    cost *= 1 - discount;
  }
  return { account, month, coreHours, gpuHours, cost };
}

/**
 * Accumulate a record's cost into the charges object.
 *
 * @param {Object} charges - Accumulator
 * @param {Object} record - Record with cost
 * @returns {Object} updated charges
 */
function accumulateCharge(charges, record) {
  const { account, month, coreHours, gpuHours, cost } = record;
  if (!charges[month]) charges[month] = {};
  if (!charges[month][account]) {
    charges[month][account] = { core_hours: 0, gpu_hours: 0, cost: 0 };
  }
  charges[month][account].core_hours += coreHours;
  charges[month][account].gpu_hours += gpuHours;
  charges[month][account].cost += cost;
  return charges;
}

/**
 * Calculate charges from usage records applying rates and overrides.
 *
 * @param {Array} usage - Array of {account, date, core_hours, gpu_hours}
 * @param {Object} config - Configuration with defaultRate, defaultGpuRate,
 * historicalRates, historicalGpuRates, overrides
 * @returns {Object} charges grouped by month then account
 */
function calculateCharges(usage, config) {
  if (!config) {
    throw new Error('rate configuration required');
  }
  const ctx = {
    defaultRate:
      typeof config.defaultRate === 'number' && config.defaultRate > 0
        ? config.defaultRate
        : 0,
    defaultGpuRate:
      typeof config.defaultGpuRate === 'number' && config.defaultGpuRate > 0
        ? config.defaultGpuRate
        : 0,
    historicalRates: config.historicalRates || {},
    historicalGpuRates: config.historicalGpuRates || {},
    overrides: config.overrides || {},
  };

  const charges = usage.reduce((acc, rec) => {
    const normalized = normalizeRecord(rec);
    if (!normalized) {
      return acc;
    }
    const costed = applyRates(normalized, ctx);
    return accumulateCharge(acc, costed);
  }, {});

  for (const month of Object.keys(charges)) {
    for (const account of Object.keys(charges[month])) {
      const entry = charges[month][account];
      entry.core_hours = Number(entry.core_hours.toFixed(2));
      entry.gpu_hours = Number(entry.gpu_hours.toFixed(2));
      entry.cost = Number(entry.cost.toFixed(2));
    }
  }

  return charges;
}

module.exports = {
  calculateCharges,
  loadRatesConfig,
  normalizeRecord,
  applyRates,
  accumulateCharge,
};
