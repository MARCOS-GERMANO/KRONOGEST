import React from 'react';
import { brl } from '../lib/format';

export const PALETA = ['#c9d1d9', '#3fb68b', '#e0a83a', '#5b9bd5', '#b07cc6', '#e5534b'];
export const cor = (i) => PALETA[i % PALETA.length];
const compacto = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} mi` : n >= 1e3 ? `${Math.round(n / 1e3)} mil` : String(Math.round(n)));

const Legenda = ({ itens }) => (
  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
    {itens.map((s, i) => <span key={s.label} className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color || cor(i) }} />{s.label}</span>)}
  </div>
);
const Vazio = () => <p className="text-muted">Sem dados para exibir.</p>;

export function BarsChart({ data, series, label }) {
  if (!data.length) return <Vazio />;
  const W = 520, H = 210, p = { l: 46, r: 8, t: 10, b: 28 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const gw = iw / data.length, bw = Math.min(28, (gw * 0.7) / series.length);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
        {[0, 0.5, 1].map((t) => (
          <g key={t}><line x1={p.l} x2={W - p.r} y1={p.t + ih * (1 - t)} y2={p.t + ih * (1 - t)} stroke="var(--border)" />
            <text x={p.l - 6} y={p.t + ih * (1 - t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{compacto(max * t)}</text></g>
        ))}
        {data.map((d, i) => (
          <g key={d.label} transform={`translate(${p.l + gw * i + (gw - bw * series.length) / 2},0)`}>
            {series.map((s, k) => {
              const v = Number(d[s.key]) || 0, h = (v / max) * ih;
              return <rect key={s.key} x={k * bw} y={p.t + ih - h} width={bw - 2} height={h} rx="3" fill={s.color || cor(k)}><title>{`${d.label} · ${s.label}: ${brl(v)}`}</title></rect>;
            })}
            <text x={(bw * series.length) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">{String(d.label).slice(0, 14)}</text>
          </g>
        ))}
      </svg>
      <Legenda itens={series.map((s, i) => ({ ...s, color: s.color || cor(i) }))} />
    </figure>
  );
}

export function LineChart({ data, series, label }) {
  if (!data.length) return <Vazio />;
  const W = 520, H = 230, p = { l: 50, r: 12, t: 10, b: 28 }, iw = W - p.l - p.r, ih = H - p.t - p.b;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const x = (i) => p.l + (data.length > 1 ? (iw * i) / (data.length - 1) : iw / 2);
  const y = (v) => p.t + ih - (v / max) * ih;
  const caminho = (key) => data.reduce((d, pt, i) => (pt[key] == null ? d + '|' : `${d}${d === '' || d.endsWith('|') ? 'M' : 'L'}${x(i)},${y(pt[key])}`), '').split('|').filter(Boolean);
  const passo = Math.ceil(data.length / 8);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
        {[0, 0.5, 1].map((t) => (
          <g key={t}><line x1={p.l} x2={W - p.r} y1={p.t + ih * (1 - t)} y2={p.t + ih * (1 - t)} stroke="var(--border)" />
            <text x={p.l - 6} y={p.t + ih * (1 - t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{compacto(max * t)}</text></g>
        ))}
        {data.map((d, i) => (i % passo === 0 ? <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">{d.label}</text> : null))}
        {series.map((s, k) => caminho(s.key).map((d, j) => <path key={`${s.key}${j}`} d={d} fill="none" stroke={s.color || cor(k)} strokeWidth="2.5" strokeDasharray={s.dashed ? '6 5' : undefined} strokeLinecap="round" />))}
      </svg>
      <Legenda itens={series.map((s, i) => ({ ...s, color: s.color || cor(i) }))} />
    </figure>
  );
}

export function Donut({ data, label }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <Vazio />;
  const r = 42, C = 2 * Math.PI * r;
  let acum = 0;
  return (
    <figure className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 120 120" role="img" aria-label={label} className="h-36 w-36">
        <g transform="rotate(-90 60 60)">
          {data.map((d, i) => { const len = (d.value / total) * C; const el = <circle key={d.label} cx="60" cy="60" r={r} fill="none" stroke={cor(i)} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acum}><title>{`${d.label}: ${brl(d.value)}`}</title></circle>; acum += len; return el; })}
        </g>
        <text x="60" y="64" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">{compacto(total)}</text>
      </svg>
      <ul className="text-sm">
        {data.map((d, i) => <li key={d.label} className="mb-1 flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: cor(i) }} />{d.label} <span className="text-muted">{Math.round((d.value / total) * 100)}%</span></li>)}
      </ul>
    </figure>
  );
}
