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
  '/usr/share/cockpit/slurmledger';

const HAS_COCKPIT =
  typeof window !== 'undefined' && window.cockpit && window.cockpit.spawn;

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
    const isCurrent = year === today.getFullYear() && month === today.getMonth();
    end = isCurrent
      ? new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      : new Date(Date.UTC(year, month + 1, 0));
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
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (abortRef.current) {
      if (abortRef.current.abort) abortRef.current.abort();
      if (abortRef.current.close) abortRef.current.close('cancelled');
    }
    setLoading(true);
    setError(null);
    try {
      let json;
      if (HAS_COCKPIT) {
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
        const proc = window.cockpit.spawn(args, { err: 'message' });
        abortRef.current = proc;
        const output = await proc;
        json = JSON.parse(output);
        // slurmdb.py emits {"error": "<ExcType>", "message": "..."} and exits 1
        // when an unhandled exception occurs.  Detect that shape here so the
        // UI surfaces a readable error instead of trying to render bad data.
        if (json && json.error && json.message && !json.summary) {
          throw new Error(`${json.error}: ${json.message}`);
        }
      } else {
        const controller = new AbortController();
        abortRef.current = controller;
        const resp = await fetch('billing.json', { signal: controller.signal });
        if (!resp.ok) throw new Error('Failed to fetch billing data');
        json = await resp.json();
      }
      setData(json);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e);
        setError(e.message || String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    let currentProc = null;
    const run = async () => {
      if (abortRef.current) {
        if (abortRef.current.abort) abortRef.current.abort();
        if (abortRef.current.close) abortRef.current.close();
      }
      setLoading(true);
      setError(null);
      try {
        let json;
        if (HAS_COCKPIT) {
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
          currentProc = window.cockpit.spawn(args, { err: 'message' });
          abortRef.current = currentProc;
          const output = await currentProc;
          json = JSON.parse(output);
          if (json && json.error && json.message && !json.summary) {
            throw new Error(`${json.error}: ${json.message}`);
          }
        } else {
          const controller = new AbortController();
          currentProc = controller;
          abortRef.current = controller;
          const resp = await fetch('billing.json', { signal: controller.signal });
          if (!resp.ok) throw new Error('Failed to fetch billing data');
          json = await resp.json();
        }
        setData(json);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error(e);
          setError(e.message || String(e));
        }
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => {
      if (currentProc) {
        if (currentProc.abort) currentProc.abort();
        if (currentProc.close) currentProc.close('cancelled');
      }
    };
  }, [period]);

  return { data, error, loading, reload: load };
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
  const [sortField, setSortField] = useState('cost');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  function handleSort(field) {
    if (field === sortField) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(0);
  }

  function sortIndicator(field) {
    if (field !== sortField) return '';
    return sortDirection === 'asc' ? ' \u25b2' : ' \u25bc';
  }

  const sorted = jobs.slice().sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'job': aVal = a.job || ''; bVal = b.job || ''; break;
      case 'start': aVal = a.start || ''; bVal = b.start || ''; break;
      case 'end': aVal = a.end || ''; bVal = b.end || ''; break;
      case 'elapsed': aVal = a.elapsed || 0; bVal = b.elapsed || 0; break;
      case 'core_hours': aVal = a.core_hours || 0; bVal = b.core_hours || 0; break;
      case 'cost': aVal = a.cost || 0; bVal = b.cost || 0; break;
      case 'billing_status': aVal = a.billing_rule_applied || ''; bVal = b.billing_rule_applied || ''; break;
      default: aVal = 0; bVal = 0;
    }
    let cmp;
    if (typeof aVal === 'string') {
      cmp = aVal.localeCompare(bVal);
    } else {
      cmp = aVal - bVal;
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const pages = Math.ceil(sorted.length / pageSize) || 1;
  const pageJobs = sorted.slice(page * pageSize, page * pageSize + pageSize);

  function sortableTh(label, field) {
    return React.createElement(
      'th',
      { className: 'clickable', onClick: () => handleSort(field) },
      label + sortIndicator(field)
    );
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
          sortableTh('JobID', 'job'),
          React.createElement('th', null, 'JobName'),
          React.createElement('th', null, 'Partition'),
          sortableTh('Start', 'start'),
          sortableTh('End', 'end'),
          sortableTh('Elapsed', 'elapsed'),
          React.createElement('th', null, 'ReqTRES'),
          React.createElement('th', null, 'AllocTRES'),
          React.createElement('th', null, 'State'),
          sortableTh('Core Hours', 'core_hours'),
          sortableTh('$ Cost', 'cost'),
          sortableTh('Billing Status', 'billing_status')
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
            React.createElement('td', null, j.cost),
            React.createElement(
              'td',
              {
                style: {
                  color: j.billing_rule_applied && j.billing_rule_applied !== 'Charged'
                    ? '#6b7280'
                    : undefined,
                  fontSize: '0.85em'
                }
              },
              j.billing_rule_applied || 'Charged'
            )
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
  if (!summary) {
    return React.createElement(
      'div',
      { className: 'empty-state' },
      React.createElement('h3', null, 'No billing data available'),
      React.createElement('p', null, 'No jobs were found for the selected period. This could mean no jobs ran, or the database connection could not be established.')
    );
  }
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
    React.createElement(
      'div',
      { className: 'summary-charts' },
      React.createElement(
        'div',
        { className: 'summary-chart' },
        React.createElement('h3', null, 'CPU/GPU-hrs per Slurm account'),
        React.createElement(AccountsChart, { details })
      ),
      React.createElement(
        'div',
        { className: 'summary-chart' },
        React.createElement('h3', null, historicalLabel),
        React.createElement(HistoricalUsageChart, { data: historical })
      )
    )
  );
}


function UserDetails({ users }) {
  const [expanded, setExpanded] = useState(null);
  function toggle(user) {
    setExpanded(prev => (prev === user ? null : user));
  }
  if (!users || users.length === 0) {
    return React.createElement(
      'div',
      { className: 'empty-state' },
      React.createElement('h3', null, 'No billing data available'),
      React.createElement('p', null, 'No jobs were found for the selected period. This could mean no jobs ran, or the database connection could not be established.')
    );
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
              onClick: () => toggle(u.user),
              tabIndex: 0,
              role: 'button',
              'aria-expanded': expanded === u.user,
              onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(u.user); } }
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
  monthOptions = [],
  institutionProfile = {}
}) {
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({
    partition: '',
    account: '',
    user: ''
  });
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

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
      if (filters.partition) {
        userList = userList.map(u => ({
          ...u,
          jobs: (u.jobs || []).filter(j => j.partition === filters.partition)
        })).filter(u => u.jobs && u.jobs.length > 0);
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
    function csvQuote(field) {
      const s = String(field);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }
    const csv = rows.map(r => r.map(csvQuote).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'details.csv';
    // Append link to DOM so browsers will download the file
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateInvoiceNumber(ledger) {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const existing = (ledger.invoices || [])
      .filter(inv => inv.id && inv.id.startsWith(prefix))
      .map(inv => parseInt(inv.id.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  async function exportInvoice() {
    const requiredFields = ['institutionName', 'streetAddress', 'city', 'postalCode'];
    const missing = requiredFields.filter(f => !institutionProfile[f]);
    if (missing.length > 0) {
      alert(`Institution profile incomplete. Please configure: ${missing.join(', ')}`);
      return;
    }

    setIsExporting(true);
    try {
      await exportInvoiceImpl();
    } finally {
      setIsExporting(false);
    }
  }

  async function exportInvoiceImpl() {
    const totals = filteredDetails.reduce(
      (acc, d) => {
        acc.core += d.core_hours || 0;
        acc.gpu += d.gpu_hours || 0;
        acc.cost += d.cost || 0;
        return acc;
      },
      { core: 0, gpu: 0, cost: 0 }
    );

    // Load rates config to get correct per-resource rates
    let ratesConfig = null;
    try {
      let ratesText;
      if (window.cockpit && window.cockpit.file) {
        ratesText = await window.cockpit.file(`${PLUGIN_BASE}/rates.json`).read();
      } else {
        const resp = await fetch('rates.json');
        if (resp.ok) ratesText = await resp.text();
      }
      if (ratesText) ratesConfig = JSON.parse(ratesText);
    } catch (e) {
      console.warn('Could not load rates config for invoice:', e);
    }

    // Compute separate rates for CPU and GPU
    let cpuRate = ratesConfig && ratesConfig.defaultRate != null ? ratesConfig.defaultRate : 0.01;
    let gpuRate = ratesConfig && ratesConfig.defaultGpuRate != null ? ratesConfig.defaultGpuRate : 0.10;

    // Apply account-specific override if filtering by a single account
    if (ratesConfig && ratesConfig.overrides && filters.account && ratesConfig.overrides[filters.account]) {
      const ovr = ratesConfig.overrides[filters.account];
      if (ovr.rate != null) cpuRate = ovr.rate;
      if (ovr.gpuRate != null) gpuRate = ovr.gpuRate;
    }

    // Build line items with correct rates; omit zero-qty lines
    const items = [];
    if (totals.core > 0) {
      items.push({ description: 'CPU Core-Hours', qty: totals.core, rate: cpuRate, amount: totals.core * cpuRate });
    }
    if (totals.gpu > 0) {
      items.push({ description: 'GPU Hours', qty: totals.gpu, rate: gpuRate, amount: totals.gpu * gpuRate });
    }

    // Sequential invoice number derived from ledger
    const ledger = await loadInvoiceLedger();
    const invoiceNumber = generateInvoiceNumber(ledger);

    const paymentTermsDays = institutionProfile.paymentTermsDays || 30;
    const dueDateMs = Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000;
    const invoiceData = {
      invoice_number: invoiceNumber,
      date_issued: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      fiscal_year: new Date().getFullYear().toString(),
      due_date: new Date(dueDateMs).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      payment_terms: institutionProfile.paymentTerms || `Net ${paymentTermsDays}`,
      period: month || '',
      items,
      subtotal: items.reduce((s, i) => s + i.amount, 0),
      discount: 0,
      tax: 0,
      total_due: items.reduce((s, i) => s + i.amount, 0),
      institution: {
        name: institutionProfile.institutionName || '',
        abbreviation: institutionProfile.institutionAbbreviation || '',
        department: institutionProfile.departmentName || '',
        address: institutionProfile.streetAddress || '',
        city: institutionProfile.city || '',
        state: institutionProfile.state || '',
        postal: institutionProfile.postalCode || '',
        country: institutionProfile.country || '',
        contact: institutionProfile.primaryContact || {}
      },
      logo: institutionProfile.logo || '',
      bank_info: institutionProfile.bankInfo && institutionProfile.bankInfo.trim()
        ? institutionProfile.bankInfo.split('\n').map(l => l.trim()).filter(Boolean)
        : ['(Bank information not configured — update Institution Profile)'],
      payment_terms_text: institutionProfile.paymentTerms || `Net ${paymentTermsDays}`,
      notes: institutionProfile.notes && institutionProfile.notes.trim()
        ? institutionProfile.notes
        : 'Thank you for your prompt payment. For questions regarding this invoice, please contact our office.'
    };
    try {
      setError(null);
      if (!filteredDetails.length) {
        setError('No usage data matches current filters');
        return;
      }
      const PDF_STORE_DIR = '/etc/slurmledger/invoices';
      const output = await window.cockpit.spawn(
        ['python3', `${PLUGIN_BASE}/invoice.py`, '--output-dir', PDF_STORE_DIR],
        { input: JSON.stringify(invoiceData), err: 'out' }
      );
      const trimmed = output.trim();
      if (!trimmed) {
        setError('Invoice generation returned no data');
        return;
      }
      let byteChars;
      try {
        byteChars = atob(trimmed);
      } catch (decodeErr) {
        setError(trimmed || decodeErr.message || String(decodeErr));
        return;
      }
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: 'application/pdf'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recharge_invoice.pdf';
      // Append link to DOM so browsers will download the file
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Record the invoice in the ledger
      const safeName = invoiceData.invoice_number.replace(/[^A-Za-z0-9_\-]/g, '_');
      await saveInvoiceToLedger(
        { ...invoiceData, account: filters.account || '', pdf_path: `/etc/slurmledger/invoices/${safeName}.pdf` },
        invoiceData.total_due
      );
      // Trigger financial integration webhook for invoice.created
      if (HAS_COCKPIT) {
        const webhookAt = new Date().toISOString();
        window.cockpit.spawn(
          [
            'python3', `${PLUGIN_BASE}/financial_export.py`,
            '--event', 'invoice.created',
            '--invoice-id', invoiceData.invoice_number,
            '--format', 'webhook'
          ],
          { err: 'message' }
        ).then(() => {
          updateInvoiceLedger(invoiceData.invoice_number, { lastWebhookStatus: 'success', lastWebhookAt: webhookAt })
            .catch(() => {});
        }).catch(e => {
          const statusMsg = `failed: ${e.message || String(e)}`;
          updateInvoiceLedger(invoiceData.invoice_number, { lastWebhookStatus: statusMsg, lastWebhookAt: webhookAt })
            .catch(() => {});
          setError(`Invoice saved, but webhook failed: ${e.message || String(e)}`);
        });
      }
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
    }
  }

  if (!details || details.length === 0) {
    return React.createElement(
      'div',
      { className: 'empty-state' },
      React.createElement('h3', null, 'No billing data available'),
      React.createElement('p', null, 'No jobs were found for the selected period. This could mean no jobs ran, or the database connection could not be established.')
    );
  }

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
      React.createElement('button', { onClick: exportCSV }, 'Export CSV'),
      React.createElement(
        'button',
        { onClick: exportInvoice, disabled: isExporting },
        isExporting ? 'Exporting...' : 'Export Invoice'
      ),
      error &&
        React.createElement(
          'span',
          { className: 'error', style: { marginLeft: '0.5em' } },
          error
        )
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
                  onClick: () => toggle(d.account),
                  tabIndex: 0,
                  role: 'button',
                  'aria-expanded': expanded === d.account,
                  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(d.account); } }
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
    )
  );
}


function HelpIcon({ text }) {
  return React.createElement('span', { className: 'help-icon', title: text }, ' (?)');
}

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return React.createElement(
    'div',
    { className: 'collapsible-panel' },
    React.createElement(
      'div',
      { className: 'collapsible-header', onClick: () => setOpen(!open) },
      React.createElement('span', null, title),
      React.createElement('span', null, open ? '▲' : '▼')
    ),
    open && React.createElement('div', { className: 'collapsible-content' }, children)
  );
}

function InstitutionProfile() {
  const [profile, setProfile] = useState({
    institutionName: '',
    institutionAbbreviation: '',
    campusDivision: '',
    institutionType: '',
    primaryContact: { fullName: '', title: '', email: '', phone: '' },
    secondaryContact: { fullName: '', email: '', phone: '' },
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    fiscalYearStartMonth: '',
    defaultCurrency: 'USD',
    departmentName: '',
    costCenter: '',
    bankInfo: '',
    notes: '',
    logo: ''
  });
  const [initialProfile, setInitialProfile] = useState(profile);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const baseDir = PLUGIN_BASE;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let text;
        if (window.cockpit && window.cockpit.file) {
          text = await window.cockpit.file(`${baseDir}/institution.json`).read();
        } else {
          const resp = await fetch('institution.json');
          if (!resp.ok) throw new Error('Failed to load profile');
          text = await resp.text();
        }
        if (cancelled) return;
        const json = JSON.parse(text);
        setProfile(p => ({
          ...p,
          ...json,
          primaryContact: { ...p.primaryContact, ...(json.primaryContact || {}) },
          secondaryContact: { ...p.secondaryContact, ...(json.secondaryContact || {}) }
        }));
        setInitialProfile(p => ({
          ...p,
          ...json,
          primaryContact: { ...p.primaryContact, ...(json.primaryContact || {}) },
          secondaryContact: { ...p.secondaryContact, ...(json.secondaryContact || {}) }
        }));
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function update(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }));
  }

  function updatePrimary(field, value) {
    setProfile(prev => ({
      ...prev,
      primaryContact: { ...prev.primaryContact, [field]: value }
    }));
  }

  function updateSecondary(field, value) {
    setProfile(prev => ({
      ...prev,
      secondaryContact: { ...prev.secondaryContact, [field]: value }
    }));
  }

  function handleLogo(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 256 * 1024) {
      setError('Logo file must be under 256KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile(prev => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  function cancel() {
    setProfile(initialProfile);
    setStatus(null);
    setError(null);
    setFieldErrors({});
  }

  async function save() {
    const required = {
      institutionName: 'Institution Name',
      streetAddress: 'Street Address',
      city: 'City',
      postalCode: 'Postal Code'
    };
    const errs = {};
    Object.entries(required).forEach(([field, label]) => {
      if (!profile[field] || !String(profile[field]).trim()) {
        errs[field] = `${label} is required`;
      }
    });
    if (!profile.state || !String(profile.state).trim()) {
      errs.state = 'State/Province is required';
    }
    // Validate asterisked primary contact fields
    if (!profile.primaryContact.fullName || !String(profile.primaryContact.fullName).trim()) {
      errs['primaryContact.fullName'] = 'Primary contact name is required';
    }
    if (!profile.primaryContact.title || !String(profile.primaryContact.title).trim()) {
      errs['primaryContact.title'] = 'Primary contact title is required';
    }
    if (!profile.primaryContact.email || !String(profile.primaryContact.email).trim()) {
      errs['primaryContact.email'] = 'Primary contact email is required';
    }
    if (!profile.primaryContact.phone || !String(profile.primaryContact.phone).trim()) {
      errs['primaryContact.phone'] = 'Primary contact phone is required';
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError('Please fill in all required fields before saving.');
      return;
    }
    setFieldErrors({});
    try {
      setStatus(null);
      setError(null);
      const text = JSON.stringify(profile, null, 2);
      if (window.cockpit && window.cockpit.file) {
        await window.cockpit.file(`${baseDir}/institution.json`).replace(text);
      } else {
        await fetch('institution.json', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: text
        });
      }
      setStatus('Saved');
      setInitialProfile(profile);
    } catch (e) {
      console.error(e);
      setError('Failed to save profile');
    }
  }

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  const currencies = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY'];

  return React.createElement(
    'div',
    { className: 'institution-profile' },
    React.createElement('h2', null, 'Institution Profile'),
    React.createElement(
      'p',
      null,
      "Manage your university’s information, primary contacts, and fiscal settings."
    ),
    React.createElement(
      'div',
      { className: 'institution-banner' },
      profile.logo
        ? React.createElement('img', {
            src: profile.logo,
            alt: 'Logo',
            className: 'institution-logo-preview'
          })
        : React.createElement('div', { className: 'institution-logo-preview' }),
      React.createElement('input', {
        type: 'file',
        accept: 'image/*',
        onChange: handleLogo
      })
    ),
    React.createElement(
      CollapsibleSection,
      { title: 'Institutional Identification' },
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Institution Name',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.institutionName,
            style: fieldErrors.institutionName ? { borderColor: 'red' } : undefined,
            onChange: e => update('institutionName', e.target.value)
          })
        ),
        fieldErrors.institutionName &&
          React.createElement('span', { className: 'field-error' }, fieldErrors.institutionName)
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Institution Abbreviation: ',
          React.createElement('input', {
            type: 'text',
            value: profile.institutionAbbreviation,
            onChange: e => update('institutionAbbreviation', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Campus/Division: ',
          React.createElement('input', {
            type: 'text',
            value: profile.campusDivision,
            onChange: e => update('campusDivision', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Institution Type',
          React.createElement(HelpIcon, {
            text: 'Select the category that best describes your institution.'
          }),
          ': ',
          React.createElement(
            'select',
            {
              value: profile.institutionType,
              onChange: e => update('institutionType', e.target.value)
            },
            ['Public University', 'Private University', 'Community College', 'Other'].map(
              t => React.createElement('option', { key: t, value: t }, t)
            )
          )
        )
      )
    ),
    React.createElement(
      CollapsibleSection,
      { title: 'Contact Information' },
      React.createElement('h4', null, 'Primary Contact'),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Full Name',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.primaryContact.fullName,
            style: fieldErrors['primaryContact.fullName'] ? { borderColor: 'red' } : undefined,
            onChange: e => updatePrimary('fullName', e.target.value)
          })
        ),
        fieldErrors['primaryContact.fullName'] &&
          React.createElement('span', { className: 'field-error' }, fieldErrors['primaryContact.fullName'])
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Title/Role',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.primaryContact.title,
            style: fieldErrors['primaryContact.title'] ? { borderColor: 'red' } : undefined,
            onChange: e => updatePrimary('title', e.target.value)
          })
        ),
        fieldErrors['primaryContact.title'] &&
          React.createElement('span', { className: 'field-error' }, fieldErrors['primaryContact.title'])
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Email',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'email',
            value: profile.primaryContact.email,
            style: fieldErrors['primaryContact.email'] ? { borderColor: 'red' } : undefined,
            onChange: e => updatePrimary('email', e.target.value)
          })
        ),
        fieldErrors['primaryContact.email'] &&
          React.createElement('span', { className: 'field-error' }, fieldErrors['primaryContact.email'])
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Phone',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'tel',
            value: profile.primaryContact.phone,
            style: fieldErrors['primaryContact.phone'] ? { borderColor: 'red' } : undefined,
            onChange: e => updatePrimary('phone', e.target.value)
          })
        ),
        fieldErrors['primaryContact.phone'] &&
          React.createElement('span', { className: 'field-error' }, fieldErrors['primaryContact.phone'])
      ),
      React.createElement('h4', null, 'Secondary Contact (Optional)'),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Full Name: ',
          React.createElement('input', {
            type: 'text',
            value: profile.secondaryContact.fullName,
            onChange: e => updateSecondary('fullName', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Email: ',
          React.createElement('input', {
            type: 'email',
            value: profile.secondaryContact.email,
            onChange: e => updateSecondary('email', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Phone: ',
          React.createElement('input', {
            type: 'tel',
            value: profile.secondaryContact.phone,
            onChange: e => updateSecondary('phone', e.target.value)
          })
        )
      )
    ),
    React.createElement(
      CollapsibleSection,
      { title: 'Address & Operational Settings' },
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Street Address',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.streetAddress,
            style: fieldErrors.streetAddress ? { borderColor: 'red' } : undefined,
            onChange: e => update('streetAddress', e.target.value)
          })
        ),
        fieldErrors.streetAddress &&
          React.createElement('span', { className: 'field-error' }, fieldErrors.streetAddress)
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'City',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.city,
            style: fieldErrors.city ? { borderColor: 'red' } : undefined,
            onChange: e => update('city', e.target.value)
          })
        ),
        fieldErrors.city &&
          React.createElement('span', { className: 'field-error' }, fieldErrors.city)
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'State/Province',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            placeholder: 'State / Province / Region',
            value: profile.state,
            style: fieldErrors.state ? { borderColor: 'red' } : undefined,
            onChange: e => update('state', e.target.value)
          })
        ),
        fieldErrors.state &&
          React.createElement('span', { className: 'field-error' }, fieldErrors.state)
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Postal Code',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.postalCode,
            style: fieldErrors.postalCode ? { borderColor: 'red' } : undefined,
            onChange: e => update('postalCode', e.target.value)
          })
        ),
        fieldErrors.postalCode &&
          React.createElement('span', { className: 'field-error' }, fieldErrors.postalCode)
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Country',
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.country,
            onChange: e => update('country', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Fiscal Year Start Month',
          React.createElement(HelpIcon, {
            text: 'Month when your financial reporting year begins.'
          }),
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement(
            'select',
            {
              value: profile.fiscalYearStartMonth,
              onChange: e => update('fiscalYearStartMonth', e.target.value)
            },
            months.map(m => React.createElement('option', { key: m, value: m }, m))
          )
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Default Currency',
          ': ',
          React.createElement(
            'select',
            {
              value: profile.defaultCurrency,
              onChange: e => update('defaultCurrency', e.target.value)
            },
            currencies.map(c => React.createElement('option', { key: c, value: c }, c))
          )
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Recharge Unit/Department Name',
          React.createElement('span', { className: 'required' }, '*'),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.departmentName,
            onChange: e => update('departmentName', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Cost Center / Chart String',
          React.createElement(HelpIcon, {
            text: 'Optional code used by finance to track charges.'
          }),
          ': ',
          React.createElement('input', {
            type: 'text',
            value: profile.costCenter,
            onChange: e => update('costCenter', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Bank / Payment Details',
          React.createElement(HelpIcon, {
            text: 'Enter bank details line-by-line (e.g. Bank Name, Account Number, Routing Number). These lines will appear on exported invoices.'
          }),
          ': ',
          React.createElement('textarea', {
            value: profile.bankInfo,
            rows: 4,
            placeholder: 'Bank Name: ...\nAccount Number: ...\nRouting Number: ...',
            onChange: e => update('bankInfo', e.target.value)
          })
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          null,
          'Notes / Special Instructions: ',
          React.createElement('textarea', {
            value: profile.notes,
            onChange: e => update('notes', e.target.value)
          })
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'save-cancel-bar' },
      React.createElement('button', { onClick: save }, 'Save'),
      React.createElement(
        'button',
        { onClick: cancel, style: { marginLeft: '0.5em' } },
        'Cancel'
      ),
      status && React.createElement('span', { style: { marginLeft: '0.5em' } }, status),
      error &&
        React.createElement(
          'span',
          { className: 'error', style: { marginLeft: '0.5em' } },
          error
        )
    )
  );
}

// ---------------------------------------------------------------------------
// Allocation helpers
// ---------------------------------------------------------------------------

function computeAlertLevel(percentUsed, thresholds) {
  const sorted = (thresholds || [80, 90, 100]).slice().sort((a, b) => b - a);
  for (const t of sorted) {
    if (percentUsed >= t) {
      if (t >= 100) return 'exceeded';
      if (t >= 90) return 'critical';
      return 'warning';
    }
  }
  return null;
}

function AllocationBadge({ alertLevel }) {
  if (!alertLevel) return null;
  const colors = {
    warning: '#d97706',
    critical: '#dc2626',
    exceeded: '#7c2d12'
  };
  const icons = { warning: '\u26a0\ufe0f', critical: '\ud83d\udd34', exceeded: '\ud83d\udd34' };
  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: colors[alertLevel] || '#6b7280',
        color: '#fff',
        fontSize: '0.75em',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginLeft: '4px'
      }
    },
    alertLevel
  );
}

function AllocationProgressBar({ percent }) {
  const clamped = Math.min(100, Math.max(0, percent || 0));
  const color = clamped >= 100 ? '#7c2d12' : clamped >= 90 ? '#dc2626' : clamped >= 80 ? '#d97706' : '#16a34a';
  return React.createElement(
    'div',
    {
      style: {
        background: '#e5e7eb',
        borderRadius: '4px',
        height: '8px',
        width: '120px',
        display: 'inline-block',
        verticalAlign: 'middle'
      }
    },
    React.createElement('div', {
      style: {
        width: `${clamped}%`,
        height: '100%',
        borderRadius: '4px',
        background: color
      }
    })
  );
}

// Modal for editing a single allocation entry
function AllocationModal({ allocation, accountName, onSave, onClose }) {
  const [form, setForm] = useState(allocation ? { ...allocation } : {
    type: 'prepaid',
    budget_su: '',
    period: 'annual',
    start_date: '',
    end_date: '',
    carryover: false,
    alerts: [80, 90, 100]
  });
  const [alertsText, setAlertsText] = useState(
    ((allocation && allocation.alerts) || [80, 90, 100]).join(', ')
  );
  const [error, setError] = useState(null);
  const firstInputRef = React.useRef(null);
  useEffect(() => { firstInputRef.current?.focus(); }, []);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const alerts = alertsText.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const out = {
      type: form.type,
      period: form.period || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      carryover: !!form.carryover,
      alerts
    };
    if (form.type === 'prepaid') {
      const bsu = parseInt(form.budget_su, 10);
      if (!Number.isFinite(bsu) || bsu <= 0) {
        setError('Budget SU must be a positive integer for prepaid allocations');
        return;
      }
      out.budget_su = bsu;
    } else {
      out.billing_period = form.billing_period || 'monthly';
      out.budget_su = form.budget_su ? parseInt(form.budget_su, 10) || null : null;
    }
    onSave(accountName, out);
  }

  return React.createElement(
    'div',
    { className: 'modal-overlay', onClick: onClose, onKeyDown: (e) => { if (e.key === 'Escape') onClose(); } },
    React.createElement(
      'div',
      {
        className: 'modal',
        onClick: e => e.stopPropagation(),
        style: { maxWidth: '520px', width: '95%' }
      },
      React.createElement('h3', null, `${allocation ? 'Edit' : 'Add'} Allocation: ${accountName}`),
      error && React.createElement('p', { className: 'error' }, error),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Type: '),
        React.createElement(
          'select',
          { ref: firstInputRef, value: form.type, onChange: e => update('type', e.target.value) },
          React.createElement('option', { value: 'prepaid' }, 'Prepaid'),
          React.createElement('option', { value: 'postpaid' }, 'Postpaid')
        )
      ),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Budget SU (blank = unlimited): '),
        React.createElement('input', {
          type: 'number',
          value: form.budget_su ?? '',
          onChange: e => update('budget_su', e.target.value),
          placeholder: 'e.g. 500000'
        })
      ),
      form.type === 'prepaid' && React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Period: '),
        React.createElement(
          'select',
          { value: form.period || 'annual', onChange: e => update('period', e.target.value) },
          React.createElement('option', { value: 'annual' }, 'Annual'),
          React.createElement('option', { value: 'monthly' }, 'Monthly'),
          React.createElement('option', { value: 'custom' }, 'Custom')
        )
      ),
      form.type === 'postpaid' && React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Billing Period: '),
        React.createElement(
          'select',
          { value: form.billing_period || 'monthly', onChange: e => update('billing_period', e.target.value) },
          React.createElement('option', { value: 'monthly' }, 'Monthly'),
          React.createElement('option', { value: 'quarterly' }, 'Quarterly'),
          React.createElement('option', { value: 'annual' }, 'Annual')
        )
      ),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Start Date: '),
        React.createElement('input', {
          type: 'date',
          value: form.start_date || '',
          onChange: e => update('start_date', e.target.value)
        })
      ),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'End Date: '),
        React.createElement('input', {
          type: 'date',
          value: form.end_date || '',
          onChange: e => update('end_date', e.target.value)
        })
      ),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null,
          React.createElement('input', {
            type: 'checkbox',
            checked: !!form.carryover,
            onChange: e => update('carryover', e.target.checked),
            style: { marginRight: '6px' }
          }),
          'Allow carryover into next period'
        )
      ),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Alert thresholds (%, comma-separated): '),
        React.createElement('input', {
          type: 'text',
          value: alertsText,
          onChange: e => setAlertsText(e.target.value),
          placeholder: '80, 90, 100'
        })
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '0.5em', justifyContent: 'flex-end' } },
        React.createElement('button', { onClick: onClose }, 'Cancel'),
        React.createElement('button', { onClick: handleSave }, 'Save')
      )
    )
  );
}

// Allocations sub-tab rendered inside Rates
function AllocationsTab({ allocations, onAllocationsChange, accounts }) {
  const [editTarget, setEditTarget] = useState(null); // { account, alloc } | { account: '', alloc: null }

  function handleSave(accountName, alloc) {
    const updated = { ...allocations, [accountName]: alloc };
    onAllocationsChange(updated);
    setEditTarget(null);
  }

  function handleRemove(accountName) {
    if (!window.confirm(`Remove allocation for ${accountName}?`)) return;
    const updated = { ...allocations };
    delete updated[accountName];
    onAllocationsChange(updated);
  }

  const rows = Object.entries(allocations || {});

  return React.createElement(
    'div',
    null,
    React.createElement('h3', null, 'Account Allocations'),
    React.createElement(
      'p',
      { style: { color: '#4b5563', fontSize: '0.9em' } },
      'Set budget Service Unit (SU) limits and alert thresholds per account. 1 SU = 1 core-hour.'
    ),
    React.createElement(
      'div',
      { className: 'table-container' },
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
            React.createElement('th', null, 'Type'),
            React.createElement('th', null, 'Budget SU'),
            React.createElement('th', null, 'Period'),
            React.createElement('th', null, 'Start'),
            React.createElement('th', null, 'End'),
            React.createElement('th', null, 'Carryover'),
            React.createElement('th', null, 'Alert Thresholds (%)'),
            React.createElement('th', null)
          )
        ),
        React.createElement(
          'tbody',
          null,
          rows.length === 0
            ? React.createElement(
                'tr',
                null,
                React.createElement(
                  'td',
                  { colSpan: 9, style: { textAlign: 'center', color: '#9ca3af', padding: '1em' } },
                  'No allocations configured. Click "Add Allocation" to add one.'
                )
              )
            : rows.map(([acct, alloc]) =>
                React.createElement(
                  'tr',
                  { key: acct },
                  React.createElement('td', null, React.createElement('strong', null, acct)),
                  React.createElement('td', null, alloc.type || 'prepaid'),
                  React.createElement('td', null, alloc.budget_su != null ? alloc.budget_su.toLocaleString() : 'Unlimited'),
                  React.createElement('td', null, alloc.period || alloc.billing_period || ''),
                  React.createElement('td', null, alloc.start_date || ''),
                  React.createElement('td', null, alloc.end_date || ''),
                  React.createElement('td', null, alloc.carryover ? 'Yes' : 'No'),
                  React.createElement('td', null, (alloc.alerts || []).join(', ')),
                  React.createElement(
                    'td',
                    { style: { whiteSpace: 'nowrap' } },
                    React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => setEditTarget({ account: acct, alloc }),
                        style: { marginRight: '6px' }
                      },
                      'Edit'
                    ),
                    React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => handleRemove(acct),
                        style: { color: '#dc2626' }
                      },
                      'Remove'
                    )
                  )
                )
              )
        )
      )
    ),
    React.createElement(
      'button',
      {
        onClick: () => setEditTarget({ account: '', alloc: null }),
        style: { marginTop: '0.75em' }
      },
      'Add Allocation'
    ),
    editTarget && React.createElement(AllocationModal, {
      allocation: editTarget.alloc,
      accountName: editTarget.account,
      onSave: handleSave,
      onClose: () => setEditTarget(null)
    })
  );
}

// ---------------------------------------------------------------------------
// Financial Integration UI (Task B3)
// ---------------------------------------------------------------------------

function FinancialIntegrationTab() {
  const [fi, setFi] = useState({
    enabled: false,
    type: 'none',
    webhookUrl: '',
    apiKey: '',
    chartOfAccounts: {}
  });
  const [coaRows, setCoaRows] = useState([]);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [testing, setTesting] = useState(false);
  const baseDir = PLUGIN_BASE;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let text;
        // Financial config is stored separately in financial_config.json (0640)
        // to keep API keys away from the world-readable institution.json.
        if (window.cockpit && window.cockpit.file) {
          text = await window.cockpit.file(`${baseDir}/financial_config.json`).read();
        } else {
          const resp = await fetch('financial_config.json');
          if (!resp.ok) return;
          text = await resp.text();
        }
        if (cancelled) return;
        const cfg = JSON.parse(text);
        setFi({
          enabled: !!cfg.enabled,
          type: cfg.type || 'none',
          webhookUrl: cfg.webhookUrl || '',
          apiKey: cfg.apiKey || '',
          chartOfAccounts: cfg.chartOfAccounts || {}
        });
        const rows = Object.entries(cfg.chartOfAccounts || {}).map(([account, mapping]) => ({
          account,
          fund: mapping.fund || '',
          org: mapping.org || '',
          account_code: mapping.account || '',
          program: mapping.program || ''
        }));
        setCoaRows(rows);
      } catch (e) {
        console.error(e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function updateCoa(index, field, value) {
    setCoaRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function addCoaRow() {
    setCoaRows(prev => [...prev, { account: '', fund: '', org: '', account_code: '', program: '' }]);
  }

  function removeCoaRow(index) {
    setCoaRows(prev => prev.filter((_, i) => i !== index));
  }

  async function save() {
    try {
      setError(null);
      setStatus(null);
      const coa = {};
      coaRows.forEach(r => {
        if (r.account) {
          coa[r.account] = {
            fund: r.fund,
            org: r.org,
            account: r.account_code,
            program: r.program
          };
        }
      });
      // Save to financial_config.json (separate from institution.json so that
      // API keys and webhook secrets can have restricted permissions: 0640).
      const cfg = {
        enabled: fi.enabled,
        type: fi.type,
        webhookUrl: fi.webhookUrl,
        apiKey: fi.apiKey,
        chartOfAccounts: coa
      };
      const out = JSON.stringify(cfg, null, 2);
      if (window.cockpit && window.cockpit.file) {
        await window.cockpit.file(`${baseDir}/financial_config.json`).replace(out);
      } else {
        await fetch('financial_config.json', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: out
        });
      }
      setStatus('Saved');
    } catch (e) {
      console.error(e);
      setError('Failed to save: ' + (e.message || String(e)));
    }
  }

  async function testConnection() {
    if (!fi.webhookUrl) {
      setError('Enter a webhook URL first');
      return;
    }
    try {
      setTesting(true);
      setError(null);
      setStatus(null);
      if (HAS_COCKPIT) {
        const result = await window.cockpit.spawn(
          [
            'python3', `${PLUGIN_BASE}/financial_export.py`,
            '--event', 'connection.test',
            '--invoice-id', 'TEST',
            '--format', 'webhook'
          ],
          { err: 'message' }
        );
        const json = JSON.parse(result);
        if (json.status === 'ok' || json.status === 'skipped') {
          setStatus('Connection test passed');
        } else {
          setError(json.message || 'Test failed');
        }
      } else {
        setStatus('Test skipped (not in Cockpit environment)');
      }
    } catch (e) {
      setError('Test failed: ' + (e.message || String(e)));
    } finally {
      setTesting(false);
    }
  }

  const integrationTypes = [
    { value: 'none', label: 'None' },
    { value: 'oracle_cloud', label: 'Oracle Financials Cloud' },
    { value: 'workday', label: 'Workday' },
    { value: 'banner', label: 'Banner' },
    { value: 'kuali', label: 'Kuali' },
    { value: 'generic_webhook', label: 'Generic Webhook' }
  ];

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Financial Integration'),
    React.createElement(
      'p',
      { style: { color: '#4b5563', fontSize: '0.9em' } },
      'Connect SlurmLedger to your institution\'s financial system to export Journal Entries and trigger invoice event webhooks.'
    ),
    // Enable toggle
    React.createElement(
      'div',
      { style: { marginBottom: '1em' } },
      React.createElement('label', null,
        React.createElement('input', {
          type: 'checkbox',
          checked: fi.enabled,
          onChange: e => setFi(prev => ({ ...prev, enabled: e.target.checked })),
          style: { marginRight: '6px' }
        }),
        React.createElement('strong', null, 'Enable Financial Integration')
      )
    ),
    // Integration type
    React.createElement(
      'div',
      { style: { marginBottom: '1em' } },
      React.createElement('label', null, 'Integration Type: '),
      React.createElement(
        'select',
        { value: fi.type, onChange: e => setFi(prev => ({ ...prev, type: e.target.value })) },
        integrationTypes.map(t => React.createElement('option', { key: t.value, value: t.value }, t.label))
      )
    ),
    fi.enabled && React.createElement(
      'div',
      null,
      // Webhook URL
      React.createElement(
        'div',
        { style: { marginBottom: '1em' } },
        React.createElement('label', null, 'Webhook URL: '),
        React.createElement('input', {
          type: 'url',
          value: fi.webhookUrl,
          onChange: e => setFi(prev => ({ ...prev, webhookUrl: e.target.value })),
          placeholder: 'https://erp.example.edu/api/hpc-invoices',
          style: { width: '400px', maxWidth: '100%' }
        })
      ),
      // API key
      React.createElement(
        'div',
        { style: { marginBottom: '1em' } },
        React.createElement('label', null, 'API Key: '),
        React.createElement('input', {
          type: 'password',
          value: fi.apiKey,
          onChange: e => setFi(prev => ({ ...prev, apiKey: e.target.value })),
          placeholder: 'Bearer token or API key',
          style: { width: '300px', maxWidth: '100%' }
        })
      ),
      React.createElement(
        'button',
        { onClick: testConnection, disabled: testing, style: { marginBottom: '1.5em' } },
        testing ? 'Testing...' : 'Test Connection'
      )
    ),
    // Chart of Accounts mapping
    React.createElement('h3', null, 'Chart of Accounts Mapping'),
    React.createElement(
      'p',
      { style: { color: '#4b5563', fontSize: '0.9em' } },
      'Map SLURM account names to your institution\'s chart string. A "default" entry applies to all unmapped accounts.'
    ),
    React.createElement(
      'div',
      { className: 'table-container' },
      React.createElement(
        'table',
        { className: 'rates-table' },
        React.createElement(
          'thead',
          null,
          React.createElement('tr', null,
            React.createElement('th', null, 'SLURM Account'),
            React.createElement('th', null, 'Fund'),
            React.createElement('th', null, 'Org'),
            React.createElement('th', null, 'Account Code'),
            React.createElement('th', null, 'Program'),
            React.createElement('th', null)
          )
        ),
        React.createElement(
          'tbody',
          null,
          coaRows.length === 0
            ? React.createElement('tr', null,
                React.createElement('td', { colSpan: 6, style: { textAlign: 'center', color: '#9ca3af', padding: '1em' } },
                  'No mappings. Add a "default" row as a fallback.'
                )
              )
            : coaRows.map((row, idx) =>
                React.createElement('tr', { key: idx },
                  React.createElement('td', null,
                    React.createElement('input', {
                      type: 'text',
                      value: row.account,
                      onChange: e => updateCoa(idx, 'account', e.target.value),
                      placeholder: 'account-name or default'
                    })
                  ),
                  React.createElement('td', null,
                    React.createElement('input', {
                      type: 'text',
                      value: row.fund,
                      onChange: e => updateCoa(idx, 'fund', e.target.value),
                      placeholder: '12345'
                    })
                  ),
                  React.createElement('td', null,
                    React.createElement('input', {
                      type: 'text',
                      value: row.org,
                      onChange: e => updateCoa(idx, 'org', e.target.value),
                      placeholder: 'PHYS'
                    })
                  ),
                  React.createElement('td', null,
                    React.createElement('input', {
                      type: 'text',
                      value: row.account_code,
                      onChange: e => updateCoa(idx, 'account_code', e.target.value),
                      placeholder: '54321'
                    })
                  ),
                  React.createElement('td', null,
                    React.createElement('input', {
                      type: 'text',
                      value: row.program,
                      onChange: e => updateCoa(idx, 'program', e.target.value),
                      placeholder: 'HPC'
                    })
                  ),
                  React.createElement('td', null,
                    React.createElement('button', {
                      className: 'link-btn',
                      onClick: () => removeCoaRow(idx),
                      style: { color: '#dc2626' }
                    }, 'Remove')
                  )
                )
              )
        )
      )
    ),
    React.createElement(
      'button',
      { onClick: addCoaRow, style: { marginTop: '0.75em' } },
      'Add Row'
    ),
    React.createElement(
      'div',
      { style: { marginTop: '1.5em' } },
      React.createElement('button', { onClick: save }, 'Save'),
      status && React.createElement('span', { style: { marginLeft: '0.5em', color: '#16a34a' } }, status),
      error && React.createElement('span', { className: 'error', style: { marginLeft: '0.5em' } }, error)
    )
  );
}

// ---------------------------------------------------------------------------
// Billing Rules UI
// ---------------------------------------------------------------------------

function conditionSummary(rule) {
  const cond = rule.condition || {};
  const field = cond.field || '';
  const op = cond.operator || '';
  const val = cond.value !== undefined ? cond.value : (cond.values || []).join(', ');
  const exclude = (rule.exclude_states || []).length
    ? ` (except ${rule.exclude_states.join(', ')})`
    : '';
  return `${field} ${op} ${val}${exclude}`;
}

function actionLabel(rule) {
  const a = rule.action || '';
  if (a === 'no_charge') return 'No charge';
  if (a === 'discount') return `Discount ${rule.discount_percent || 0}%`;
  if (a === 'charge_requested_time') return 'Charge requested time';
  return a;
}

function BillingRuleModal({ rule, onSave, onClose }) {
  const isNew = !rule.id;
  const [form, setForm] = useState({
    id: rule.id || '',
    name: rule.name || '',
    enabled: rule.enabled !== false,
    condition: { ...{ field: 'state', operator: 'equals', value: '', values: [] }, ...(rule.condition || {}) },
    exclude_states: (rule.exclude_states || []).join(', '),
    action: rule.action || 'no_charge',
    discount_percent: rule.discount_percent != null ? rule.discount_percent : 0,
    description: rule.description || ''
  });
  const [error, setError] = useState(null);
  const firstInputRef = React.useRef(null);
  useEffect(() => { firstInputRef.current?.focus(); }, []);

  function updateCond(field, value) {
    setForm(prev => ({ ...prev, condition: { ...prev.condition, [field]: value } }));
  }

  function handleSave() {
    if (!form.id.trim()) { setError('Rule ID is required'); return; }
    if (!form.name.trim()) { setError('Rule name is required'); return; }

    const out = {
      id: form.id.trim(),
      name: form.name.trim(),
      enabled: form.enabled,
      condition: { ...form.condition },
      action: form.action,
      description: form.description.trim()
    };

    // Normalise condition values for 'in' / 'not_in' operators
    if (out.condition.operator === 'in' || out.condition.operator === 'not_in') {
      const raw = typeof out.condition.values === 'string'
        ? out.condition.values
        : (out.condition.values || []).join(', ');
      out.condition.values = raw.split(',').map(s => s.trim()).filter(Boolean);
      delete out.condition.value;
    } else {
      delete out.condition.values;
    }

    const excludeRaw = form.exclude_states || '';
    const excludeArr = excludeRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (excludeArr.length) out.exclude_states = excludeArr;

    if (out.action === 'discount') {
      const dp = parseInt(form.discount_percent, 10);
      if (!Number.isFinite(dp) || dp < 0 || dp > 100) {
        setError('Discount percent must be 0–100');
        return;
      }
      out.discount_percent = dp;
    }

    onSave(out);
  }

  const operators = ['equals', 'not_equals', 'in', 'not_in', 'less_than', 'greater_than', 'contains'];
  const valuesMode = form.condition.operator === 'in' || form.condition.operator === 'not_in';
  const condValuesRaw = valuesMode
    ? (Array.isArray(form.condition.values) ? form.condition.values.join(', ') : form.condition.values || '')
    : '';

  return React.createElement(
    'div',
    { className: 'modal-overlay', onClick: onClose, onKeyDown: (e) => { if (e.key === 'Escape') onClose(); } },
    React.createElement(
      'div',
      { className: 'modal', onClick: e => e.stopPropagation(), style: { maxWidth: '560px', width: '95%' } },
      React.createElement('h3', null, isNew ? 'Add Billing Rule' : `Edit Rule: ${rule.name}`),
      error && React.createElement('p', { className: 'error' }, error),
      React.createElement('div', { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Rule ID: '),
        React.createElement('input', {
          ref: firstInputRef, type: 'text', value: form.id, disabled: !isNew,
          onChange: e => setForm(prev => ({ ...prev, id: e.target.value })),
          placeholder: 'e.g. no-charge-weekend', style: { width: '100%', marginTop: '4px' }
        })
      ),
      React.createElement('div', { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Name: '),
        React.createElement('input', {
          type: 'text', value: form.name,
          onChange: e => setForm(prev => ({ ...prev, name: e.target.value })),
          style: { width: '100%', marginTop: '4px' }
        })
      ),
      React.createElement('div', { style: { marginBottom: '0.75em' } },
        React.createElement('label', null,
          React.createElement('input', {
            type: 'checkbox', checked: form.enabled,
            onChange: e => setForm(prev => ({ ...prev, enabled: e.target.checked })),
            style: { marginRight: '6px' }
          }),
          'Enabled'
        )
      ),
      React.createElement('fieldset', { style: { marginBottom: '0.75em', padding: '0.5em 0.75em' } },
        React.createElement('legend', null, 'Condition'),
        React.createElement('div', { style: { marginBottom: '0.5em' } },
          React.createElement('label', null, 'Field: '),
          React.createElement('input', {
            type: 'text', value: form.condition.field,
            onChange: e => updateCond('field', e.target.value),
            placeholder: 'state, partition, elapsed_seconds, job_name'
          })
        ),
        React.createElement('div', { style: { marginBottom: '0.5em' } },
          React.createElement('label', null, 'Operator: '),
          React.createElement('select', {
            value: form.condition.operator,
            onChange: e => updateCond('operator', e.target.value)
          },
            operators.map(op => React.createElement('option', { key: op, value: op }, op))
          )
        ),
        valuesMode
          ? React.createElement('div', { style: { marginBottom: '0.5em' } },
              React.createElement('label', null, 'Values (comma-separated): '),
              React.createElement('input', {
                type: 'text', value: condValuesRaw,
                onChange: e => updateCond('values', e.target.value),
                placeholder: 'FAILED, CANCELLED, NODE_FAIL'
              })
            )
          : React.createElement('div', { style: { marginBottom: '0.5em' } },
              React.createElement('label', null, 'Value: '),
              React.createElement('input', {
                type: 'text', value: form.condition.value || '',
                onChange: e => updateCond('value', e.target.value),
                placeholder: 'e.g. debug, OUT_OF_MEMORY, 60'
              })
            )
      ),
      React.createElement('div', { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Exclude states (comma-separated, optional): '),
        React.createElement('input', {
          type: 'text', value: form.exclude_states,
          onChange: e => setForm(prev => ({ ...prev, exclude_states: e.target.value })),
          placeholder: 'OUT_OF_MEMORY, TIMEOUT',
          style: { width: '100%', marginTop: '4px' }
        })
      ),
      React.createElement('div', { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Action: '),
        React.createElement('select', {
          value: form.action,
          onChange: e => setForm(prev => ({ ...prev, action: e.target.value }))
        },
          React.createElement('option', { value: 'no_charge' }, 'No charge'),
          React.createElement('option', { value: 'discount' }, 'Discount'),
          React.createElement('option', { value: 'charge_requested_time' }, 'Charge requested time')
        )
      ),
      form.action === 'discount' && React.createElement('div', { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Discount %: '),
        React.createElement('input', {
          type: 'number', min: 0, max: 100,
          value: form.discount_percent,
          onChange: e => setForm(prev => ({ ...prev, discount_percent: e.target.value }))
        })
      ),
      React.createElement('div', { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Description: '),
        React.createElement('textarea', {
          value: form.description, rows: 2,
          onChange: e => setForm(prev => ({ ...prev, description: e.target.value })),
          style: { width: '100%', marginTop: '4px' }
        })
      ),
      React.createElement('div', { style: { display: 'flex', gap: '0.5em', justifyContent: 'flex-end' } },
        React.createElement('button', { onClick: onClose }, 'Cancel'),
        React.createElement('button', { onClick: handleSave }, 'Save')
      )
    )
  );
}

function BillingRulesTab({ rules, onRulesChange, billingData }) {
  const [editTarget, setEditTarget] = useState(null);

  // Count affected jobs in current billing data for a rule
  function countAffectedJobs(rule) {
    if (!billingData || !billingData.details) return null;
    let count = 0;
    (billingData.details || []).forEach(acct => {
      (acct.users || []).forEach(u => {
        (u.jobs || []).forEach(j => {
          if (!rule.enabled) return;
          const cond = rule.condition || {};
          const field = cond.field;
          const op = cond.operator;
          let jobVal;
          if (field === 'elapsed_seconds') jobVal = j.elapsed || 0;
          else jobVal = j[field] || '';

          let matched = false;
          try {
            if (op === 'equals') matched = jobVal === cond.value;
            else if (op === 'not_equals') matched = jobVal !== cond.value;
            else if (op === 'in') matched = (cond.values || []).includes(jobVal);
            else if (op === 'not_in') matched = !(cond.values || []).includes(jobVal);
            else if (op === 'less_than') matched = Number(jobVal) < Number(cond.value);
            else if (op === 'greater_than') matched = Number(jobVal) > Number(cond.value);
            else if (op === 'contains') matched = String(jobVal).includes(String(cond.value));
          } catch (_) { matched = false; }

          if (matched) {
            const excludes = rule.exclude_states || [];
            if (!excludes.length || !excludes.includes(j.state)) count++;
          }
        });
      });
    });
    return count;
  }

  function handleSave(updatedRule) {
    const idx = rules.findIndex(r => r.id === updatedRule.id);
    let newRules;
    if (idx >= 0) {
      newRules = rules.map((r, i) => i === idx ? updatedRule : r);
    } else {
      newRules = [...rules, updatedRule];
    }
    onRulesChange(newRules);
    setEditTarget(null);
  }

  function handleToggle(idx) {
    const newRules = rules.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r);
    onRulesChange(newRules);
  }

  function handleRemove(idx) {
    const rule = rules[idx];
    if (!window.confirm(`Remove rule "${rule.name}"?`)) return;
    onRulesChange(rules.filter((_, i) => i !== idx));
  }

  function moveRule(idx, direction) {
    const newRules = rules.slice();
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= newRules.length) return;
    [newRules[idx], newRules[swapIdx]] = [newRules[swapIdx], newRules[idx]];
    onRulesChange(newRules);
  }

  return React.createElement(
    'div',
    null,
    React.createElement('h3', null, 'Billing Rules'),
    React.createElement(
      'p',
      { style: { color: '#4b5563', fontSize: '0.9em' } },
      'Rules are evaluated in order — first matching rule wins. Disabled rules are skipped.'
    ),
    React.createElement(
      'div',
      { className: 'table-container' },
      React.createElement(
        'table',
        { className: 'rates-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Order'),
            React.createElement('th', null, 'Enabled'),
            React.createElement('th', null, 'Name'),
            React.createElement('th', null, 'Condition'),
            React.createElement('th', null, 'Action'),
            React.createElement('th', null, 'Description'),
            React.createElement('th', null, 'Preview'),
            React.createElement('th', null)
          )
        ),
        React.createElement(
          'tbody',
          null,
          rules.length === 0
            ? React.createElement(
                'tr',
                null,
                React.createElement(
                  'td',
                  { colSpan: 8, style: { textAlign: 'center', color: '#9ca3af', padding: '1em' } },
                  'No billing rules configured. Click "Add Rule" to create one.'
                )
              )
            : rules.map((rule, idx) => {
                const affected = countAffectedJobs(rule);
                return React.createElement(
                  'tr',
                  { key: rule.id, style: { opacity: rule.enabled ? 1 : 0.5 } },
                  React.createElement(
                    'td',
                    { style: { whiteSpace: 'nowrap' } },
                    React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        disabled: idx === 0,
                        onClick: () => moveRule(idx, -1),
                        style: { marginRight: '2px' }
                      },
                      '\u25b2'
                    ),
                    React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        disabled: idx === rules.length - 1,
                        onClick: () => moveRule(idx, 1)
                      },
                      '\u25bc'
                    )
                  ),
                  React.createElement(
                    'td',
                    null,
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: !!rule.enabled,
                      onChange: () => handleToggle(idx)
                    })
                  ),
                  React.createElement('td', null, React.createElement('strong', null, rule.name)),
                  React.createElement('td', { style: { fontFamily: 'monospace', fontSize: '0.85em' } }, conditionSummary(rule)),
                  React.createElement('td', null, actionLabel(rule)),
                  React.createElement('td', { style: { color: '#4b5563', fontSize: '0.85em' } }, rule.description || ''),
                  React.createElement(
                    'td',
                    { style: { fontSize: '0.85em' } },
                    affected !== null
                      ? React.createElement(
                          'span',
                          {
                            style: {
                              backgroundColor: affected > 0 ? '#fef3c7' : '#f3f4f6',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              color: affected > 0 ? '#92400e' : '#6b7280'
                            }
                          },
                          `${affected} job${affected !== 1 ? 's' : ''}`
                        )
                      : React.createElement('span', { style: { color: '#9ca3af' } }, '\u2014')
                  ),
                  React.createElement(
                    'td',
                    { style: { whiteSpace: 'nowrap' } },
                    React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => setEditTarget(rule),
                        style: { marginRight: '6px' }
                      },
                      'Edit'
                    ),
                    React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => handleRemove(idx),
                        style: { color: '#dc2626' }
                      },
                      'Remove'
                    )
                  )
                );
              })
        )
      )
    ),
    React.createElement(
      'button',
      { onClick: () => setEditTarget({}), style: { marginTop: '0.75em' } },
      'Add Rule'
    ),
    editTarget !== null && React.createElement(BillingRuleModal, {
      rule: editTarget,
      onSave: handleSave,
      onClose: () => setEditTarget(null)
    })
  );
}

function Rates({ onRatesUpdated, billingData }) {
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [billingRules, setBillingRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [ratesChangeLog, setRatesChangeLog] = useState([]);
  const [ratesTab, setRatesTab] = useState('rates'); // 'rates' | 'allocations' | 'billing-rules' | 'financial'
  // historicalRates: array of { date: 'YYYY-MM', cpuRate: number, gpuRate: number }
  const [historicalRates, setHistoricalRates] = useState([]);
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
        setOriginalConfig(json);
        setConfig({
          defaultRate: json.defaultRate ?? '',
          defaultGpuRate: json.defaultGpuRate ?? ''
        });
        setRatesChangeLog(json.changeLog || []);

        // Merge historicalRates + historicalGpuRates into a unified array
        // keyed by YYYY-MM date string for display and editing.
        const histCpu = json.historicalRates || {};
        const histGpu = json.historicalGpuRates || {};
        const allDates = Array.from(new Set([...Object.keys(histCpu), ...Object.keys(histGpu)])).sort().reverse();
        setHistoricalRates(allDates.map(d => ({
          date: d,
          cpuRate: histCpu[d] != null ? histCpu[d] : '',
          gpuRate: histGpu[d] != null ? histGpu[d] : ''
        })));

        const ovrs = json.overrides
          ? Object.entries(json.overrides).map(([account, cfg]) => ({
              account,
              rate: cfg.rate ?? '',
              gpuRate: cfg.gpuRate ?? '',
              discount: cfg.discount != null ? cfg.discount * 100 : ''
            }))
          : [];
        setOverrides(ovrs);
        setAllocations(json.allocations || {});
        setBillingRules(json.billing_rules || []);
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
    setOverrides(prev => [...prev, { account: '', rate: '', gpuRate: '', discount: '' }]);
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

      // Start from the original loaded config so fields not shown in the UI
      // (e.g. historicalRates, historicalGpuRates) are preserved on save.
      const json = Object.assign({}, originalConfig || {}, { defaultRate });

      const defaultGpuRate = parseFloat(config.defaultGpuRate);
      if (Number.isFinite(defaultGpuRate)) {
        json.defaultGpuRate = defaultGpuRate;
      } else if (config.defaultGpuRate === '' && 'defaultGpuRate' in json) {
        // If the field was cleared, remove it so the backend uses its default
        delete json.defaultGpuRate;
      }

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
          if (o.gpuRate !== '') {
            const gpuRate = parseFloat(o.gpuRate);
            if (Number.isFinite(gpuRate)) {
              entry.gpuRate = gpuRate;
            } else {
              console.warn(`Ignoring invalid GPU rate for account ${o.account}:`, o.gpuRate);
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
        json.overrides = Object.keys(overridesJson).length ? overridesJson : undefined;
        if (json.overrides === undefined) delete json.overrides;
      } else {
        delete json.overrides;
      }

      // Persist allocations from the UI state
      if (Object.keys(allocations).length) {
        json.allocations = allocations;
      } else {
        delete json.allocations;
      }

      // Persist billing rules from the UI state
      if (billingRules.length) {
        json.billing_rules = billingRules;
      } else {
        delete json.billing_rules;
      }

      // Build a human-readable change summary for the audit log
      const changeParts = [];
      const prevRate = originalConfig && originalConfig.defaultRate != null ? originalConfig.defaultRate : null;
      if (prevRate !== null && String(prevRate) !== String(defaultRate)) {
        changeParts.push(`defaultRate: ${prevRate}\u2192${defaultRate}`);
      }
      const prevGpuRate = originalConfig && originalConfig.defaultGpuRate != null ? originalConfig.defaultGpuRate : null;
      const newGpuRate = json.defaultGpuRate != null ? json.defaultGpuRate : null;
      if (prevGpuRate !== newGpuRate && (prevGpuRate !== null || newGpuRate !== null)) {
        changeParts.push(`defaultGpuRate: ${prevGpuRate}\u2192${newGpuRate}`);
      }
      const prevOverrideKeys = originalConfig && originalConfig.overrides ? Object.keys(originalConfig.overrides) : [];
      const newOverrideKeys = json.overrides ? Object.keys(json.overrides) : [];
      newOverrideKeys.filter(k => !prevOverrideKeys.includes(k)).forEach(k => changeParts.push(`${k} override added`));
      prevOverrideKeys.filter(k => !newOverrideKeys.includes(k)).forEach(k => changeParts.push(`${k} override removed`));
      const changeEntry = {
        at: new Date().toISOString(),
        by: (typeof window !== 'undefined' && window.cockpit && window.cockpit.user
          ? (window._cockpitUsername || 'admin')
          : 'admin'),
        changes: changeParts.length ? changeParts.join(', ') : 'settings updated'
      };
      const updatedLog = [...ratesChangeLog, changeEntry].slice(-50);
      json.changeLog = updatedLog;
      setRatesChangeLog(updatedLog);

      // Persist historical rates back into the two separate maps
      if (historicalRates.length) {
        const histCpuOut = {};
        const histGpuOut = {};
        historicalRates.forEach(entry => {
          if (!entry.date) return;
          const cpuVal = parseFloat(entry.cpuRate);
          const gpuVal = parseFloat(entry.gpuRate);
          if (Number.isFinite(cpuVal)) histCpuOut[entry.date] = cpuVal;
          if (Number.isFinite(gpuVal)) histGpuOut[entry.date] = gpuVal;
        });
        if (Object.keys(histCpuOut).length) json.historicalRates = histCpuOut;
        else delete json.historicalRates;
        if (Object.keys(histGpuOut).length) json.historicalGpuRates = histGpuOut;
        else delete json.historicalGpuRates;
      } else {
        delete json.historicalRates;
        delete json.historicalGpuRates;
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

  const ratesContent = React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Rate Configuration'),
    React.createElement(
      'div',
      null,
      React.createElement(
        'label',
        null,
        'Default CPU Rate ($/core-hour): ',
        React.createElement('input', {
          type: 'number',
          step: '0.001',
          value: config.defaultRate,
          onChange: e =>
            setConfig({ ...config, defaultRate: e.target.value })
        })
      )
    ),
    React.createElement(
      'div',
      { style: { marginTop: '0.5em' } },
      React.createElement(
        'label',
        null,
        'Default GPU Rate ($/GPU-hour): ',
        React.createElement('input', {
          type: 'number',
          step: '0.001',
          value: config.defaultGpuRate,
          onChange: e =>
            setConfig({ ...config, defaultGpuRate: e.target.value })
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
          React.createElement('th', null, 'CPU Rate ($/core-hr)'),
          React.createElement('th', null, 'GPU Rate ($/GPU-hr)'),
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
                step: '0.001',
                value: o.gpuRate,
                onChange: e =>
                  updateOverride(idx, 'gpuRate', e.target.value)
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
    ),
    ratesChangeLog.length > 0 && React.createElement(
      'div',
      { style: { marginTop: '2em' } },
      React.createElement('h3', { style: { marginBottom: '0.5em' } }, 'Change History'),
      React.createElement(
        'div',
        {
          style: {
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            overflow: 'hidden',
            maxHeight: '260px',
            overflowY: 'auto'
          }
        },
        React.createElement(
          'table',
          { className: 'details-table', style: { margin: 0 } },
          React.createElement(
            'thead',
            null,
            React.createElement(
              'tr',
              null,
              React.createElement('th', null, 'Time'),
              React.createElement('th', null, 'By'),
              React.createElement('th', null, 'Changes')
            )
          ),
          React.createElement(
            'tbody',
            null,
            ratesChangeLog.slice().reverse().map((entry, i) =>
              React.createElement(
                'tr',
                { key: i },
                React.createElement('td', { style: { whiteSpace: 'nowrap', fontSize: '0.85em' } },
                  entry.at ? new Date(entry.at).toLocaleString() : ''),
                React.createElement('td', { style: { fontSize: '0.85em' } }, entry.by || ''),
                React.createElement('td', { style: { fontSize: '0.85em' } }, entry.changes || '')
              )
            )
          )
        )
      )
    ),

    // Historical Rates section
    React.createElement(
      'div',
      { style: { marginTop: '2em' } },
      React.createElement('h3', { style: { marginBottom: '0.5em' } }, 'Historical Rates'),
      React.createElement(
        'p',
        { style: { fontSize: '0.85em', color: '#6b7280', marginBottom: '0.75em' } },
        'Track rates that were effective in prior billing periods. These are stored in rates.json and used for accurate retroactive billing.'
      ),
      React.createElement(
        'div',
        {
          style: {
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            overflow: 'hidden'
          }
        },
        React.createElement(
          'table',
          { className: 'details-table', style: { margin: 0 } },
          React.createElement(
            'thead',
            null,
            React.createElement(
              'tr',
              null,
              React.createElement('th', null, 'Effective Date (YYYY-MM)'),
              React.createElement('th', null, 'CPU Rate ($/core-hr)'),
              React.createElement('th', null, 'GPU Rate ($/GPU-hr)'),
              React.createElement('th', null)
            )
          ),
          React.createElement(
            'tbody',
            null,
            historicalRates.length === 0
              ? React.createElement(
                  'tr',
                  null,
                  React.createElement(
                    'td',
                    { colSpan: 4, style: { textAlign: 'center', color: '#9ca3af', padding: '1em' } },
                    'No historical rate entries. Add one below.'
                  )
                )
              : historicalRates.map((entry, idx) =>
                  React.createElement(
                    'tr',
                    { key: idx },
                    React.createElement(
                      'td',
                      null,
                      React.createElement('input', {
                        type: 'text',
                        placeholder: 'YYYY-MM',
                        value: entry.date,
                        style: { width: '100px' },
                        onChange: e => setHistoricalRates(prev =>
                          prev.map((r, i) => i === idx ? { ...r, date: e.target.value } : r)
                        )
                      })
                    ),
                    React.createElement(
                      'td',
                      null,
                      React.createElement('input', {
                        type: 'number',
                        step: '0.001',
                        value: entry.cpuRate,
                        onChange: e => setHistoricalRates(prev =>
                          prev.map((r, i) => i === idx ? { ...r, cpuRate: e.target.value } : r)
                        )
                      })
                    ),
                    React.createElement(
                      'td',
                      null,
                      React.createElement('input', {
                        type: 'number',
                        step: '0.001',
                        value: entry.gpuRate,
                        onChange: e => setHistoricalRates(prev =>
                          prev.map((r, i) => i === idx ? { ...r, gpuRate: e.target.value } : r)
                        )
                      })
                    ),
                    React.createElement(
                      'td',
                      null,
                      React.createElement(
                        'button',
                        {
                          className: 'link-btn',
                          onClick: () => setHistoricalRates(prev => prev.filter((_, i) => i !== idx))
                        },
                        'Remove'
                      )
                    )
                  )
                )
          )
        )
      ),
      React.createElement(
        'button',
        {
          onClick: () => setHistoricalRates(prev => [{ date: '', cpuRate: '', gpuRate: '' }, ...prev]),
          style: { marginTop: '0.5em' }
        },
        'Add Entry'
      ),
      React.createElement(
        'div',
        { style: { marginTop: '0.75em' } },
        React.createElement('button', { onClick: save, disabled: saving }, 'Save Historical Rates'),
        saving && React.createElement('span', null, ' Saving...'),
        status && React.createElement('span', { style: { marginLeft: '0.5em' } }, status)
      )
    )
  );

  return React.createElement(
    'div',
    null,
    React.createElement(InstitutionProfile, null),
    // Tab bar for Rates / Allocations / Billing Rules / Financial Integration
    React.createElement(
      'div',
      { style: { borderBottom: '2px solid #e5e7eb', marginBottom: '1em', marginTop: '1.5em' } },
      ['rates', 'allocations', 'billing-rules', 'financial'].map(tab => {
        const labels = { rates: 'Rate Configuration', allocations: 'Allocations', 'billing-rules': 'Billing Rules', financial: 'Financial Integration' };
        return React.createElement(
          'button',
          {
            key: tab,
            onClick: () => setRatesTab(tab),
            style: {
              marginRight: '4px',
              borderBottom: ratesTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              background: 'none',
              fontWeight: ratesTab === tab ? 'bold' : 'normal',
              color: ratesTab === tab ? '#3b82f6' : undefined,
              paddingBottom: '6px',
              cursor: 'pointer'
            }
          },
          labels[tab]
        );
      })
    ),
    ratesTab === 'rates' && ratesContent,
    ratesTab === 'allocations' && React.createElement(AllocationsTab, {
      allocations,
      onAllocationsChange: updated => {
        setAllocations(updated);
        setStatus(null);
      },
      accounts
    }),
    ratesTab === 'allocations' && React.createElement(
      'div',
      { style: { marginTop: '1em' } },
      React.createElement('button', { onClick: save, disabled: saving }, 'Save'),
      saving && React.createElement('span', null, ' Saving...'),
      status && React.createElement('span', { style: { marginLeft: '0.5em' } }, status)
    ),
    ratesTab === 'billing-rules' && React.createElement(BillingRulesTab, {
      rules: billingRules,
      onRulesChange: updated => {
        setBillingRules(updated);
        setStatus(null);
      },
      billingData
    }),
    ratesTab === 'billing-rules' && React.createElement(
      'div',
      { style: { marginTop: '1em' } },
      React.createElement('button', { onClick: save, disabled: saving }, 'Save'),
      saving && React.createElement('span', null, ' Saving...'),
      status && React.createElement('span', { style: { marginLeft: '0.5em' } }, status)
    ),
    ratesTab === 'financial' && React.createElement(FinancialIntegrationTab, null)
  );
}

// ---------------------------------------------------------------------------
// Invoice Ledger helpers
// ---------------------------------------------------------------------------
const INVOICE_LEDGER_PATH = '/etc/slurmledger/invoices.json';
const INVOICE_LEDGER_PATH_FALLBACK = `${
  (typeof window !== 'undefined' &&
    window.cockpit &&
    window.cockpit.user &&
    window.cockpit.user()) || {}
}.home || ''}/slurmledger/invoices.json`;

function getInvoiceLedgerPath() {
  // Use /etc path when running as root/admin, otherwise user-local path
  return INVOICE_LEDGER_PATH;
}

async function loadInvoiceLedger(setError) {
  try {
    let content;
    if (HAS_COCKPIT) {
      content = await window.cockpit.spawn(
        ['python3', `${PLUGIN_BASE}/ledger_util.py`, '--action', 'read'],
        { err: 'message' }
      );
    } else {
      const resp = await fetch('invoices.json');
      if (!resp.ok) return { invoices: [] };
      content = await resp.text();
    }
    try {
      const parsed = JSON.parse(content);
      if (!parsed.invoices || !Array.isArray(parsed.invoices)) {
        throw new Error('Invalid ledger format');
      }
      return parsed;
    } catch (e) {
      console.error('Invoice ledger corrupted:', e);
      if (setError) {
        setError('Invoice ledger is corrupted. Check /etc/slurmledger/invoices.json or restore from backup (.bak)');
      }
      return { invoices: [], corrupted: true };
    }
  } catch (e) {
    return { invoices: [] };
  }
}

async function saveInvoiceLedger(ledger) {
  if (HAS_COCKPIT) {
    const text = JSON.stringify(ledger, null, 2);
    await window.cockpit.spawn(
      ['python3', `${PLUGIN_BASE}/ledger_util.py`, '--action', 'add'],
      { input: text, err: 'message' }
    );
  } else {
    const text = JSON.stringify(ledger, null, 2);
    await fetch('invoices.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: text
    });
  }
}

async function updateInvoiceLedger(invoiceId, patch) {
  if (HAS_COCKPIT) {
    await window.cockpit.spawn(
      ['python3', `${PLUGIN_BASE}/ledger_util.py`, '--action', 'update', '--invoice-id', invoiceId],
      { input: JSON.stringify(patch), err: 'message' }
    );
  } else {
    // Fallback: read-modify-write via fetch
    const resp = await fetch('invoices.json');
    if (!resp.ok) throw new Error('Failed to load ledger');
    const ledger = await resp.json();
    const updated = {
      ...ledger,
      invoices: (ledger.invoices || []).map(inv =>
        inv.id === invoiceId ? { ...inv, ...patch } : inv
      )
    };
    await fetch('invoices.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated, null, 2)
    });
  }
}

async function addRefundToLedger(invoiceId, refund) {
  if (HAS_COCKPIT) {
    await window.cockpit.spawn(
      ['python3', `${PLUGIN_BASE}/ledger_util.py`, '--action', 'add-refund', '--invoice-id', invoiceId],
      { input: JSON.stringify(refund), err: 'message' }
    );
  } else {
    // Fallback: read-modify-write via fetch
    const resp = await fetch('invoices.json');
    if (!resp.ok) throw new Error('Failed to load ledger');
    const ledger = await resp.json();
    const updated = {
      ...ledger,
      invoices: (ledger.invoices || []).map(inv => {
        if (inv.id !== invoiceId) return inv;
        const refunds = [...(inv.refunds || []), refund];
        return { ...inv, refunds, ...(refund.full ? { status: 'refunded' } : {}) };
      })
    };
    await fetch('invoices.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated, null, 2)
    });
  }
}

function generateRefundId(invoices) {
  const year = new Date().getFullYear();
  const existing = invoices.flatMap(inv => inv.refunds || []);
  const nums = existing
    .map(r => r.id)
    .filter(id => id && id.startsWith(`REF-${year}-`))
    .map(id => parseInt(id.split('-')[2], 10))
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `REF-${year}-${String(next).padStart(3, '0')}`;
}

// Status badge colours
const STATUS_COLORS = {
  draft: '#6b7280',
  sent: '#3b82f6',
  viewed: '#d97706',
  paid: '#16a34a',
  cancelled: '#dc2626',
  refunded: '#ea580c'
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280';
  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: color,
        color: '#fff',
        fontSize: '0.75em',
        fontWeight: 'bold',
        textTransform: 'capitalize'
      }
    },
    status
  );
}

function RefundModal({ invoice, currentUser, onClose, onIssue }) {
  const [amount, setAmount] = useState(invoice.amount || 0);
  const [reason, setReason] = useState('');
  const [partial, setPartial] = useState(false);
  const [error, setError] = useState(null);
  const firstInputRef = React.useRef(null);
  useEffect(() => { firstInputRef.current?.focus(); }, []);

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid refund amount');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }
    if (amt > invoice.amount) {
      setError('Refund cannot exceed invoice amount');
      return;
    }
    onIssue({ amount: amt, reason: reason.trim(), partial });
  }

  return React.createElement(
    'div',
    { className: 'modal-overlay', onClick: onClose, onKeyDown: (e) => { if (e.key === 'Escape') onClose(); } },
    React.createElement(
      'div',
      {
        className: 'modal',
        onClick: e => e.stopPropagation(),
        style: { maxWidth: '480px', width: '90%' }
      },
      React.createElement('h3', null, `Issue Refund — ${invoice.id}`),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Refund Amount ($): '),
        React.createElement('input', {
          ref: firstInputRef,
          type: 'number',
          step: '0.01',
          value: amount,
          onChange: e => {
            setAmount(e.target.value);
            setPartial(parseFloat(e.target.value) < invoice.amount);
          },
          style: { width: '100%', marginTop: '4px' }
        })
      ),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null, 'Reason: '),
        React.createElement('textarea', {
          value: reason,
          onChange: e => setReason(e.target.value),
          rows: 3,
          style: { width: '100%', marginTop: '4px' }
        })
      ),
      React.createElement(
        'div',
        { style: { marginBottom: '0.75em' } },
        React.createElement('label', null,
          React.createElement('input', {
            type: 'checkbox',
            checked: partial,
            onChange: e => setPartial(e.target.checked),
            style: { marginRight: '6px' }
          }),
          'Partial refund'
        )
      ),
      error && React.createElement('p', { className: 'error' }, error),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '0.5em', justifyContent: 'flex-end' } },
        React.createElement('button', { onClick: onClose }, 'Cancel'),
        React.createElement(
          'button',
          { onClick: handleSubmit, style: { backgroundColor: '#ea580c', color: '#fff' } },
          'Issue Refund'
        )
      )
    )
  );
}

function Invoices({ currentUser, billingData, institutionProfile: instProfile }) {
  const [ledger, setLedger] = useState({ invoices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [refundTarget, setRefundTarget] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null); // null | { done, total, message }
  const [expandedAudit, setExpandedAudit] = useState(null); // invoice id or null

  useEffect(() => {
    setLoading(true);
    loadInvoiceLedger(setError)
      .then(data => {
        setLedger(data || { invoices: [] });
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || String(e));
        setLoading(false);
      });
  }, []);

  async function updateInvoice(id, patch) {
    try {
      await updateInvoiceLedger(id, patch);
      setLedger(prev => ({
        ...prev,
        invoices: (prev.invoices || []).map(inv =>
          inv.id === id ? { ...inv, ...patch } : inv
        )
      }));
    } catch (e) {
      setError('Failed to save: ' + (e.message || String(e)));
    }
  }

  async function handleMarkSent(inv) {
    await updateInvoice(inv.id, {
      status: 'sent',
      sent: new Date().toISOString()
    });
    triggerWebhook('invoice.sent', inv.id);
  }

  async function handleMarkPaid(inv) {
    await updateInvoice(inv.id, {
      status: 'paid',
      paid: new Date().toISOString()
    });
    triggerWebhook('invoice.paid', inv.id);
  }

  async function handleCancel(inv) {
    if (!window.confirm(`Cancel invoice ${inv.id}?`)) return;
    await updateInvoice(inv.id, { status: 'cancelled' });
  }

  async function triggerWebhook(eventType, invoiceId) {
    if (!HAS_COCKPIT) return;
    const webhookAt = new Date().toISOString();
    try {
      await window.cockpit.spawn(
        [
          'python3', `${PLUGIN_BASE}/financial_export.py`,
          '--event', eventType,
          '--invoice-id', invoiceId,
          '--format', 'webhook'
        ],
        { err: 'message' }
      );
      const patch = { lastWebhookStatus: 'success', lastWebhookAt: webhookAt };
      await updateInvoiceLedger(invoiceId, patch);
      setLedger(prev => ({
        ...prev,
        invoices: (prev.invoices || []).map(inv =>
          inv.id === invoiceId ? { ...inv, ...patch } : inv
        )
      }));
    } catch (e) {
      const statusMsg = `failed: ${e.message || String(e)}`;
      const patch = { lastWebhookStatus: statusMsg, lastWebhookAt: webhookAt };
      try {
        await updateInvoiceLedger(invoiceId, patch);
      } catch (_) {}
      setLedger(prev => ({
        ...prev,
        invoices: (prev.invoices || []).map(inv =>
          inv.id === invoiceId ? { ...inv, ...patch } : inv
        )
      }));
      setError(`Webhook failed for ${invoiceId}: ${e.message || String(e)}`);
    }
  }

  async function exportInvoiceFormat(inv, format) {
    setExportError(null);
    if (!HAS_COCKPIT) {
      setExportError('Export requires Cockpit environment');
      return;
    }
    try {
      const output = await window.cockpit.spawn(
        [
          'python3', `${PLUGIN_BASE}/financial_export.py`,
          '--event', 'invoice.export',
          '--invoice-id', inv.id,
          '--format', format
        ],
        { err: 'message' }
      );
      const mimeTypes = {
        journal_csv: 'text/csv',
        oracle_xml: 'application/xml',
        json: 'application/json'
      };
      const extensions = { journal_csv: 'csv', oracle_xml: 'xml', json: 'json' };
      const blob = new Blob([output], { type: mimeTypes[format] || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.id}.${extensions[format] || 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError('Export failed: ' + (e.message || String(e)));
    }
  }

  async function handleIssueRefund(inv, { amount, reason, partial: isPartial }) {
    const refund = {
      id: generateRefundId(ledger.invoices),
      amount,
      reason,
      date: new Date().toISOString(),
      issuedBy: currentUser || 'admin',
      full: !isPartial
    };
    try {
      await addRefundToLedger(inv.id, refund);
      const newStatus = isPartial ? inv.status : 'refunded';
      setLedger(prev => ({
        ...prev,
        invoices: (prev.invoices || []).map(i => {
          if (i.id !== inv.id) return i;
          return { ...i, status: newStatus, refunds: [...(i.refunds || []), refund] };
        })
      }));
    } catch (e) {
      setError('Failed to issue refund: ' + (e.message || String(e)));
      return;
    }
    setRefundTarget(null);
    triggerWebhook('invoice.refunded', inv.id);
    // Generate credit memo PDF
    await generateCreditMemo(inv, refund);
  }

  async function generateCreditMemo(inv, refund) {
    if (!HAS_COCKPIT) return;
    try {
      const creditData = {
        invoice_number: `CM-${refund.id}`,
        date_issued: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        due_date: '',
        period: inv.period || '',
        is_credit_memo: true,
        original_invoice: inv.id,
        refund_reason: refund.reason,
        items: (inv.items || []).map(item => ({
          ...item,
          amount: -Math.abs(item.amount || 0),
          description: `CREDIT: ${item.description || ''}`
        })),
        subtotal: -Math.abs(refund.amount),
        discount: 0,
        tax: 0,
        total_due: -Math.abs(refund.amount),
        institution: inv.institution || {},
        logo: inv.logo || '',
        bank_info: inv.bank_info || [],
        notes: `Credit memo for ${refund.reason}. Original invoice: ${inv.id}.`
      };
      const output = await window.cockpit.spawn(
        ['python3', `${PLUGIN_BASE}/invoice.py`],
        { input: JSON.stringify(creditData), err: 'out' }
      );
      const trimmed = output.trim();
      if (!trimmed) return;
      let byteChars;
      try { byteChars = atob(trimmed); } catch (_) { return; }
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credit_memo_${refund.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Credit memo generation failed:', e);
    }
  }

  async function generateAllInvoices() {
    if (!billingData || !billingData.details || billingData.details.length === 0) {
      setError('No billing data available for batch generation.');
      return;
    }
    if (!instProfile) {
      setError('Institution profile not loaded.');
      return;
    }
    const requiredFields = ['institutionName', 'streetAddress', 'city', 'postalCode'];
    const missing = requiredFields.filter(f => !instProfile[f]);
    if (missing.length > 0) {
      alert(`Institution profile incomplete. Please configure: ${missing.join(', ')}`);
      return;
    }
    const details = billingData.details || [];
    // Group by account
    const byAccount = {};
    details.forEach(d => {
      if (!d.account) return;
      if (!byAccount[d.account]) byAccount[d.account] = { core_hours: 0, gpu_hours: 0, cost: 0 };
      byAccount[d.account].core_hours += d.core_hours || 0;
      byAccount[d.account].gpu_hours += d.gpu_hours || 0;
      byAccount[d.account].cost += d.cost || 0;
    });
    const accountList = Object.keys(byAccount);
    if (accountList.length === 0) {
      setError('No accounts found in billing data.');
      return;
    }

    // Load rates
    let ratesConfig = null;
    try {
      let ratesText;
      if (window.cockpit && window.cockpit.file) {
        ratesText = await window.cockpit.file(`${PLUGIN_BASE}/rates.json`).read();
      } else {
        const resp = await fetch('rates.json');
        if (resp.ok) ratesText = await resp.text();
      }
      if (ratesText) ratesConfig = JSON.parse(ratesText);
    } catch (_) {}

    const currentLedger = await loadInvoiceLedger();
    let generated = 0;
    const total = accountList.length;
    setBatchProgress({ done: 0, total, message: `Starting batch generation for ${total} accounts...` });

    for (const account of accountList) {
      const acct = byAccount[account];
      let cpuRate = ratesConfig && ratesConfig.defaultRate != null ? ratesConfig.defaultRate : 0.01;
      let gpuRate = ratesConfig && ratesConfig.defaultGpuRate != null ? ratesConfig.defaultGpuRate : 0.10;
      if (ratesConfig && ratesConfig.overrides && ratesConfig.overrides[account]) {
        const ovr = ratesConfig.overrides[account];
        if (ovr.rate != null) cpuRate = ovr.rate;
        if (ovr.gpuRate != null) gpuRate = ovr.gpuRate;
      }
      const items = [];
      if (acct.core_hours > 0) items.push({ description: 'CPU Core-Hours', qty: acct.core_hours, rate: cpuRate, amount: acct.core_hours * cpuRate });
      if (acct.gpu_hours > 0) items.push({ description: 'GPU Hours', qty: acct.gpu_hours, rate: gpuRate, amount: acct.gpu_hours * gpuRate });
      if (items.length === 0) { generated++; continue; }

      const invoiceNumber = (() => {
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;
        const existing = (currentLedger.invoices || [])
          .filter(inv => inv.id && inv.id.startsWith(prefix))
          .map(inv => parseInt(inv.id.replace(prefix, ''), 10))
          .filter(n => !isNaN(n));
        const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
        const id = `${prefix}${String(next).padStart(4, '0')}`;
        // push a placeholder so next iteration increments correctly
        currentLedger.invoices = currentLedger.invoices || [];
        currentLedger.invoices.push({ id });
        return id;
      })();

      const paymentTermsDays = instProfile.paymentTermsDays || 30;
      const dueDateMs = Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000;
      const invoiceData = {
        invoice_number: invoiceNumber,
        date_issued: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        fiscal_year: new Date().getFullYear().toString(),
        due_date: new Date(dueDateMs).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        payment_terms: instProfile.paymentTerms || `Net ${paymentTermsDays}`,
        period: billingData.period || '',
        items,
        subtotal: items.reduce((s, i) => s + i.amount, 0),
        discount: 0,
        tax: 0,
        total_due: items.reduce((s, i) => s + i.amount, 0),
        institution: {
          name: instProfile.institutionName || '',
          abbreviation: instProfile.institutionAbbreviation || '',
          department: instProfile.departmentName || '',
          address: instProfile.streetAddress || '',
          city: instProfile.city || '',
          state: instProfile.state || '',
          postal: instProfile.postalCode || '',
          country: instProfile.country || '',
          contact: instProfile.primaryContact || {}
        },
        logo: instProfile.logo || '',
        bank_info: instProfile.bankInfo && instProfile.bankInfo.trim()
          ? instProfile.bankInfo.split('\n').map(l => l.trim()).filter(Boolean)
          : [],
        notes: instProfile.notes || '',
        account
      };

      try {
        if (HAS_COCKPIT) {
          const output = await window.cockpit.spawn(
            ['python3', `${PLUGIN_BASE}/invoice.py`],
            { input: JSON.stringify(invoiceData), err: 'out' }
          );
          const trimmed = output.trim();
          if (trimmed) {
            try {
              const byteChars = atob(trimmed);
              const bytes = new Uint8Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
              const blob = new Blob([bytes], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `invoice_${invoiceNumber}_${account}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (_) {}
          }
        }
        await saveInvoiceToLedger(invoiceData, invoiceData.total_due);
        generated++;
        setBatchProgress({ done: generated, total, message: `Generated ${generated} of ${total} invoices...` });
      } catch (e) {
        console.error(`Batch invoice failed for ${account}:`, e);
        generated++;
        setBatchProgress({ done: generated, total, message: `Generated ${generated} of ${total} invoices (some errors)...` });
      }
    }

    // Reload ledger
    const refreshed = await loadInvoiceLedger(setError);
    setLedger(refreshed || { invoices: [] });
    setBatchProgress({ done: total, total, message: `Done! Generated ${generated} of ${total} invoices.` });
    setTimeout(() => setBatchProgress(null), 4000);
  }

  const invoices = ledger.invoices || [];
  const allAccounts = [...new Set(invoices.map(inv => inv.account).filter(Boolean))];
  const allPeriods = [...new Set(invoices.map(inv => inv.period).filter(Boolean))].sort().reverse();

  const filtered = invoices.filter(inv => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (filterAccount && inv.account !== filterAccount) return false;
    if (filterPeriod && inv.period !== filterPeriod) return false;
    return true;
  });

  if (loading) return React.createElement('p', null, 'Loading invoices...');

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5em' } },
      React.createElement('h2', { style: { margin: 0 } }, 'Invoices'),
      React.createElement(
        'button',
        {
          onClick: generateAllInvoices,
          disabled: !!batchProgress,
          style: { marginLeft: '1em' }
        },
        batchProgress ? `${batchProgress.message}` : 'Generate All Invoices'
      )
    ),
    batchProgress && React.createElement(
      'div',
      { style: { marginBottom: '0.75em' } },
      React.createElement(
        'div',
        { style: { background: '#e5e7eb', borderRadius: '4px', height: '8px', width: '100%', marginBottom: '4px' } },
        React.createElement('div', {
          style: {
            width: `${Math.round((batchProgress.done / batchProgress.total) * 100)}%`,
            height: '100%',
            borderRadius: '4px',
            background: '#3b82f6',
            transition: 'width 0.3s'
          }
        })
      ),
      React.createElement('span', { style: { fontSize: '0.85em', color: '#4b5563' } }, batchProgress.message)
    ),
    error && React.createElement('p', { className: 'error' }, error),

    // Filters
    React.createElement(
      'div',
      { className: 'filter-bar', style: { marginBottom: '1em' } },
      React.createElement(
        'select',
        { value: filterStatus, onChange: e => setFilterStatus(e.target.value) },
        React.createElement('option', { value: '' }, 'All Statuses'),
        ['draft', 'sent', 'viewed', 'paid', 'cancelled', 'refunded'].map(s =>
          React.createElement('option', { key: s, value: s }, s)
        )
      ),
      React.createElement(
        'select',
        { value: filterAccount, onChange: e => setFilterAccount(e.target.value) },
        React.createElement('option', { value: '' }, 'All Accounts'),
        allAccounts.map(a => React.createElement('option', { key: a, value: a }, a))
      ),
      React.createElement(
        'select',
        { value: filterPeriod, onChange: e => setFilterPeriod(e.target.value) },
        React.createElement('option', { value: '' }, 'All Periods'),
        allPeriods.map(p => React.createElement('option', { key: p, value: p }, p))
      )
    ),

    // Table
    filtered.length === 0
      ? React.createElement(
          'div',
          { className: 'empty-state' },
          React.createElement('h3', null, 'No invoices found'),
          React.createElement('p', null, 'Generate invoices from the Detailed Transactions view.')
        )
      : React.createElement(
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
                React.createElement('th', null, 'Invoice #'),
                React.createElement('th', null, 'Account'),
                React.createElement('th', null, 'Period'),
                React.createElement('th', null, 'Amount'),
                React.createElement('th', null, 'Status'),
                React.createElement('th', null, 'Created'),
                React.createElement('th', null, 'Webhook'),
                React.createElement('th', null, 'Actions')
              )
            ),
            React.createElement(
              'tbody',
              null,
              filtered.flatMap(inv => {
                const auditOpen = expandedAudit === inv.id;
                const mainRow = React.createElement(
                  'tr',
                  {
                    key: inv.id,
                    tabIndex: 0,
                    role: 'button',
                    'aria-expanded': auditOpen,
                    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedAudit(auditOpen ? null : inv.id); } }
                  },
                  React.createElement(
                    'td',
                    null,
                    React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => setExpandedAudit(auditOpen ? null : inv.id),
                        style: { marginRight: '4px', fontSize: '0.8em', color: '#4b5563' },
                        title: 'View audit log'
                      },
                      auditOpen ? '\u25b2' : '\u25bc'
                    ),
                    inv.id
                  ),
                  React.createElement('td', null, inv.account || ''),
                  React.createElement('td', null, inv.period || ''),
                  React.createElement('td', null, inv.amount != null ? `$${Number(inv.amount).toFixed(2)}` : ''),
                  React.createElement('td', null, React.createElement(StatusBadge, { status: inv.status })),
                  React.createElement('td', null, inv.created ? new Date(inv.created).toLocaleDateString() : ''),
                  React.createElement(
                    'td',
                    null,
                    inv.lastWebhookStatus
                      ? (inv.lastWebhookStatus === 'success'
                        ? React.createElement('span', { style: { color: '#16a34a', fontSize: '0.85em' }, title: `Last webhook: ${inv.lastWebhookAt || ''}` }, '\u2713 OK')
                        : React.createElement('span', { style: { color: '#dc2626', fontSize: '0.85em' }, title: inv.lastWebhookStatus + (inv.lastWebhookAt ? ` at ${inv.lastWebhookAt}` : '') }, '\u26a0 Failed'))
                      : React.createElement('span', { style: { color: '#9ca3af', fontSize: '0.85em' } }, '\u2014')
                  ),
                  React.createElement(
                    'td',
                    { style: { whiteSpace: 'nowrap' } },
                    // Mark Sent
                    inv.status === 'draft' && React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => handleMarkSent(inv),
                        style: { marginRight: '6px' }
                      },
                      'Mark Sent'
                    ),
                    // Mark Paid
                    (inv.status === 'sent' || inv.status === 'viewed') && React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => handleMarkPaid(inv),
                        style: { marginRight: '6px' }
                      },
                      'Mark Paid'
                    ),
                    // Issue Refund
                    inv.status === 'paid' && React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => setRefundTarget(inv),
                        style: { marginRight: '6px', color: '#ea580c' }
                      },
                      'Issue Refund'
                    ),
                    // Cancel
                    !['cancelled', 'refunded', 'paid'].includes(inv.status) && React.createElement(
                      'button',
                      {
                        className: 'link-btn',
                        onClick: () => handleCancel(inv),
                        style: { color: '#dc2626' }
                      },
                      'Cancel'
                    ),
                    // Refund total indicator
                    inv.refunds && inv.refunds.length > 0 && React.createElement(
                      'span',
                      { style: { marginLeft: '6px', fontSize: '0.8em', color: '#ea580c' } },
                      `Refunded: $${inv.refunds.reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)}`
                    ),
                    // Export buttons
                    React.createElement(
                      'span',
                      { style: { marginLeft: '6px' } },
                      React.createElement(
                        'button',
                        {
                          className: 'link-btn',
                          onClick: () => exportInvoiceFormat(inv, 'journal_csv'),
                          style: { marginRight: '4px', fontSize: '0.8em' },
                          title: 'Export Journal Entry CSV'
                        },
                        'JE-CSV'
                      ),
                      React.createElement(
                        'button',
                        {
                          className: 'link-btn',
                          onClick: () => exportInvoiceFormat(inv, 'oracle_xml'),
                          style: { marginRight: '4px', fontSize: '0.8em' },
                          title: 'Export Oracle GL XML'
                        },
                        'Oracle-XML'
                      ),
                      React.createElement(
                        'button',
                        {
                          className: 'link-btn',
                          onClick: () => exportInvoiceFormat(inv, 'json'),
                          style: { fontSize: '0.8em' },
                          title: 'Export JSON'
                        },
                        'JSON'
                      )
                    )
                  )
                );
                const auditLog = inv.audit_log || [];
                const auditRow = auditOpen
                  ? React.createElement(
                      'tr',
                      { key: inv.id + '-audit' },
                      React.createElement(
                        'td',
                        {
                          colSpan: 8,
                          style: { background: '#f9fafb', padding: '0.75em 1em' }
                        },
                        React.createElement('strong', { style: { fontSize: '0.85em' } }, 'Audit Log'),
                        auditLog.length === 0
                          ? React.createElement('p', { style: { margin: '0.25em 0 0', fontSize: '0.85em', color: '#4b5563' } }, 'No audit entries.')
                          : React.createElement(
                              'div',
                              { style: { marginTop: '0.4em', display: 'flex', flexDirection: 'column', gap: '4px' } },
                              auditLog.map((entry, i) =>
                                React.createElement(
                                  'div',
                                  {
                                    key: i,
                                    style: {
                                      display: 'flex',
                                      gap: '0.75em',
                                      alignItems: 'baseline',
                                      fontSize: '0.82em',
                                      borderLeft: '3px solid #3b82f6',
                                      paddingLeft: '0.5em'
                                    }
                                  },
                                  React.createElement('span', { style: { color: '#4b5563', whiteSpace: 'nowrap' } },
                                    entry.at ? new Date(entry.at).toLocaleString() : ''),
                                  React.createElement('span', { style: { fontWeight: 'bold' } }, entry.action || ''),
                                  entry.from && entry.to
                                    ? React.createElement('span', null, `${entry.from} \u2192 ${entry.to}`)
                                    : null,
                                  entry.amount != null
                                    ? React.createElement('span', null, `$${Number(entry.amount).toFixed(2)}`)
                                    : null,
                                  React.createElement('span', { style: { color: '#4b5563' } }, `by ${entry.by || 'unknown'}`)
                                )
                              )
                            )
                      )
                    )
                  : null;
                return [mainRow, auditRow].filter(Boolean);
              })
            )
          )
        ),

    exportError && React.createElement('p', { className: 'error', style: { marginTop: '0.5em' } }, exportError),

    // Refund modal
    refundTarget && React.createElement(RefundModal, {
      invoice: refundTarget,
      currentUser,
      onClose: () => setRefundTarget(null),
      onIssue: (opts) => handleIssueRefund(refundTarget, opts)
    })
  );
}

// ---------------------------------------------------------------------------
// Invoice ledger integration: save invoice to ledger when generated
// ---------------------------------------------------------------------------
async function saveInvoiceToLedger(invoiceData, amount) {
  try {
    const entry = {
      id: invoiceData.invoice_number,
      account: (invoiceData.items || []).length > 0
        ? (invoiceData.account || '')
        : '',
      period: invoiceData.period || '',
      amount: amount,
      status: 'draft',
      created: new Date().toISOString(),
      sent: null,
      paid: null,
      notes: invoiceData.notes || '',
      items: invoiceData.items || [],
      institution: invoiceData.institution || {},
      logo: invoiceData.logo || '',
      bank_info: invoiceData.bank_info || [],
      refunds: [],
      pdf_path: invoiceData.pdf_path || null
    };
    if (HAS_COCKPIT) {
      await window.cockpit.spawn(
        ['python3', `${PLUGIN_BASE}/ledger_util.py`, '--action', 'add'],
        { input: JSON.stringify(entry), err: 'message' }
      );
    } else {
      const ledger = await loadInvoiceLedger();
      ledger.invoices = [...(ledger.invoices || []), entry];
      await saveInvoiceLedger(ledger);
    }
  } catch (e) {
    console.warn('Failed to save invoice to ledger:', e);
  }
}

function useInstitutionProfile() {
  const [profile, setProfile] = useState({});
  useEffect(() => {
    async function load() {
      try {
        let text;
        if (window.cockpit && window.cockpit.file) {
          text = await window.cockpit.file(`${PLUGIN_BASE}/institution.json`).read();
        } else {
          const resp = await fetch('institution.json');
          if (!resp.ok) return;
          text = await resp.text();
        }
        setProfile(JSON.parse(text));
      } catch (e) {
        console.error('Failed to load institution profile:', e);
      }
    }
    load();
  }, []);
  return profile;
}

// ---------------------------------------------------------------------------
// Role detection
// ---------------------------------------------------------------------------
async function detectUserRole(username, roleConfig) {
  if (!username) return 'member';
  const admins = (roleConfig && roleConfig.admins) || [];
  const finance = (roleConfig && roleConfig.finance) || [];
  if (admins.includes(username)) return 'admin';
  if (finance.includes(username)) return 'finance';
  // Check if user is a SLURM account coordinator (PI)
  if (HAS_COCKPIT) {
    try {
      const out = await window.cockpit.spawn(
        ['sacctmgr', 'show', 'user', username, 'withassoc', '--parsable2', '--noheader'],
        { err: 'ignore' }
      );
      // If sacctmgr returns rows with coordinator='Yes' they are a PI
      if (out && out.includes('Yes')) return 'pi';
    } catch (_) {
      // sacctmgr not available or user not found — fall through
    }
  }
  return 'member';
}

function useCurrentUser() {
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('member'); // default member until resolved
  const [loading, setLoading] = useState(true);
  const [roleConfig, setRoleConfig] = useState({ admins: [], finance: [], pis: [] });

  useEffect(() => {
    async function resolve() {
      let name = '';
      try {
        if (HAS_COCKPIT && window.cockpit.user) {
          const info = await window.cockpit.user();
          name = info.name || info.user || '';
        }
      } catch (_) {}
      setUsername(name);

      // Load role config from institution.json roles block
      let cfg = { admins: [], finance: [], pis: [] };
      try {
        let text;
        if (window.cockpit && window.cockpit.file) {
          text = await window.cockpit.file(`${PLUGIN_BASE}/institution.json`).read();
        } else {
          const resp = await fetch('institution.json');
          if (resp.ok) text = await resp.text();
        }
        if (text) {
          const json = JSON.parse(text);
          cfg = json.roles || cfg;
        }
      } catch (_) {}
      setRoleConfig(cfg);

      const role = await detectUserRole(name, cfg);
      setUserRole(role);
      setLoading(false);
    }
    resolve();
  }, []);

  return { username, userRole, roleConfig, loading };
}

// Role-gated nav tabs definition
// ---------------------------------------------------------------------------
// Audit Log Viewer — aggregates audit_log entries across all invoices
// ---------------------------------------------------------------------------
function AuditLogViewer({ invoiceLedger }) {
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  // Flatten audit_log entries from all invoices
  const allEntries = useMemo(() => {
    const invoices = (invoiceLedger && invoiceLedger.invoices) || [];
    const rows = [];
    invoices.forEach(inv => {
      (inv.audit_log || []).forEach(entry => {
        rows.push({
          timestamp: entry.at || '',
          invoice_number: inv.id || '',
          action: entry.action || '',
          details: [
            entry.from && entry.to ? `${entry.from} \u2192 ${entry.to}` : null,
            entry.amount != null ? `Amount: $${Number(entry.amount).toFixed(2)}` : null,
          ].filter(Boolean).join('; ') || '',
          user: entry.by || 'unknown'
        });
      });
    });
    return rows;
  }, [invoiceLedger]);

  // Collect distinct action types for the filter dropdown
  const actionTypes = useMemo(() => {
    const set = new Set(allEntries.map(e => e.action).filter(Boolean));
    return Array.from(set).sort();
  }, [allEntries]);

  const filtered = useMemo(() => {
    let rows = allEntries;
    if (filterStart) {
      rows = rows.filter(r => r.timestamp >= filterStart);
    }
    if (filterEnd) {
      // Include the full end day by appending T23:59:59
      rows = rows.filter(r => r.timestamp <= filterEnd + 'T23:59:59');
    }
    if (filterAction) {
      rows = rows.filter(r => r.action === filterAction);
    }
    rows = rows.slice().sort((a, b) => {
      const cmp = a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [allEntries, filterStart, filterEnd, filterAction, sortAsc]);

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Audit Log'),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '1em', flexWrap: 'wrap', marginBottom: '1em', alignItems: 'flex-end' } },
      React.createElement(
        'label',
        { style: { fontSize: '0.9em' } },
        'From: ',
        React.createElement('input', {
          type: 'date',
          value: filterStart,
          onChange: e => setFilterStart(e.target.value),
          style: { marginLeft: '0.25em' }
        })
      ),
      React.createElement(
        'label',
        { style: { fontSize: '0.9em' } },
        'To: ',
        React.createElement('input', {
          type: 'date',
          value: filterEnd,
          onChange: e => setFilterEnd(e.target.value),
          style: { marginLeft: '0.25em' }
        })
      ),
      React.createElement(
        'label',
        { style: { fontSize: '0.9em' } },
        'Action: ',
        React.createElement(
          'select',
          {
            value: filterAction,
            onChange: e => setFilterAction(e.target.value),
            style: { marginLeft: '0.25em' }
          },
          React.createElement('option', { value: '' }, 'All'),
          actionTypes.map(a => React.createElement('option', { key: a, value: a }, a))
        )
      ),
      React.createElement(
        'button',
        {
          onClick: () => { setFilterStart(''); setFilterEnd(''); setFilterAction(''); },
          style: { fontSize: '0.85em' }
        },
        'Clear Filters'
      )
    ),
    filtered.length === 0
      ? React.createElement('p', { style: { color: '#6b7280' } }, 'No audit entries match the current filters.')
      : React.createElement(
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
                React.createElement(
                  'th',
                  {
                    style: { cursor: 'pointer', userSelect: 'none' },
                    onClick: () => setSortAsc(v => !v),
                    title: 'Click to toggle sort direction'
                  },
                  `Timestamp ${sortAsc ? '\u25b2' : '\u25bc'}`
                ),
                React.createElement('th', null, 'Invoice #'),
                React.createElement('th', null, 'Action'),
                React.createElement('th', null, 'Details'),
                React.createElement('th', null, 'User')
              )
            ),
            React.createElement(
              'tbody',
              null,
              filtered.map((row, i) =>
                React.createElement(
                  'tr',
                  { key: i },
                  React.createElement(
                    'td',
                    { style: { whiteSpace: 'nowrap', fontSize: '0.85em' } },
                    row.timestamp ? new Date(row.timestamp).toLocaleString() : ''
                  ),
                  React.createElement('td', { style: { fontSize: '0.85em' } }, row.invoice_number),
                  React.createElement(
                    'td',
                    { style: { fontSize: '0.85em', fontWeight: 'bold' } },
                    row.action
                  ),
                  React.createElement('td', { style: { fontSize: '0.85em' } }, row.details),
                  React.createElement('td', { style: { fontSize: '0.85em' } }, row.user)
                )
              )
            )
          )
        )
  );
}

function getNavTabs(userRole) {
  const tabs = [
    { id: 'year', label: 'Fiscal Year Overview', roles: ['admin', 'pi', 'member', 'finance'] },
    { id: 'summary', label: 'Monthly Summary Reports', roles: ['admin', 'pi', 'member', 'finance'] },
    { id: 'details', label: 'Detailed Transactions', roles: ['admin', 'pi', 'member', 'finance'] },
    { id: 'invoices', label: 'Invoices', roles: ['admin', 'pi', 'finance'] },
    { id: 'audit', label: 'Audit Log', roles: ['admin', 'finance'] },
    { id: 'settings', label: 'Administration', roles: ['admin'] }
  ];
  return tabs.filter(t => t.roles.includes(userRole));
}

// ---------------------------------------------------------------------------
// Budget Alerts Panel (Task A3)
// ---------------------------------------------------------------------------

function BudgetAlertsPanel({ details }) {
  // Collect accounts with allocation info that have an active alert level
  const alerts = (details || [])
    .filter(d => d.allocation && d.allocation.alert_level)
    .map(d => ({
      account: d.account,
      ...d.allocation
    }));

  if (alerts.length === 0) return null;

  const iconFor = level => {
    if (level === 'exceeded') return '\ud83d\udd34';
    if (level === 'critical') return '\ud83d\udd34';
    return '\u26a0\ufe0f';
  };
  const colorFor = level => {
    if (level === 'exceeded') return '#7c2d12';
    if (level === 'critical') return '#dc2626';
    return '#d97706';
  };

  return React.createElement(
    'div',
    {
      style: {
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '1em',
        marginBottom: '1.5em',
        background: '#fffbeb'
      }
    },
    React.createElement('h3', { style: { marginTop: 0 } }, 'Budget Alerts'),
    alerts.map(a => React.createElement(
      'div',
      {
        key: a.account,
        style: {
          padding: '0.4em 0',
          color: colorFor(a.alert_level),
          fontSize: '0.95em'
        }
      },
      `${iconFor(a.alert_level)} ${a.account}: `,
      React.createElement('strong', null, `${a.percent_used}%`),
      ` of ${a.alloc_type === 'prepaid' ? (a.alloc_period || 'period') : 'budget'} allocation used`,
      a.budget_su != null
        ? ` (${Number(a.used_su).toLocaleString()} / ${Number(a.budget_su).toLocaleString()} SU)`
        : '',
      a.alert_level === 'exceeded'
        ? React.createElement('strong', null, ' — EXCEEDED')
        : null
    ))
  );
}

// ---------------------------------------------------------------------------
// Role-specific dashboard variants (C3)
// ---------------------------------------------------------------------------
// Helper: format a period-over-period delta as a coloured badge string.
// For cost: red = increase (bad), green = decrease (good).
// For utilization (core/gpu hours): green = increase (good), red = decrease (bad).
function _deltaBadge(current, previous, invertColour = false) {
  if (previous == null || previous === 0 || current == null) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? '+' : '';
  const label = `${sign}${pct.toFixed(1)}% vs last period`;
  // invertColour=true means "increase is good" (utilization); false means "increase is bad" (cost)
  const color = invertColour
    ? (pct >= 0 ? '#16a34a' : '#dc2626')
    : (pct >= 0 ? '#dc2626' : '#16a34a');
  return React.createElement(
    'span',
    {
      style: {
        fontSize: '0.75em',
        color,
        display: 'block',
        marginTop: '2px'
      }
    },
    label
  );
}

function BalanceCheckerPanel() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  function runCheck() {
    setChecking(true);
    setResults(null);
    setError(null);
    if (!HAS_COCKPIT) {
      setError('Cockpit not available — cannot run balance check.');
      setChecking(false);
      return;
    }
    const proc = cockpit.spawn(
      ['python3', PLUGIN_BASE + '/balance_enforcer.py', '--check', '--json'],
      { err: 'message' }
    );
    proc.then(output => {
      try {
        setResults(JSON.parse(output));
      } catch (e) {
        setError('Failed to parse balance_enforcer output: ' + e.message);
      }
      setChecking(false);
    }).catch(err => {
      setError('balance_enforcer.py failed: ' + (err.message || String(err)));
      setChecking(false);
    });
  }

  const statusColor = { ok: '#3a3', warning: '#e80', critical: '#c60', exceeded: '#c00' };

  return React.createElement(
    'div',
    { style: { marginBottom: '1.5em' } },
    React.createElement('h3', null, 'Allocation Balance Check'),

    // Enforcement mode notice
    React.createElement(
      'p',
      { style: { margin: '0 0 0.75em 0', fontSize: '0.9em', color: '#555' } },
      'Real-time enforcement via ',
      React.createElement('code', null, 'job_submit.lua'),
      ' — jobs are rejected at submission when the account budget is exceeded. ',
      React.createElement(
        'a',
        { href: 'https://github.com/NessieCanCode/SlurmLedger/blob/main/PRODUCTION_SETUP.md#step-10-set-up-balance-enforcement',
          target: '_blank', rel: 'noopener noreferrer' },
        'Setup instructions'
      ),
      '.'
    ),

    React.createElement(
      'button',
      { className: 'pf-c-button pf-m-secondary', onClick: runCheck, disabled: checking },
      checking ? 'Checking...' : 'Check Balances'
    ),
    error && React.createElement('p', { style: { color: '#c00', marginTop: '0.5em' } }, error),
    results && results.length === 0 &&
      React.createElement('p', { style: { marginTop: '0.5em', color: '#666' } }, 'No prepaid allocations configured.'),
    results && results.length > 0 && React.createElement(
      'div',
      { className: 'table-container', style: { marginTop: '0.75em' } },
      React.createElement(
        'table',
        { className: 'summary-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Account'),
            React.createElement('th', null, 'Budget SU'),
            React.createElement('th', null, 'Used SU'),
            React.createElement('th', null, 'Remaining SU'),
            React.createElement('th', null, '% Used'),
            React.createElement('th', null, 'Status')
          )
        ),
        React.createElement(
          'tbody',
          null,
          results.map(r =>
            React.createElement(
              'tr',
              { key: r.account },
              React.createElement('td', null, r.account),
              React.createElement('td', null, r.budget_su),
              React.createElement('td', null, r.used_su),
              React.createElement('td', null, r.remaining_su),
              React.createElement('td', null, r.percent_used + '%'),
              React.createElement(
                'td',
                { style: { color: statusColor[r.status] || '#333', fontWeight: 'bold' } },
                r.status
              )
            )
          )
        )
      )
    )
  );
}

function AdminDashboard({ summary, details, daily, yearly, monthly, invoiceLedger = { invoices: [] }, prevSummary }) {
  const historical = yearly.length ? yearly : monthly;
  const historicalLabel = yearly.length
    ? 'Historical CPU/GPU-hrs (yearly)'
    : 'Historical CPU/GPU-hrs (monthly)';

  // Invoice status summary
  const invCounts = { draft: 0, sent: 0, paid: 0 };
  (invoiceLedger.invoices || []).forEach(inv => {
    if (inv.status in invCounts) invCounts[inv.status]++;
  });

  const topAccounts = details.slice().sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, 5);

  const totalCost = summary ? Number(summary.total) : 0;
  const prevTotalCost = prevSummary ? Number(prevSummary.total) : null;
  const totalCoreHours = summary ? Number(summary.core_hours) : 0;
  const prevCoreHours = prevSummary ? Number(prevSummary.core_hours) : null;
  const totalGpuHours = summary ? Number(summary.gpu_hours || 0) : 0;
  const prevGpuHours = prevSummary ? Number(prevSummary.gpu_hours || 0) : null;

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Admin Dashboard'),
    React.createElement(BudgetAlertsPanel, { details }),

    // KPI row
    React.createElement(
      'div',
      { className: 'kpi-grid' },
      React.createElement(KpiTile, {
        label: 'Total Cluster Cost This Period',
        value: React.createElement(
          'span',
          null,
          `$${totalCost}`,
          _deltaBadge(totalCost, prevTotalCost, false)
        )
      }),
      React.createElement(KpiTile, {
        label: 'Invoices: Draft / Sent / Paid',
        value: `${invCounts.draft} / ${invCounts.sent} / ${invCounts.paid}`
      }),
      React.createElement(KpiTile, {
        label: 'Total CPU-hours',
        value: React.createElement(
          'span',
          null,
          totalCoreHours,
          _deltaBadge(totalCoreHours, prevCoreHours, true)
        ),
        renderChart: () => React.createElement(KpiSparkline, { data: daily.map(d => d.core_hours) })
      }),
      totalGpuHours > 0 && React.createElement(KpiTile, {
        label: 'Total GPU-hours',
        value: React.createElement(
          'span',
          null,
          totalGpuHours,
          _deltaBadge(totalGpuHours, prevGpuHours, true)
        ),
        renderChart: () => React.createElement(KpiSparkline, { data: daily.map(d => d.gpu_hours || 0) })
      })
    ),

    // Top 5 accounts by cost
    React.createElement('h3', null, 'Top 5 Accounts by Cost'),
    React.createElement(
      'div',
      { className: 'table-container' },
      React.createElement(
        'table',
        { className: 'summary-table' },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Account'),
            React.createElement('th', null, 'Cost ($)'),
            React.createElement('th', null, 'Core Hours')
          )
        ),
        React.createElement(
          'tbody',
          null,
          topAccounts.map(a =>
            React.createElement(
              'tr',
              { key: a.account },
              React.createElement('td', null, a.account),
              React.createElement('td', null, a.cost),
              React.createElement('td', null, a.core_hours)
            )
          )
        )
      )
    ),

    React.createElement(BalanceCheckerPanel, null),

    React.createElement(
      'div',
      { className: 'summary-charts' },
      React.createElement(
        'div',
        { className: 'summary-chart' },
        React.createElement('h3', null, 'CPU/GPU-hrs per Slurm account'),
        React.createElement(AccountsChart, { details })
      ),
      React.createElement(
        'div',
        { className: 'summary-chart' },
        React.createElement('h3', null, historicalLabel),
        React.createElement(HistoricalUsageChart, { data: historical })
      )
    )
  );
}

function PiDashboard({ summary, details, daily, username }) {
  // Filter to PI's accounts (accounts where username matches a user in the account)
  const myAccounts = details.filter(d =>
    (d.users || []).some(u => u.user === username)
  );
  const totalCost = myAccounts.reduce((s, a) => s + (a.cost || 0), 0);
  const totalCoreHours = myAccounts.reduce((s, a) => s + (a.core_hours || 0), 0);

  // User breakdown within PI's accounts
  const userMap = {};
  myAccounts.forEach(acct => {
    (acct.users || []).forEach(u => {
      userMap[u.user] = (userMap[u.user] || 0) + (u.cost || 0);
    });
  });
  const userBreakdown = Object.entries(userMap)
    .map(([user, cost]) => ({ user, cost }))
    .sort((a, b) => b.cost - a.cost);

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'My Account Dashboard'),
    React.createElement(
      'div',
      { className: 'kpi-grid' },
      React.createElement(KpiTile, {
        label: 'Total Cost This Period',
        value: `$${totalCost.toFixed(2)}`
      }),
      React.createElement(KpiTile, {
        label: 'Total Core Hours',
        value: totalCoreHours.toFixed(2),
        renderChart: () => React.createElement(KpiSparkline, { data: daily.map(d => d.core_hours) })
      })
    ),
    // Per-account allocation status for PI
    myAccounts.some(a => a.allocation && a.allocation.budget_su != null) &&
      React.createElement(
        'div',
        { style: { marginBottom: '1.5em' } },
        React.createElement('h3', null, 'Allocation Status'),
        React.createElement(
          'div',
          { className: 'table-container' },
          React.createElement(
            'table',
            { className: 'summary-table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Account'),
                React.createElement('th', null, 'Used SU'),
                React.createElement('th', null, 'Budget SU'),
                React.createElement('th', null, 'Remaining'),
                React.createElement('th', null, 'Usage'),
                React.createElement('th', null, 'Status')
              )
            ),
            React.createElement('tbody', null,
              myAccounts
                .filter(a => a.allocation && a.allocation.budget_su != null)
                .map(a => {
                  const alloc = a.allocation;
                  return React.createElement('tr', { key: a.account },
                    React.createElement('td', null, a.account),
                    React.createElement('td', null, Number(alloc.used_su).toLocaleString()),
                    React.createElement('td', null, Number(alloc.budget_su).toLocaleString()),
                    React.createElement('td', null,
                      alloc.remaining_su != null
                        ? Number(alloc.remaining_su).toLocaleString()
                        : '\u2014'
                    ),
                    React.createElement('td', null,
                      alloc.percent_used != null
                        ? React.createElement('span', null,
                            React.createElement(AllocationProgressBar, { percent: alloc.percent_used }),
                            React.createElement('span', { style: { marginLeft: '6px' } }, `${alloc.percent_used}%`)
                          )
                        : '\u2014'
                    ),
                    React.createElement('td', null,
                      React.createElement(AllocationBadge, { alertLevel: alloc.alert_level })
                    )
                  );
                })
            )
          )
        )
      ),
    React.createElement('h3', null, 'User Breakdown'),
    React.createElement(
      'div',
      { className: 'table-container' },
      React.createElement(
        'table',
        { className: 'summary-table' },
        React.createElement(
          'thead',
          null,
          React.createElement('tr', null,
            React.createElement('th', null, 'User'),
            React.createElement('th', null, 'Cost ($)')
          )
        ),
        React.createElement(
          'tbody',
          null,
          userBreakdown.map(u =>
            React.createElement('tr', { key: u.user },
              React.createElement('td', null, u.user),
              React.createElement('td', null, u.cost.toFixed(2))
            )
          )
        )
      )
    )
  );
}

function MemberDashboard({ summary, details, daily, username }) {
  // Filter to only this user's jobs
  const myJobs = [];
  details.forEach(acct => {
    (acct.users || []).filter(u => u.user === username).forEach(u => {
      (u.jobs || []).forEach(j => myJobs.push({ ...j, account: acct.account }));
    });
  });

  const myCost = myJobs.reduce((s, j) => s + (j.cost || 0), 0);
  const myCoreHours = myJobs.reduce((s, j) => s + (j.core_hours || 0), 0);

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'My Usage'),
    React.createElement(
      'div',
      { className: 'kpi-grid' },
      React.createElement(KpiTile, {
        label: 'My Cost This Period',
        value: `$${myCost.toFixed(2)}`
      }),
      React.createElement(KpiTile, {
        label: 'My Core Hours',
        value: myCoreHours.toFixed(2)
      })
    ),
    myJobs.length > 0 &&
      React.createElement(
        'div',
        null,
        React.createElement('h3', null, 'My Recent Jobs'),
        React.createElement(PaginatedJobTable, { jobs: myJobs.slice(0, 50) })
      )
  );
}

function RoleAwareSummary({ summary, details, daily, yearly, monthly, userRole, username, invoiceLedger, prevSummary }) {
  if (!summary) {
    return React.createElement(
      'div',
      { className: 'empty-state' },
      React.createElement('h3', null, 'No billing data available'),
      React.createElement('p', null, 'No jobs were found for the selected period.')
    );
  }

  if (userRole === 'admin' || userRole === 'finance') {
    return React.createElement(AdminDashboard, {
      summary, details, daily, yearly: yearly || [], monthly: monthly || [], invoiceLedger, prevSummary
    });
  }
  if (userRole === 'pi') {
    return React.createElement(PiDashboard, { summary, details, daily, username });
  }
  return React.createElement(MemberDashboard, { summary, details, daily, username });
}

// ---------------------------------------------------------------------------
// First-run Setup Wizard
// ---------------------------------------------------------------------------
function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1); // 1, 2, 3
  const [dbStatus, setDbStatus] = useState(null); // null | 'testing' | 'ok' | 'error'
  const [dbError, setDbError] = useState(null);
  const baseDir = PLUGIN_BASE;

  async function markSetupComplete() {
    try {
      let existing = {};
      try {
        let text;
        if (window.cockpit && window.cockpit.file) {
          text = await window.cockpit.file(`${baseDir}/institution.json`).read();
        } else {
          const resp = await fetch('institution.json');
          if (resp.ok) text = await resp.text();
        }
        if (text) existing = JSON.parse(text);
      } catch (_) { /* use empty object */ }
      const updated = JSON.stringify({ ...existing, setupComplete: true }, null, 2);
      if (window.cockpit && window.cockpit.file) {
        await window.cockpit.file(`${baseDir}/institution.json`).replace(updated);
      } else {
        await fetch('institution.json', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: updated
        });
      }
    } catch (e) {
      console.warn('Could not mark setup complete:', e);
    }
    if (onComplete) onComplete();
  }

  async function testDbConnection() {
    setDbStatus('testing');
    setDbError(null);
    try {
      if (HAS_COCKPIT) {
        const today = new Date();
        const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        const end = today.toISOString().slice(0, 10);
        await window.cockpit.spawn(
          ['python3', `${baseDir}/slurmdb.py`, '--start', start, '--end', end, '--output', '-'],
          { err: 'message' }
        );
        setDbStatus('ok');
      } else {
        // No Cockpit — skip the live test
        setDbStatus('ok');
      }
    } catch (e) {
      setDbStatus('error');
      setDbError(e.message || String(e));
    }
  }

  const stepTitles = [
    '1. Configure Institution',
    '2. Set Billing Rates',
    '3. Test Database Connection'
  ];

  const progressBar = React.createElement(
    'div',
    { style: { display: 'flex', gap: '0.5em', marginBottom: '1.5em' } },
    stepTitles.map((title, i) => {
      const num = i + 1;
      const isActive = step === num;
      const isDone = step > num;
      return React.createElement(
        'div',
        {
          key: num,
          style: {
            flex: 1,
            padding: '0.5em 0.75em',
            borderRadius: '6px',
            fontSize: '0.85em',
            background: isDone ? '#d1fae5' : isActive ? '#eff6ff' : '#f3f4f6',
            border: isActive ? '2px solid #3b82f6' : '2px solid transparent',
            color: isDone ? '#065f46' : isActive ? '#1d4ed8' : '#6b7280',
            fontWeight: isActive ? 'bold' : 'normal'
          }
        },
        isDone ? '\u2713 ' + title : title
      );
    })
  );

  return React.createElement(
    'div',
    {
      style: {
        maxWidth: '700px',
        margin: '2em auto',
        padding: '2em',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        background: '#fff'
      }
    },
    React.createElement(
      'div',
      { style: { marginBottom: '1.5em' } },
      React.createElement('h2', { style: { margin: 0 } }, 'Welcome to SlurmLedger'),
      React.createElement(
        'p',
        { style: { color: '#6b7280', marginTop: '0.5em' } },
        'Complete these steps to get started with billing configuration.'
      )
    ),
    progressBar,

    // Step 1: Institution Profile
    step === 1 && React.createElement(
      'div',
      null,
      React.createElement(InstitutionProfile, null),
      React.createElement(
        'div',
        { style: { marginTop: '1.5em', display: 'flex', justifyContent: 'flex-end' } },
        React.createElement(
          'button',
          { onClick: () => setStep(2) },
          'Next: Set Billing Rates \u2192'
        )
      )
    ),

    // Step 2: Rate Configuration (embedded Rates tab, rates sub-tab only)
    step === 2 && React.createElement(
      'div',
      null,
      React.createElement(Rates, { onRatesUpdated: () => {} }),
      React.createElement(
        'div',
        { style: { marginTop: '1.5em', display: 'flex', justifyContent: 'space-between' } },
        React.createElement('button', { onClick: () => setStep(1) }, '\u2190 Back'),
        React.createElement(
          'button',
          { onClick: () => { setStep(3); testDbConnection(); } },
          'Next: Test Connection \u2192'
        )
      )
    ),

    // Step 3: Database connection test
    step === 3 && React.createElement(
      'div',
      null,
      React.createElement('h3', null, 'Test Database Connection'),
      React.createElement(
        'p',
        { style: { color: '#6b7280' } },
        'SlurmLedger will attempt to load billing data for the current month to verify connectivity to the Slurm accounting database.'
      ),
      dbStatus === null && React.createElement('p', { style: { color: '#6b7280' } }, 'Preparing connection test...'),
      dbStatus === 'testing' && React.createElement('p', { style: { color: '#3b82f6' } }, 'Testing connection...'),
      dbStatus === 'ok' && React.createElement(
        'div',
        {
          style: {
            background: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '6px',
            padding: '1em',
            marginBottom: '1em'
          }
        },
        React.createElement(
          'strong',
          { style: { color: '#065f46' } },
          '\u2713 Connection successful'
        ),
        React.createElement('p', { style: { margin: '0.5em 0 0', color: '#065f46' } },
          'Billing data loaded successfully. You\'re ready to start billing.')
      ),
      dbStatus === 'error' && React.createElement(
        'div',
        {
          style: {
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            padding: '1em',
            marginBottom: '1em'
          }
        },
        React.createElement('strong', { style: { color: '#991b1b' } }, 'Connection failed'),
        React.createElement('p', { style: { margin: '0.5em 0 0', color: '#7f1d1d', fontFamily: 'monospace', fontSize: '0.85em' } },
          dbError),
        React.createElement(
          'p',
          { style: { margin: '0.5em 0 0', color: '#991b1b', fontSize: '0.9em' } },
          'Check that the Slurm accounting database is running and accessible, then try again. You can still continue setup and fix this later.'
        )
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', marginTop: '1em' } },
        React.createElement('button', { onClick: () => setStep(2) }, '\u2190 Back'),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '0.5em' } },
          dbStatus === 'error' && React.createElement(
            'button',
            { onClick: testDbConnection },
            'Retry'
          ),
          React.createElement(
            'button',
            {
              onClick: markSetupComplete,
              style: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.5em 1.25em', cursor: 'pointer', fontWeight: 'bold' }
            },
            dbStatus === 'ok' ? 'Finish Setup' : 'Continue Anyway'
          )
        )
      )
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
  const { data, error, loading, reload } = useBillingData(period);
  const institutionProfile = useInstitutionProfile();
  const { username, userRole, loading: roleLoading } = useCurrentUser();
  const [invoiceLedger, setInvoiceLedger] = useState({ invoices: [] });

  // Compute the previous period (prior month or prior year) for comparison KPIs
  const prevPeriod = useMemo(() => {
    if (view === 'year') {
      return getYearPeriod(currentYear - 1);
    }
    // month is 'YYYY-MM'; subtract one month
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1)); // m-2 because months are 0-indexed
    const py = prevDate.getUTCFullYear();
    const pm = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
    return getBillingPeriod(`${py}-${pm}`);
  }, [view, month, currentYear]);
  const { data: prevData } = useBillingData(prevPeriod);

  // Load invoice ledger for admin dashboard summary
  useEffect(() => {
    loadInvoiceLedger().then(setInvoiceLedger).catch(() => {});
  }, []);

  // Filter details by role
  const details = useMemo(() => {
    if (!data) return [];
    const raw = view === 'year'
      ? aggregateAccountDetails(data.details || [])
      : data.details || [];
    if (userRole === 'pi') {
      // PI sees only accounts where they are a user
      return raw.filter(d => (d.users || []).some(u => u.user === username));
    }
    if (userRole === 'member') {
      // Member sees only their own user entry per account
      return raw
        .map(d => ({
          ...d,
          users: (d.users || []).filter(u => u.user === username)
        }))
        .filter(d => d.users.length > 0);
    }
    return raw;
  }, [data, view, userRole, username]);

  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const monthOptions = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const navTabs = getNavTabs(userRole);

  // Redirect to first available tab if current view is not allowed
  const allowedViews = navTabs.map(t => t.id);
  const activeView = allowedViews.includes(view) ? view : allowedViews[0];

  const [setupDismissed, setSetupDismissed] = useState(false);

  // Show a loading spinner while role is being resolved to prevent admin UI
  // from flashing for non-admin users before the role check completes.
  if (roleLoading) {
    return React.createElement(
      'div',
      { className: 'app', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' } },
      React.createElement('p', { style: { color: '#4b5563' } }, 'Loading...')
    );
  }

  // First-run setup wizard: show when institution name is blank and setup not yet completed.
  // Only show to admin users — other roles see normal UI even on first run.
  const needsSetup =
    !setupDismissed &&
    userRole === 'admin' &&
    !institutionProfile.setupComplete &&
    !institutionProfile.institutionName;

  if (needsSetup) {
    return React.createElement(
      'div',
      { className: 'app' },
      React.createElement(SetupWizard, { onComplete: () => setSetupDismissed(true) })
    );
  }

  return React.createElement(
    'div',
    { className: 'app' },

    // Header with role indicator
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5em 0',
          marginBottom: '0.5em',
          borderBottom: '1px solid #e5e7eb'
        }
      },
      React.createElement('span', { style: { fontWeight: 'bold', fontSize: '1.1em' } }, 'SlurmLedger'),
      React.createElement(
        'span',
        {
          style: {
            fontSize: '0.85em',
            color: '#4b5563',
            backgroundColor: '#f3f4f6',
            padding: '3px 10px',
            borderRadius: '12px'
          }
        },
        username
          ? `Logged in as: ${username} (${userRole.charAt(0).toUpperCase() + userRole.slice(1)})`
          : `Role: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`
      )
    ),

    React.createElement(
      'nav',
      null,
      navTabs.map(tab =>
        React.createElement(
          'button',
          {
            key: tab.id,
            onClick: () => setView(tab.id),
            style: activeView === tab.id ? { fontWeight: 'bold' } : undefined
          },
          tab.label
        )
      )
    ),
    activeView === 'summary' &&
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
    activeView !== 'settings' && activeView !== 'invoices' && activeView !== 'audit' && loading &&
      React.createElement('p', null, 'Loading...'),
    activeView !== 'settings' && activeView !== 'invoices' && activeView !== 'audit' &&
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
      activeView === 'year' &&
      React.createElement(RoleAwareSummary, {
        summary: data.summary,
        details,
        daily: data.daily || [],
        yearly: data.yearly || [],
        monthly: [],
        userRole,
        username,
        invoiceLedger,
        prevSummary: prevData ? prevData.summary : null
      }),
    data &&
      activeView === 'summary' &&
      React.createElement(RoleAwareSummary, {
        summary: data.summary,
        details,
        daily: data.daily || [],
        yearly: [],
        monthly: data.monthly || [],
        userRole,
        username,
        invoiceLedger,
        prevSummary: prevData ? prevData.summary : null
      }),
    data &&
      activeView === 'details' &&
      React.createElement(Details, {
        details: userRole === 'member'
          ? (data.details || []).map(d => ({
              ...d,
              users: (d.users || []).filter(u => u.user === username)
            })).filter(d => d.users.length > 0)
          : userRole === 'pi'
          ? (data.details || []).filter(d =>
              (d.users || []).some(u => u.user === username)
            )
          : data.details,
        daily: data.daily,
        partitions: data.partitions,
        accounts: data.accounts,
        users: data.users,
        month,
        onMonthChange: setMonth,
        monthOptions,
        institutionProfile
      }),
    activeView === 'invoices' && React.createElement(Invoices, { currentUser: username, billingData: data, institutionProfile }),
    activeView === 'audit' && React.createElement(AuditLogViewer, { invoiceLedger }),
    activeView === 'settings' && React.createElement(Rates, { onRatesUpdated: reload, billingData: data })
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
