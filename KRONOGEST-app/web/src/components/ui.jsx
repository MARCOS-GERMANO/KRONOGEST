import React from 'react';
export const inputCls = 'w-full rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-silver';
export const Btn = ({ kind = 'solid', className = '', ...p }) => (
  <button {...p} className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${kind === 'solid' ? 'bg-silver text-bg hover:opacity-90' : 'border border-border text-text hover:border-silver'} ${className}`} />
);
export const Card = ({ title, value, tone, children }) => (
  <div className="rounded-xl border border-border bg-surface p-4">
    <div className="text-sm text-muted">{title}</div>
    <div className={`text-3xl font-semibold ${tone === 'danger' ? 'text-danger' : tone === 'ok' ? 'text-ok' : ''}`}>{value}</div>
    {children}
  </div>
);
export const Badge = ({ tone = 'muted', children }) => {
  const c = { danger: 'bg-danger text-white', ok: 'bg-ok text-bg', warn: 'bg-warn text-bg', muted: 'bg-border text-text' }[tone];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold uppercase ${c}`}>{children}</span>;
};
export const Bar = ({ pct, tone = 'ok' }) => (
  <div className="h-2 w-28 overflow-hidden rounded bg-border">
    <div className={`h-full ${tone === 'danger' ? 'bg-danger' : 'bg-ok'}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
  </div>
);
export const PageTitle = ({ children }) => <h2 className="mb-4 text-xl font-bold uppercase tracking-widest text-silver">{children}</h2>;
