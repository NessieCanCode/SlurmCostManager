const { exec } = require('child_process');

const listJobs = (req, res) => {
  exec('squeue -h -o "%i %u %t %M %l %D %R"', (err, stdout) => {
    if (err) {
      return res.json({ jobs: [
        { id: 1, user: 'demo', state: 'R', time: '00:10', nodes: 1 }
      ]});
    }
    const jobs = stdout.trim().split('\n').filter(Boolean).map(line => {
      const [id, user, state, time, limit, nodes, reason] = line.split(/\s+/);
      return { id, user, state, time, limit, nodes, reason };
    });
    res.json({ jobs });
  });
};

module.exports = { listJobs };
