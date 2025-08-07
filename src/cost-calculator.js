'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load rate configuration from rates.json.
 *
 * @returns {Object} rate configuration
 */
function loadRatesConfig() {
  const cfgPath = path.join(__dirname, 'rates.json');
  try {
    const data = fs.readFileSync(cfgPath, 'utf8');
    return JSON.parse(data);
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
 * @param {Array} usage - Array of {account, date, core_hours, gpu_hours}
 * @param {Object} config - Configuration with defaultRate, defaultGpuRate,
 * historicalRates, historicalGpuRates, overrides
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
  const defaultGpuRate =
    typeof config.defaultGpuRate === 'number' && config.defaultGpuRate > 0
      ? config.defaultGpuRate
      : 0;
  const historical = config.historicalRates || {};
  const gpuHistorical = config.historicalGpuRates || {};
  const overrides = config.overrides || {};

  const charges = {};

  for (const record of usage) {
    if (!record) {
      continue;
    }
    const account = record.account || 'unknown';
    const month = (record.date || '').slice(0, 7); // YYYY-MM
    const ovr = overrides[account] || {};
    const coreHours = typeof record.core_hours === 'number' && record.core_hours > 0 ? record.core_hours : 0;
    const gpuHours = typeof record.gpu_hours === 'number' && record.gpu_hours > 0 ? record.gpu_hours : 0;
    if (coreHours <= 0 && gpuHours <= 0) {
      continue;
    }
    const rate = typeof ovr.rate === 'number'
      ? ovr.rate
      : (typeof historical[month] === 'number' ? historical[month] : defaultRate);
    const gpuRate = typeof ovr.gpuRate === 'number'
      ? ovr.gpuRate
      : (typeof gpuHistorical[month] === 'number' ? gpuHistorical[month] : defaultGpuRate);
    const validRate = rate > 0 ? rate : 0;
    const validGpuRate = gpuRate > 0 ? gpuRate : 0;
    let cost = coreHours * validRate + gpuHours * validGpuRate;
    const rawDiscount = typeof ovr.discount === 'number' ? ovr.discount : 0;
    const discount = Math.min(1, Math.max(0, rawDiscount));
    if (discount > 0) {
      cost *= (1 - discount);
    }

    if (!charges[month]) charges[month] = {};
    if (!charges[month][account]) {
      charges[month][account] = { core_hours: 0, gpu_hours: 0, cost: 0 };
    }
    charges[month][account].core_hours += coreHours;
    charges[month][account].gpu_hours += gpuHours;
    charges[month][account].cost += cost;
  }

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
};
