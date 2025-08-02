const { useState, useEffect } = React;

function useBillingData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let json;
        if (window.cockpit && window.cockpit.file) {
          const raw = await window.cockpit
            .file('/usr/share/cockpit/slurmcostmanager/mock-billing.json')
            .read();
          json = JSON.parse(raw);
        } else {
          const resp = await fetch('mock-billing.json');
          if (!resp.ok) throw new Error('Failed to fetch mock data');
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

function Summary({ summary }) {
  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Monthly Billing Summary'),
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
  );
}

function Details({ details }) {
  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, 'Cost Details'),
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
        details.map((d, i) =>
          React.createElement(
            'tr',
            { key: i },
            React.createElement('td', null, d.account),
            React.createElement('td', null, d.core_hours),
            React.createElement('td', null, d.instance_hours),
            React.createElement('td', null, d.gb_month),
            React.createElement('td', null, d.cost)
          )
        )
      )
    )
  );
}

function Invoices({ invoices }) {
  const [selected, setSelected] = useState(null);
  const [urls, setUrls] = useState({});
  const [list, setList] = useState(invoices);

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
    ensureUrl(inv.filename).then(url => setSelected(url));
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
    selected &&
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
      React.createElement(Summary, { summary: data.summary }),
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
