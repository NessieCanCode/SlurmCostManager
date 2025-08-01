'use strict';

/**
 * Calculate charges from usage records applying rates and overrides.
 *
 * @param {Array} usage - Array of {account, date, core_hours}
 * @param {Object} config - Configuration with defaultRate, historicalRates, overrides
 * @returns {Object} charges grouped by month then account
 */
function calculateCharges(usage, config = {}) {
  const defaultRate = typeof config.defaultRate === 'number' ? config.defaultRate : 0.01;
  const historical = config.historicalRates || {};
  const overrides = config.overrides || {};

  const charges = {};

  for (const record of usage) {
    if (!record || typeof record.core_hours !== 'number') continue;
    const account = record.account || 'unknown';
    const month = (record.date || '').slice(0, 7); // YYYY-MM
    const ovr = overrides[account] || {};
    const rate = typeof ovr.rate === 'number'
      ? ovr.rate
      : (typeof historical[month] === 'number' ? historical[month] : defaultRate);
    let cost = record.core_hours * rate;
    if (typeof ovr.discount === 'number' && ovr.discount > 0 && ovr.discount < 1) {
      cost = cost * (1 - ovr.discount);
    }

    if (!charges[month]) charges[month] = {};
    if (!charges[month][account]) charges[month][account] = { core_hours: 0, cost: 0 };
    charges[month][account].core_hours += record.core_hours;
    charges[month][account].cost += cost;
  }

  return charges;
}

module.exports = {
  calculateCharges,
};
