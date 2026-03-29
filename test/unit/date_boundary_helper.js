global.React = {
  useState: () => {},
  useEffect: () => {},
  useRef: () => {},
  useCallback: () => {}
};

const { getBillingPeriod } = require('../../src/slurmledger.js');
const dateStr = process.argv[2];
const date = new Date(dateStr);
const { start, end } = getBillingPeriod(date);
console.log(`${start},${end}`);
