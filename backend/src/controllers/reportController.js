const getReports = (req, res) => {
  // Dummy data for demonstration
  const reports = [{ user: 'demo', cpuHours: 10, memoryGBHours: 20 }];
  res.json({ reports });
};

module.exports = { getReports };
