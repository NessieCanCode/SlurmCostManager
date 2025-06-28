const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const slurmRoutes = require('./routes/slurmRoutes');
const costRoutes = require('./routes/costRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SlurmCostManager API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/slurm', slurmRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/reports', reportRoutes);

const PORT = config.get('port');
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
