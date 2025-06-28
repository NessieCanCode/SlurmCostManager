const config = require('config');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SlurmCostManager API' });
});

const PORT = config.get("port");
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
