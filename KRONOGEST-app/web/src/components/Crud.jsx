import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/profile';
import { brl, data, exportCSV } from '../lib/format';
import { Btn, inputCls } from './ui';

export default function Crud({ table, title, fields, soft = false, orderBy = 'created_at', extraColumns = [], defaults = {}, onLoad, validate }) {
  const { podeEscrever } = useProfile();
  const [rows, setRows] = useState([]);
  const [rels, setRels] = useState({});
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    let q = supabase.from(table).select('*');
    if (soft) q = q.eq('ativo', true);
    const { data: d } = await q.order(orderBy, { ascending: false });
    setRows(d || []);
    onLoad?.(d || []);
    const rel = {};
    for (const f of fields.filter((x) => x.from)) {
      const { data: r } = await supabase.from(f.from.table).select('*').order(f.from.label, { ascending: true });
      rel[f.key] = r || [];
    }
    setRels(rel);
  }, [table, soft, orderBy]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const optionsOf = (f) => (f.from ? (rels[f.key] || []).map((r) => [r.id, r[f.from.label]]) : f.options);
  const show = (f, row) => {
    const v = row[f.key];
    if (f.from || f.options) return optionsOf(f)?.find((o) => String(o[0]) === String(v))?.[1] ?? '—';
    if (f.type === 'date') return data(v);
    if (f.type === 'money') return brl(v);
    return v ?? '—';
  };

  async function salvar(e) {
    e.preventDefault();
    setErr('');
    const payload = {};
    for (const f of fields) {
      let v = form[f.key];
      if (f.required && (v === undefined || v === null || v === '')) return setErr(`Preencha o campo "${f.label}".`);
      if (v === '' || v === undefined) v = null;
      if (v !== null && (f.type === 'number' || f.type === 'money')) v = Number(v);
      payload[f.key] = v;
    }
    const msg = validate?.(payload);
    if (msg) return setErr(msg);
    const { error } = form.id
      ? await supabase.from(table).update(payload).eq('id', form.id)
      : await supabase.from(table).insert({ ...defaults, ...payload });
    if (error) return setErr(error.message);
    setForm(null);
    load();
  }

  async function excluir(row) {
    if (!window.confirm('Excluir este registro?')) return;
    if (soft) await supabase.from(table).update({ ativo: false }).eq('id', row.id);
    else await supabase.from(table).delete().eq('id', row.id);
    load();
  }

  const cols = fields.filter((f) => f.list !== false);
  const csvCols = [...cols.map((f) => ({ label: f.label, csv: (r) => show(f, r) })), ...extraColumns.map((c) => ({ label: c.label, csv: c.csv || (() => '') }))];

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-lg font-semibold">{title}</h3>
        <Btn kind="ghost" onClick={() => exportCSV(table, csvCols, rows)}>Exportar CSV</Btn>
        <Btn kind="ghost" onClick={() => window.print()}>Imprimir / PDF</Btn>
        {podeEscrever && <Btn onClick={() => setForm({})}>Novo</Btn>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              {cols.map((f) => <th key={f.key} className="p-3 font-semibold">{f.label}</th>)}
              {extraColumns.map((c) => <th key={c.label} className="p-3 font-semibold">{c.label}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-4 text-muted" colSpan={cols.length + extraColumns.length + 1}>Nenhum registro.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                {cols.map((f) => <td key={f.key} className="p-3">{show(f, r)}</td>)}
                {extraColumns.map((c) => <td key={c.label} className="p-3">{c.render(r)}</td>)}
                <td className="whitespace-nowrap p-3 text-right">
                  {podeEscrever && <>
                    <button className="mr-3 text-silver underline" onClick={() => setForm({ ...r })}>Editar</button>
                    <button className="text-danger underline" onClick={() => excluir(r)}>Excluir</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-3 md:items-center">
          <form onSubmit={salvar} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5">
            <h4 className="mb-4 text-lg font-semibold">{form.id ? 'Editar' : 'Novo'} — {title}</h4>
            {fields.map((f) => {
              const id = `${table}-${f.key}`;
              const opts = optionsOf(f);
              return (
                <div key={f.key} className="mb-3">
                  <label htmlFor={id} className="mb-1 block text-sm text-muted">{f.label}{f.required ? ' *' : ''}</label>
                  {opts ? (
                    <select id={id} className={inputCls} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                      <option value="">Selecione…</option>
                      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : (
                    <input id={id} className={inputCls} type={f.type === 'money' || f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      step={f.type === 'money' ? '0.01' : undefined} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  )}
                </div>
              );
            })}
            {err && <p role="alert" className="mb-3 text-sm text-danger">{err}</p>}
            <div className="flex justify-end gap-2">
              <Btn type="button" kind="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn type="submit">Salvar</Btn>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
