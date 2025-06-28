const calculateCost = (req, res) => {
  const { cpuHours = 0, memoryGBHours = 0, cpuRate = 0.1, memoryRate = 0.05 } = req.body;
  const cost = cpuHours * cpuRate + memoryGBHours * memoryRate;
  res.json({ cost });
};

module.exports = { calculateCost };
