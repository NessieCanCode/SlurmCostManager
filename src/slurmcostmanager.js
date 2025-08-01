const { useState } = React;

function Summary() {
  return (
    React.createElement('div', null,
      React.createElement('h2', null, 'Monthly Billing Summary'),
      React.createElement('p', null, 'Mock billing data displayed here.')
    )
  );
}

function Details() {
  return (
    React.createElement('div', null,
      React.createElement('h2', null, 'Cost Details'),
      React.createElement('p', null, 'Core-hours, instance-hours, GB-month data.')
    )
  );
}

function Invoices() {
  return (
    React.createElement('div', null,
      React.createElement('h2', null, 'Invoices'),
      React.createElement('p', null, 'Invoice list and PDF download links.')
    )
  );
}

function App() {
  const [view, setView] = useState('summary');

  return (
    React.createElement('div', { className: 'app' },
      React.createElement('nav', null,
        React.createElement('button', { onClick: () => setView('summary') }, 'Summary'),
        React.createElement('button', { onClick: () => setView('details') }, 'Details'),
        React.createElement('button', { onClick: () => setView('invoices') }, 'Invoices'),
      ),
      view === 'summary' && React.createElement(Summary),
      view === 'details' && React.createElement(Details),
      view === 'invoices' && React.createElement(Invoices)
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);
