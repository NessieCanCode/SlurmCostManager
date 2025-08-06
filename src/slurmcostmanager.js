const { useState, useEffect, useRef, useCallback } = React;

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

function useBillingData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      let json;
      if (window.cockpit && window.cockpit.spawn) {
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth(), 1);
        const args = [
          'python3',
          `${PLUGIN_BASE}/slurmdb.py`,
          '--start',
          start.toISOString().slice(0, 10),
          '--end',
          end.toISOString().slice(0, 10),
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
      setData(json);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, reload: load };
}

function AccountsChart({ details }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: details.map(d => d.account),
        datasets: [
          {
            label: 'Core Hours',
            data: details.map(d => d.core_hours),
            backgroundColor: '#4e79a7'
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return () => chart.destroy();
  }, [details]);
  return React.createElement(
    'div',
    { className: 'chart-container' },
    React.createElement('canvas', { ref: canvasRef })
  );
}

function CoreHoursChart({ data, labelKey }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d[labelKey]),
        datasets: [
          {
            label: 'Core Hours',
            data: data.map(d => d.core_hours),
            backgroundColor: '#4e79a7'
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return () => chart.destroy();
  }, [data, labelKey]);
  return React.createElement(
    'div',
    { className: 'chart-container' },
    React.createElement('canvas', { ref: canvasRef })
  );
}

function Summary({ summary, details, daily, monthly, yearly }) {
  function downloadInvoice() {
    const pdflib = window.jspdf;
    if (!pdflib || !pdflib.jsPDF) return;
    const doc = new pdflib.jsPDF();
    doc.text(`Invoice for ${summary.period}`, 10, 10);
    let y = 20;
    doc.text('Account', 10, y);
    doc.text('Core Hours', 80, y);
    doc.text('Cost ($)', 150, y);
    y += 10;
    details.forEach(d => {
      doc.text(String(d.account), 10, y);
      doc.text(String(d.core_hours), 80, y);
      doc.text(String(d.cost), 150, y);
      y += 10;
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
    });
    const safePeriod = summary.period.replace(/[^0-9A-Za-z_-]/g, '');
    doc.save(`invoice-${safePeriod}.pdf`);
  }

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
          )
        )
      )
    ),
    React.createElement(
      'div',
      { style: { margin: '1em 0' } },
      React.createElement(
        'button',
        { onClick: downloadInvoice },
        'Download Invoice'
      )
    ),
    React.createElement('h3', null, 'Daily Core Hours'),
    React.createElement(CoreHoursChart, { data: daily, labelKey: 'date' }),
    React.createElement('h3', null, 'Monthly Core Hours'),
    React.createElement(CoreHoursChart, { data: monthly, labelKey: 'month' }),
    React.createElement('h3', null, 'Yearly Core Hours'),
    React.createElement(CoreHoursChart, { data: yearly, labelKey: 'year' }),
    React.createElement('h3', null, 'Core Hours by Account'),
    React.createElement(AccountsChart, { details })
  );
}

function JobDetails({ jobs }) {
  return React.createElement(
    'table',
    { className: 'jobs-table' },
    React.createElement(
      'thead',
      null,
      React.createElement(
        'tr',
        null,
        React.createElement('th', null, 'Job'),
        React.createElement('th', null, 'Core Hours'),
        React.createElement('th', null, 'Cost ($)')
      )
    ),
    React.createElement(
      'tbody',
      null,
      jobs.map((j, i) =>
        React.createElement(
          'tr',
          { key: i },
          React.createElement('td', null, j.job),
          React.createElement('td', null, j.core_hours),
          React.createElement('td', null, j.cost)
        )
      )
    )
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
                React.createElement(JobDetails, { jobs: u.jobs || [] })
              )
            )
          );
        }
        return acc;
      }, [])
    )
  );
}

function Details({ details }) {
  const [expanded, setExpanded] = useState(null);
  function toggle(account) {
    setExpanded(prev => (prev === account ? null : account));
  }
  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Cost Details'),
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
          details.reduce((acc, d) => {
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
    )
  );
}


function Rates({ onRatesUpdated }) {
  const [config, setConfig] = useState(null);
  const [overrides, setOverrides] = useState([]);
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
        setConfig({ defaultRate: json.defaultRate });
        const ovrs = json.overrides
          ? Object.entries(json.overrides).map(([account, cfg]) => ({
              account,
              rate: cfg.rate ?? '',
              discount: cfg.discount ?? ''
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
      const json = {
        defaultRate: parseFloat(config.defaultRate) || 0
      };
      if (overrides.length) {
        json.overrides = {};
        overrides.forEach(o => {
          if (!o.account) return;
          const entry = {};
          if (o.rate !== '') entry.rate = parseFloat(o.rate);
          if (o.discount !== '') entry.discount = parseFloat(o.discount);
          json.overrides[o.account] = entry;
        });
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
          React.createElement('th', null, 'Discount'),
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
            React.createElement('td', null,
              React.createElement('input', {
                value: o.account,
                onChange: e =>
                  updateOverride(idx, 'account', e.target.value)
              })
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
                step: '0.01',
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
  const [view, setView] = useState('summary');
  const { data, error, reload } = useBillingData();

  return React.createElement(
    'div',
    { className: 'app' },
    React.createElement(
      'nav',
      null,
      React.createElement(
        'button',
        { onClick: () => setView('summary') },
        'Summary'
      ),
      React.createElement(
        'button',
        { onClick: () => setView('details') },
        'Details'
      ),
      React.createElement(
        'button',
        { onClick: () => setView('rates') },
        'Rates'
      )
    ),
    view !== 'rates' && !data && !error && React.createElement('p', null, 'Loading...'),
    view !== 'rates' && error && React.createElement('p', { className: 'error' }, 'Failed to load data'),
    data &&
      view === 'summary' &&
      React.createElement(Summary, {
        summary: data.summary,
        details: data.details,
        daily: data.daily,
        monthly: data.monthly,
        yearly: data.yearly
      }),
    data && view === 'details' && React.createElement(Details, { details: data.details }),
    view === 'rates' && React.createElement(Rates, { onRatesUpdated: reload })
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);
