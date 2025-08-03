const { useState, useEffect, useRef } = React;

function useBillingData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let json;
        if (window.cockpit && window.cockpit.spawn) {
          const end = new Date();
          const start = new Date(end.getFullYear(), end.getMonth(), 1);
          const args = [
            'python3',
            '/usr/share/cockpit/slurmcostmanager/slurmdb.py',
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
        if (!cancelled) setData(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
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

function Summary({ summary, details }) {
  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Monthly Billing Summary'),
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
            React.createElement('th', null, 'Month'),
            React.createElement('td', null, summary.month)
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
            React.createElement('th', null, 'Core Hours'),
            React.createElement('td', null, summary.core_hours)
          ),
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'Instance Hours'),
            React.createElement('td', null, summary.instance_hours)
          ),
          React.createElement(
            'tr',
            null,
            React.createElement('th', null, 'GB-Month'),
            React.createElement('td', null, summary.gb_month)
          )
        )
      )
    ),
    React.createElement('h3', null, 'Core Hours by Account'),
    React.createElement(AccountsChart, { details })
  );
}

function UserDetails({ users }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: users.map(u => u.user),
        datasets: [
          {
            label: 'Core Hours',
            data: users.map(u => u.core_hours),
            backgroundColor: '#59a14f'
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return () => chart.destroy();
  }, [users]);

  return React.createElement(
    'div',
    null,
    React.createElement(
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
        users.map((u, i) =>
          React.createElement(
            'tr',
            { key: i },
            React.createElement('td', null, u.user),
            React.createElement('td', null, u.core_hours),
            React.createElement('td', null, u.cost)
          )
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'chart-container' },
      React.createElement('canvas', { ref: canvasRef })
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
            React.createElement('th', null, 'Instance Hours'),
            React.createElement('th', null, 'GB-Month'),
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
                React.createElement('td', null, d.instance_hours),
                React.createElement('td', null, d.gb_month),
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
                    { colSpan: 5 },
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

function Invoices({ invoices }) {
  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState({});
  const [list, setList] = useState(invoices);
  const [loading, setLoading] = useState(false);
  const [invError, setInvError] = useState(null);

  const baseDir = '/usr/share/cockpit/slurmcostmanager/invoices';

  async function loadInvoice(file) {
    if (file.includes('..') || file.includes('/')) {
      throw new Error('Invalid invoice filename');
    }
    let blob;
    if (window.cockpit && window.cockpit.file) {
      const raw = await window.cockpit
        .file(`${baseDir}/${file}`, { binary: true })
        .read();
      blob = new Blob([raw], { type: 'application/pdf' });
    } else {
      const resp = await fetch(`invoices/${file}`);
      blob = await resp.blob();
    }
    return URL.createObjectURL(blob);
  }

  async function ensureUrl(file) {
    if (urls[file]) return urls[file];
    const url = await loadInvoice(file);
    setUrls(prev => ({ ...prev, [file]: url }));
    return url;
  }

  function handleView(inv) {
    setLoading(true);
    setInvError(null);
    ensureUrl(inv.filename)
      .then(url => setSelected(url))
      .catch(e => {
        console.error(e);
        setInvError('Failed to load invoice');
      })
      .finally(() => setLoading(false));
  }

  function handleDownload(inv) {
    ensureUrl(inv.filename).then(url => {
      const a = document.createElement('a');
      a.href = url;
      a.download = inv.filename;
      a.click();
    });
  }

  function handleArchive(id) {
    setList(prev => prev.map(inv => (inv.id === id ? { ...inv, archived: true } : inv)));
  }

  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Invoices'),
    React.createElement(
      'ul',
      { className: 'invoice-list' },
      list
        .filter(inv => !inv.archived)
        .map(inv =>
          React.createElement(
            'li',
            { key: inv.id },
            `${inv.date} (${(inv.size / 1024).toFixed(1)} KB)`,
            ' ',
            React.createElement(
              'button',
              { className: 'link-btn', onClick: () => handleView(inv) },
              'View'
            ),
            ' | ',
            React.createElement(
              'button',
              { className: 'link-btn', onClick: () => handleDownload(inv) },
              'Download'
            ),
            ' | ',
            React.createElement(
              'button',
              { className: 'link-btn', onClick: () => handleArchive(inv.id) },
              'Archive'
            )
          )
        )
    ),
    loading && React.createElement('p', null, 'Loading invoice...'),
    invError && React.createElement('p', { className: 'error' }, invError),
    selected && !loading && !invError &&
      React.createElement('iframe', {
        src: selected,
        className: 'invoice-frame'
      })
  );
}

function App() {
  const [view, setView] = useState('summary');
  const { data, error } = useBillingData();

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
        { onClick: () => setView('invoices') },
        'Invoices'
      )
    ),
    !data && !error && React.createElement('p', null, 'Loading...'),
    error && React.createElement('p', { className: 'error' }, 'Failed to load data'),
    data &&
      view === 'summary' &&
      React.createElement(Summary, { summary: data.summary, details: data.details }),
    data &&
      view === 'details' &&
      React.createElement(Details, { details: data.details }),
    data &&
      view === 'invoices' &&
      React.createElement(Invoices, { invoices: data.invoices })
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);
