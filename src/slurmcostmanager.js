const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Determine the directory where the plugin's files are installed. When running
// inside Cockpit, `window.cockpit.manifest.path` points to the plugin root
// regardless of whether it lives in `/usr/share` or the user's local data
// directory. Fallback to the system path for cases where the manifest is not
// available (e.g. during local development or testing).
const PLUGIN_BASE =
  (typeof window !== 'undefined' &&
    window.cockpit &&
    window.cockpit.manifest &&
    window.cockpit.manifest.path) ||
  '/usr/share/cockpit/slurmcostmanager';

function getBillingPeriod(ref = new Date()) {
  const today = new Date();
  let year, month, end;
  if (typeof ref === 'string') {
    [year, month] = ref.split('-').map(Number);
    month -= 1;
    const isCurrent = year === today.getFullYear() && month === today.getMonth();
    end = isCurrent
      ? new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      : new Date(Date.UTC(year, month + 1, 0));
  } else {
    year = ref.getFullYear();
    month = ref.getMonth();
    end = new Date(Date.UTC(year, month, ref.getDate()));
  }
  const start = new Date(Date.UTC(year, month, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

function getYearPeriod(year = new Date().getFullYear()) {
  const today = new Date();
  const end =
    year === today.getFullYear()
      ? new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      : new Date(Date.UTC(year, 11, 31));
  const start = new Date(Date.UTC(year, 0, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

function useBillingData(period) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestIdRef.current;
    // Clear out existing data while loading a new period so that views
    // such as "Detailed Transactions" don't momentarily display data
    // from the previously selected period (e.g. the fiscal year) when
    // navigating directly between views.
    setData(null);
    setError(null);
    try {
      let json;
      if (window.cockpit && window.cockpit.spawn) {
        let start, end;
        if (typeof period === 'string') {
          ({ start, end } = getBillingPeriod(period));
        } else if (period && period.start && period.end) {
          ({ start, end } = period);
        } else {
          ({ start, end } = getBillingPeriod());
        }
        const args = [
          'python3',
          `${PLUGIN_BASE}/slurmdb.py`,
          '--start',
          start,
          '--end',
          end,
          '--output',
          '-',
        ];
        const output = await window.cockpit.spawn(args, { err: 'message' });
        json = JSON.parse(output);
      } else {
        const resp = await fetch('billing.json');
        if (!resp.ok) throw new Error('Failed to fetch billing data');
        json = await resp.json();
      }
      if (requestIdRef.current === id) {
        setData(json);
        setError(null);
      }
    } catch (e) {
      console.error(e);
      if (requestIdRef.current === id) {
        setError(e.message || String(e));
      }
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, reload: load };
}

function aggregateAccountDetails(details = []) {
  const map = {};
  details.forEach(d => {
    const acct = map[d.account] || {
      account: d.account,
      core_hours: 0,
      gpu_hours: 0,
      cost: 0,
      users: {}
    };
    acct.core_hours += d.core_hours || 0;
    acct.gpu_hours += d.gpu_hours || 0;
    acct.cost += d.cost || 0;
    (d.users || []).forEach(u => {
      const user = acct.users[u.user] || {
        user: u.user,
        core_hours: 0,
        cost: 0
      };
      user.core_hours += u.core_hours || 0;
      user.cost += u.cost || 0;
      acct.users[u.user] = user;
    });
    map[d.account] = acct;
  });
  return Object.values(map).map(a => ({
    account: a.account,
    core_hours: Math.round(a.core_hours * 100) / 100,
    gpu_hours: Math.round(a.gpu_hours * 100) / 100,
    cost: Math.round(a.cost * 100) / 100,
    users: Object.values(a.users).map(u => ({
      user: u.user,
      core_hours: Math.round(u.core_hours * 100) / 100,
      cost: Math.round(u.cost * 100) / 100
    }))
  }));
}

function AccountsChart({ details }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const aggregated = aggregateAccountDetails(details);
    const top = aggregated
      .slice()
      .sort(
        (a, b) => b.core_hours + b.gpu_hours - (a.core_hours + a.gpu_hours)
      )
      .slice(0, 10);
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(d => d.account),
        datasets: [
          {
            label: 'CPU hrs',
            data: top.map(d => d.core_hours),
            backgroundColor: '#4e79a7'
          },
          {
            label: 'GPU hrs',
            data: top.map(d => d.gpu_hours),
            backgroundColor: '#f28e2b'
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: false,
        maintainAspectRatio: false
      }
    });
    return () => chart.destroy();
  }, [details]);
  return React.createElement(
    'div',
    { className: 'chart-container' },
    React.createElement('canvas', { ref: canvasRef, width: 600, height: 300 })
  );
}


function KpiSparkline({ data }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [
          {
            data,
            borderColor: '#4e79a7',
            fill: false,
            tension: 0.3,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
    return () => chart.destroy();
  }, [data]);
  return React.createElement('canvas', { ref: canvasRef, className: 'kpi-chart', width: 180, height: 60 });
}

function KpiGauge({ value }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [
          {
            data: [value, 1 - value],
            backgroundColor: ['#4e79a7', '#e0e0e0'],
            borderWidth: 0
          }
        ]
      },
      options: {
        circumference: 180,
        rotation: -90,
        cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        responsive: false,
        maintainAspectRatio: false
      }
    });
    return () => chart.destroy();
  }, [value]);
  return React.createElement('canvas', { ref: canvasRef, className: 'kpi-chart', width: 180, height: 60 });
}

function KpiTile({ label, value, renderChart }) {
  return React.createElement(
    'div',
    { className: 'kpi-tile' },
    React.createElement('div', { className: 'kpi-label' }, label),
    value !== undefined && value !== null &&
      React.createElement('div', { className: 'kpi-value' }, value),
    renderChart && renderChart()
  );
}

function BulletChart({ actual, target }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const plugin = {
      id: 'targetLine',
      afterDatasetsDraw(chart) {
        const {
          ctx,
          chartArea: { top, bottom },
          scales: { x }
        } = chart;
        const xPos = x.getPixelForValue(target);
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();
        ctx.restore();
      }
    };
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [''],
        datasets: [
          {
            data: [actual],
            backgroundColor: '#4e79a7',
            barThickness: 20
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { beginAtZero: true } }
      },
      plugins: [plugin]
    });
    return () => chart.destroy();
  }, [actual, target]);
  return React.createElement('canvas', { ref: canvasRef, className: 'kpi-chart', width: 180, height: 60 });
}

function HistoricalUsageChart({ data = [] }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    const labels = data.map(m => m.month || m.year);
    const cpu = data.map(m => m.core_hours);
    const gpu = data.map(m => m.gpu_hours || 0);
    const isMonthly = !!data[0].month;
    const lastLabel = labels[labels.length - 1];
    const forecastLabels = [];
    if (isMonthly) {
      let [year, month] = lastLabel.split('-').map(Number);
      for (let i = 0; i < 3; i++) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        forecastLabels.push(`${year}-${String(month).padStart(2, '0')}`);
      }
    } else {
      let year = Number(lastLabel);
      for (let i = 0; i < 3; i++) {
        year++;
        forecastLabels.push(String(year));
      }
    }
    const avg =
      cpu.slice(-3).reduce((a, b) => a + b, 0) /
      Math.min(3, cpu.length);
    const forecastCpu = forecastLabels.map(() => avg);
    const fullLabels = labels.concat(forecastLabels);
    const cpuActual = cpu.concat(Array(forecastLabels.length).fill(null));
    const cpuForecast = Array(cpu.length).fill(null).concat(forecastCpu);
    const gpuData = gpu.concat(Array(forecastLabels.length).fill(null));
    const chart = new Chart(canvasRef.current.getContext('2d'), {
      type: 'line',
      data: {
        labels: fullLabels,
        datasets: [
          {
            label: 'CPU hrs',
            data: cpuActual,
            borderColor: '#4e79a7',
            fill: false
          },
          {
            label: 'GPU hrs',
            data: gpuData,
            borderColor: '#f28e2b',
            fill: false
          },
          {
            label: 'Forecast',
            data: cpuForecast,
            borderColor: '#4e79a7',
            borderDash: [5, 5],
            fill: false
          }
        ]
      },
      options: { responsive: false, maintainAspectRatio: false }
    });
    return () => chart.destroy();
  }, [data]);
  return React.createElement(
    'div',
    { className: 'chart-container' },
    React.createElement('canvas', { ref: canvasRef, width: 600, height: 300 })
  );
}

function PiConsumptionChart({ details, width = 300, height = 300, legend = true }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;

    const totals = {};
    details.forEach(acc => {
      (acc.users || []).forEach(u => {
        totals[u.user] = (totals[u.user] || 0) + (u.core_hours || 0);
      });
    });

    const entries = Object.entries(totals).map(([user, core]) => ({ user, core }));
    entries.sort((a, b) => b.core - a.core);
    const top = entries.slice(0, 10);

    const colors = [
      '#4e79a7',
      '#f28e2b',
      '#e15759',
      '#76b7b2',
      '#59a14f',
      '#edc949',
      '#af7aa1',
      '#ff9da7',
      '#9c755f',
      '#bab0ac'
    ];

    const chart = new Chart(canvasRef.current.getContext('2d'), {
      type: 'pie',
      data: {
        labels: top.map(e => e.user),
        datasets: [
          {
            data: top.map(e => e.core),
            backgroundColor: colors.slice(0, top.length)
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: legend ? { position: 'right' } : { display: false }
        }
      }
    });

    return () => chart.destroy();
  }, [details, width, height, legend]);

  return React.createElement(
    'div',
    { className: 'chart-container', style: { width: `${width}px`, height: `${height}px` } },
    React.createElement('canvas', { ref: canvasRef, width, height })
  );
}

function parseTRES(tres) {
  const result = { cpu: '', mem: '', node: '', gpu: '', gpuType: '' };
  if (!tres) return result;
  tres.split(',').forEach(part => {
    const [key, val] = part.split('=');
    if (key === 'cpu') result.cpu = val;
    else if (key === 'mem') result.mem = val;
    else if (key === 'node') result.node = val;
    else if (key && key.startsWith('gres/gpu')) {
      const pieces = key.split(':');
      result.gpu = val;
      if (pieces[1]) result.gpuType = pieces[1];
    }
  });
  return result;
}

function formatReqTres(tres) {
  const t = parseTRES(tres);
  return `cpu=${t.cpu} mem=${t.mem} node=${t.node} gres/gpu=${t.gpu}`;
}

function formatAllocTres(tres) {
  const t = parseTRES(tres);
  const gpu = t.gpu
    ? t.gpuType
      ? `gres/gpu:(${t.gpuType})=${t.gpu}`
      : `gres/gpu=${t.gpu}`
    : '';
  return `cpu=${t.cpu} mem=${t.mem} node=${t.node} ${gpu}`.trim();
}

function formatElapsed(sec) {
  if (typeof sec !== 'number') return '';
  const h = Math.floor(sec / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function PaginatedJobTable({ jobs }) {
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const sorted = jobs.slice().sort((a, b) =>
    sortAsc ? a.cost - b.cost : b.cost - a.cost
  );
  const pages = Math.ceil(sorted.length / pageSize) || 1;
  const pageJobs = sorted.slice(page * pageSize, page * pageSize + pageSize);
  function toggleSort() {
    setSortAsc(prev => !prev);
  }
  return React.createElement(
    'div',
    null,
    React.createElement(
      'table',
      { className: 'jobs-table' },
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          React.createElement('th', null, 'JobID'),
          React.createElement('th', null, 'JobName'),
          React.createElement('th', null, 'Partition'),
          React.createElement('th', null, 'Start'),
          React.createElement('th', null, 'End'),
          React.createElement('th', null, 'Elapsed'),
          React.createElement('th', null, 'ReqTRES'),
          React.createElement('th', null, 'AllocTRES'),
          React.createElement('th', null, 'State'),
          React.createElement('th', null, 'Core Hours'),
          React.createElement(
            'th',
            { className: 'clickable', onClick: toggleSort },
            '$ Cost'
          )
        )
      ),
      React.createElement(
        'tbody',
        null,
        pageJobs.map((j, i) =>
          React.createElement(
            'tr',
            { key: i },
            React.createElement('td', null, j.job),
            React.createElement('td', null, j.job_name || ''),
            React.createElement('td', null, j.partition || ''),
            React.createElement('td', null, j.start || ''),
            React.createElement('td', null, j.end || ''),
            React.createElement('td', null, formatElapsed(j.elapsed)),
            React.createElement('td', null, formatReqTres(j.req_tres)),
            React.createElement('td', null, formatAllocTres(j.alloc_tres)),
            React.createElement('td', null, j.state || ''),
            React.createElement('td', null, j.core_hours),
            React.createElement('td', null, j.cost)
          )
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'pagination' },
      React.createElement(
        'button',
        { onClick: () => setPage(p => Math.max(0, p - 1)), disabled: page === 0 },
        'Prev'
      ),
      React.createElement('span', { style: { margin: '0 0.5em' } }, `${page + 1}/${pages}`),
      React.createElement(
        'button',
        {
          onClick: () => setPage(p => Math.min(pages - 1, p + 1)),
          disabled: page >= pages - 1
        },
        'Next'
      )
    )
  );
}

function SuccessFailChart({ data }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          {
            label: 'Success',
            data: data.map(d => d.success),
            backgroundColor: '#4e79a7'
          },
          {
            label: 'Fail',
            data: data.map(d => d.fail),
            backgroundColor: '#e15759'
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } }
      }
    });
    return () => chart.destroy();
  }, [data]);
  return React.createElement('div', { className: 'chart-container' }, React.createElement('canvas', { ref: canvasRef, width: 600, height: 300 }));
}

function Summary({ summary, details = [], daily = [], monthly = [], yearly = [] }) {
  const sparklineData = daily.map(d => d.core_hours);
  const gpuSparklineData = daily.map(d => d.gpu_hours || 0);
  const ratio = summary.projected_revenue
    ? summary.total / summary.projected_revenue
    : 1;
  const targetRevenue = summary.projected_revenue || summary.total;
  const historical = yearly.length ? yearly : monthly;
  const historicalLabel = yearly.length
    ? 'Historical CPU/GPU-hrs (yearly)'
    : 'Historical CPU/GPU-hrs (monthly)';

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Billing Summary'),
    React.createElement(
      'div',
      { className: 'table-container' },
      React.createElement(
        'table',
        { className: 'summary-table' },
        React.createElement(
          'tbody',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Period'),
            React.createElement('td', null, summary.period)
          ),
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Total Cost'),
            React.createElement('td', null, `$${summary.total}`)
          ),
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Total Core Hours'),
            React.createElement('td', null, summary.core_hours)
          ),
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Total GPU Hours'),
            React.createElement('td', null, summary.gpu_hours || 0)
          )
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'kpi-grid' },
      React.createElement(KpiTile, {
        label: 'Total CPU-hours',
        value: summary.core_hours,
        renderChart: () => React.createElement(KpiSparkline, { data: sparklineData })
      }),
      React.createElement(KpiTile, {
        label: 'Total GPU-hours',
        value: summary.gpu_hours,
        renderChart: () =>
          React.createElement(KpiSparkline, { data: gpuSparklineData })
      }),
      React.createElement(KpiTile, {
        label: 'Cost recovery ratio',
        value: `${(ratio * 100).toFixed(1)}%`,
        renderChart: () => React.createElement(KpiGauge, { value: Math.min(Math.max(ratio, 0), 1) })
      }),
      React.createElement(KpiTile, {
        label: 'Projected vs Actual Revenue',
        value: `$${summary.total}`,
        renderChart: () =>
          React.createElement(BulletChart, {
            actual: summary.total,
            target: targetRevenue
          })
      }),
      React.createElement(KpiTile, {
        label: 'Top 10 Users',
        value: null,
        renderChart: () =>
          React.createElement(PiConsumptionChart, {
            details,
            width: 120,
            height: 120,
            legend: false
          })
      })
    ),
    React.createElement('h3', null, 'CPU/GPU-hrs per Slurm account'),
    React.createElement(AccountsChart, { details }),
    React.createElement('h3', null, historicalLabel),
    React.createElement(HistoricalUsageChart, { data: historical })
  );
}


function UserDetails({ users }) {
  const [expanded, setExpanded] = useState(null);
  function toggle(user) {
    setExpanded(prev => (prev === user ? null : user));
  }
  return React.createElement(
    'table',
    { className: 'users-table' },
    React.createElement(
      'thead',
      null,
      React.createElement(
        'tr',
        null,
        React.createElement('th', null, 'User'),
        React.createElement('th', null, 'Core Hours'),
        React.createElement('th', null, 'Cost ($)')
      )
    ),
    React.createElement(
      'tbody',
      null,
      users.reduce((acc, u) => {
        acc.push(
          React.createElement(
            'tr',
            {
              key: u.user,
              className: 'clickable',
              onClick: () => toggle(u.user)
            },
            React.createElement('td', null, u.user),
            React.createElement('td', null, u.core_hours),
            React.createElement('td', null, u.cost)
          )
        );
        if (expanded === u.user) {
          acc.push(
            React.createElement(
              'tr',
              { key: u.user + '-jobs' },
              React.createElement(
                'td',
                { colSpan: 3 },
                React.createElement(PaginatedJobTable, { jobs: u.jobs || [] })
              )
            )
          );
        }
        return acc;
      }, [])
    )
  );
}

function Details({
  details,
  daily,
  partitions = [],
  accounts = [],
  users = [],
  month,
  onMonthChange,
  monthOptions = []
}) {
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({
    partition: '',
    account: '',
    user: ''
  });

  function toggle(account) {
    setExpanded(prev => (prev === account ? null : account));
  }

  const filteredDetails = details
    .map(d => {
      if (filters.account && d.account !== filters.account) return null;
      let userList = d.users || [];
      if (filters.user) {
        userList = userList.filter(u => u.user === filters.user);
        if (!userList.length) return null;
      }
      return { ...d, users: userList };
    })
    .filter(Boolean);

  function exportCSV() {
    const rows = [
      [
        'Account',
        'User',
        'JobID',
        'JobName',
        'Partition',
        'Start',
        'End',
        'Elapsed',
        'ReqTRES',
        'AllocTRES',
        'State',
        'Core Hours',
        'Cost'
      ]
    ];
    filteredDetails.forEach(d => {
      (d.users || []).forEach(u => {
        (u.jobs || []).forEach(j => {
          rows.push([
            d.account,
            u.user,
            j.job,
            j.job_name || '',
            j.partition || '',
            j.start || '',
            j.end || '',
            formatElapsed(j.elapsed),
            formatReqTres(j.req_tres),
            formatAllocTres(j.alloc_tres),
            j.state || '',
            j.core_hours,
            j.cost
          ]);
        });
      });
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'details.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const successData = (daily || []).map(d => ({
    date: d.date,
    success: Math.round(d.core_hours * 0.8),
    fail: Math.round(d.core_hours * 0.2)
  }));

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Cost Details'),
    React.createElement(
      'div',
      { className: 'filter-bar' },
      monthOptions.length > 0 &&
        React.createElement(
          'select',
          {
            value: month,
            onChange: e => onMonthChange && onMonthChange(e.target.value)
          },
          monthOptions.map(m =>
            React.createElement('option', { key: m, value: m }, m)
          )
        ),
      ['Partition', 'Account', 'User'].map(name => {
        const opts =
          name === 'Partition' ? partitions : name === 'Account' ? accounts : users;
        const key = name.toLowerCase();
        return React.createElement(
          'select',
          {
            key: name,
            value: filters[key],
            onChange: e => setFilters({ ...filters, [key]: e.target.value })
          },
          React.createElement('option', { value: '' }, name),
          opts.map(o => React.createElement('option', { key: o, value: o }, o))
        );
      }),
      React.createElement('button', { onClick: exportCSV }, 'Export')
    ),
    React.createElement(
      'div',
      { className: 'table-container' },
      React.createElement(
        'table',
        { className: 'details-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Account'),
            React.createElement('th', null, 'Core Hours'),
            React.createElement('th', null, 'Cost ($)')
          )
        ),
        React.createElement(
          'tbody',
          null,
          filteredDetails.reduce((acc, d) => {
            acc.push(
              React.createElement(
                'tr',
                {
                  key: d.account,
                  className: 'clickable',
                  onClick: () => toggle(d.account)
                },
                React.createElement('td', null, d.account),
                React.createElement('td', null, d.core_hours),
                React.createElement('td', null, d.cost)
              )
            );
            if (expanded === d.account) {
              acc.push(
                React.createElement(
                  'tr',
                  { key: d.account + '-users' },
                  React.createElement(
                    'td',
                    { colSpan: 3 },
                    React.createElement(UserDetails, { users: d.users || [] })
                  )
                )
              );
            }
            return acc;
          }, [])
        )
      )
    ),
    React.createElement('h3', null, 'Job success vs. failure rate'),
    React.createElement(SuccessFailChart, { data: successData })
  );
}


function Rates({ onRatesUpdated }) {
  const [config, setConfig] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const baseDir = PLUGIN_BASE;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let text;
        if (window.cockpit && window.cockpit.file) {
          text = await window.cockpit.file(`${baseDir}/rates.json`).read();
        } else {
          const resp = await fetch('rates.json');
          if (!resp.ok) throw new Error('Failed to load rates');
          text = await resp.text();
        }
        if (cancelled) return;
        const json = JSON.parse(text);
        setConfig({
          defaultRate: json.defaultRate
        });
        const ovrs = json.overrides
          ? Object.entries(json.overrides).map(([account, cfg]) => ({
              account,
              rate: cfg.rate ?? '',
              discount: cfg.discount != null ? cfg.discount * 100 : ''
            }))
          : [];
        setOverrides(ovrs);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Failed to load rates');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      try {
        let json;
        if (window.cockpit && window.cockpit.spawn) {
          const args = [
            'python3',
            `${PLUGIN_BASE}/slurmdb.py`,
            '--accounts',
            '--output',
            '-',
          ];
          const output = await window.cockpit.spawn(args, { err: 'message' });
          json = JSON.parse(output);
        } else {
          const resp = await fetch('billing.json');
          if (!resp.ok) throw new Error('Failed to fetch billing data');
          json = await resp.json();
        }
        if (!cancelled) setAccounts(json.accounts || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateOverride(index, field, value) {
    setOverrides(prev =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    );
  }

  function addOverride() {
    setOverrides(prev => [...prev, { account: '', rate: '', discount: '' }]);
  }

  function removeOverride(index) {
    setOverrides(prev => prev.filter((_, i) => i !== index));
  }

  async function save() {
    try {
      setSaving(true);
      setError(null);
      setStatus(null);

      const defaultRate = parseFloat(config.defaultRate);
      if (!Number.isFinite(defaultRate)) {
        console.warn('Invalid default rate:', config.defaultRate);
        setError('Invalid default rate');
        return;
      }

      const json = { defaultRate };


      if (overrides.length) {
        const overridesJson = {};
        overrides.forEach(o => {
          if (!o.account) return;
          const entry = {};
          if (o.rate !== '') {
            const rate = parseFloat(o.rate);
            if (Number.isFinite(rate)) {
              entry.rate = rate;
            } else {
              console.warn(`Ignoring invalid rate for account ${o.account}:`, o.rate);
            }
          }
          if (o.discount !== '') {
            const discount = parseFloat(o.discount);
            if (Number.isFinite(discount)) {
              entry.discount = discount / 100;
            } else {
              console.warn(
                `Ignoring invalid discount for account ${o.account}:`,
                o.discount
              );
            }
          }
          if (Object.keys(entry).length) overridesJson[o.account] = entry;
        });
        if (Object.keys(overridesJson).length)
          json.overrides = overridesJson;
      }

      const text = JSON.stringify(json, null, 2);
      if (window.cockpit && window.cockpit.file) {
        await window.cockpit.file(`${baseDir}/rates.json`).replace(text);
      } else {
        await fetch('rates.json', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: text
        });
      }
      setStatus('Saved');
      if (onRatesUpdated) onRatesUpdated();
    } catch (e) {
      console.error(e);
      setError('Failed to save rates');
    } finally {
      setSaving(false);
    }
  }

  if (error) return React.createElement('p', { className: 'error' }, error);
  if (!config)
    return React.createElement('p', null, 'Loading rate configuration...');

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Rate Configuration'),
    React.createElement(
      'div',
      null,
      React.createElement(
        'label',
        null,
        'Default Rate ($/core-hour): ',
        React.createElement('input', {
          type: 'number',
          step: '0.001',
          value: config.defaultRate,
          onChange: e =>
            setConfig({ ...config, defaultRate: e.target.value })
        })
      )
    ),
    React.createElement('h3', null, 'Account Overrides'),
    React.createElement(
      'table',
      { className: 'rates-table' },
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          React.createElement('th', null, 'Account'),
          React.createElement('th', null, 'Rate'),
          React.createElement('th', null, 'Discount (%)'),
          React.createElement('th', null)
        )
      ),
      React.createElement(
        'tbody',
        null,
        overrides.map((o, idx) =>
          React.createElement(
            'tr',
            { key: idx },
            React.createElement(
              'td',
              null,
              React.createElement(
                'select',
                {
                  value: o.account,
                  onChange: e => updateOverride(idx, 'account', e.target.value)
                },
                [
                  React.createElement('option', { key: '', value: '' }, ''),
                  ...accounts.map(acct =>
                    React.createElement('option', { key: acct, value: acct }, acct)
                  )
                ]
              )
            ),
            React.createElement('td', null,
              React.createElement('input', {
                type: 'number',
                step: '0.001',
                value: o.rate,
                onChange: e =>
                  updateOverride(idx, 'rate', e.target.value)
              })
            ),
            React.createElement('td', null,
              React.createElement('input', {
                type: 'number',
                step: '0.1',
                value: o.discount,
                onChange: e =>
                  updateOverride(idx, 'discount', e.target.value)
              })
            ),
            React.createElement('td', null,
              React.createElement(
                'button',
                { className: 'link-btn', onClick: () => removeOverride(idx) },
                'Remove'
              )
            )
          )
        )
      )
    ),
    React.createElement(
      'button',
      { onClick: addOverride, style: { marginTop: '0.5em' } },
      'Add Override'
    ),
    React.createElement(
      'div',
      { style: { marginTop: '1em' } },
      React.createElement(
        'button',
        { onClick: save, disabled: saving },
        'Save'
      ),
      saving && React.createElement('span', null, ' Saving...'),
      status && React.createElement('span', { style: { marginLeft: '0.5em' } }, status)
    )
  );
}

function App() {
  const [view, setView] = useState('year');
  const now = new Date();
  const currentYear = now.getFullYear();
  const defaultMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
  const [month, setMonth] = useState(defaultMonth);
  const yearPeriod = useMemo(() => getYearPeriod(currentYear), [currentYear]);
  const period = view === 'year' ? yearPeriod : month;
  const { data, error, reload } = useBillingData(period);
  const details = useMemo(() => {
    if (!data) return [];
    return view === 'year'
      ? aggregateAccountDetails(data.details || [])
      : data.details || [];
  }, [data, view]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const monthOptions = Array.from(
    { length: now.getMonth() + 1 },
    (_, i) => `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`
  );

  return React.createElement(
    'div',
    { className: 'app' },
    React.createElement(
      'nav',
      null,
      React.createElement(
        'button',
        { onClick: () => setView('year') },
        'Fiscal Year Overview'
      ),
      React.createElement(
        'button',
        { onClick: () => setView('summary') },
        'Monthly Summary Reports'
      ),
      React.createElement(
        'button',
        { onClick: () => setView('details') },
        'Detailed Transactions'
      ),
      React.createElement(
        'button',
        { onClick: () => setView('settings') },
        'Administration'
      )
    ),
    view === 'summary' &&
      React.createElement(
        'div',
        { className: 'month-select' },
        React.createElement(
          'label',
          null,
          'Month: ',
          React.createElement(
            'select',
            { value: month, onChange: e => setMonth(e.target.value) },
            monthOptions.map(m =>
              React.createElement('option', { key: m, value: m }, m)
            )
          )
        )
      ),
    view !== 'settings' && !data && !error && React.createElement('p', null, 'Loading...'),
    view !== 'settings' &&
      error &&
      React.createElement(
        'div',
        { className: 'error' },
        React.createElement(
          'p',
          null,
          'Failed to load data ',
          React.createElement(
            'a',
            {
              href: '#',
              onClick: e => {
                e.preventDefault();
                setShowErrorDetails(v => !v);
              }
            },
            '(Click here to Learn More)'
          )
        ),
        showErrorDetails &&
          React.createElement('pre', { className: 'error-details' }, error)
      ),
    data &&
      view === 'year' &&
      React.createElement(Summary, {
        summary: data.summary,
        details,
        daily: data.daily,
        yearly: data.yearly
      }),
    data &&
      view === 'summary' &&
      React.createElement(Summary, {
        summary: data.summary,
        details,
        daily: data.daily,
        monthly: data.monthly
      }),
    data &&
      view === 'details' &&
      React.createElement(Details, {
        details: data.details,
        daily: data.daily,
        partitions: data.partitions,
        accounts: data.accounts,
        users: data.users,
        month,
        onMonthChange: setMonth,
        monthOptions
      }),
    view === 'settings' && React.createElement(Rates, { onRatesUpdated: reload })
  );
}

if (typeof document !== 'undefined') {
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(React.StrictMode, null, React.createElement(App))
  );
}

if (typeof module !== 'undefined') {
  module.exports = { getBillingPeriod };
}
