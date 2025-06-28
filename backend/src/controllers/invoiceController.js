const { v4: uuidv4 } = require('uuid');

const generateInvoice = (req, res) => {
  const { usage, rates } = req.body;
  const cpuCost = (usage.cpuHours || 0) * (rates.cpu || 0.1);
  const memCost = (usage.memoryGBHours || 0) * (rates.memory || 0.05);
  const total = cpuCost + memCost;
  const invoice = { id: uuidv4(), total, issued: new Date().toISOString() };
  res.json({ invoice });
};

module.exports = { generateInvoice };
