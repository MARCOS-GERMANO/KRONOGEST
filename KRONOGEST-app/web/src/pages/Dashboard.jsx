import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bar, Card, PageTitle } from '../components/ui';
import { brl } from '../lib/format';
import { desvioEtapa, percentualFisico, round2, statusLancamento, valorMedido } from '../lib/calc';

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    (async () => {
      const get = async (t, soft) => { let q = supabase.from(t).select('*'); if (soft) q = q.eq('ativo', true); return (await q).data || []; };
      const [obras, meds, itens, lancs, etapas] = await Promise.all([get('obras', true), get('medicoes'), get('medicao_itens'), get('lancamentos', true), get('etapas')]);
      setD({ obras, meds, itens, lancs, etapas });
    })();
  }, []);
  if (!d) return <p className="text-muted">Carregando…</p>;

  const mes = new Date().toISOString().slice(0, 7);
  const ativas = d.obras.filter((o) => o.status === 'em_andamento');
  const medObra = (obraId) => d.itens.filter((i) => d.meds.find((m) => m.id === i.medicao_id)?.obra_id === obraId);
  const pcts = d.obras.map((o) => ({ obra: o, pct: percentualFisico(ultimosItens(medObra(o.id), d.meds)) }));
  const comMedicao = pcts.filter((p) => medObra(p.obra.id).length);
  const pctMedio = comMedicao.length ? round2(comMedicao.reduce((s, p) => s + p.pct, 0) / comMedicao.length) : 0;
  const medidoMes = round2(d.itens.filter((i) => (d.meds.find((m) => m.id === i.medicao_id)?.periodo_fim || '').startsWith(mes) || (d.meds.find((m) => m.id === i.medicao_id)?.periodo_fim || '') >= new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10)).reduce((s, i) => s + valorMedido(i), 0));
  const rec = d.lancs.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const desp = d.lancs.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
  const vencidas = d.lancs.filter((l) => l.tipo === 'despesa' && statusLancamento(l) === 'atrasado').length;
  const atrasadas = d.etapas.filter((e) => e.percentual < 100 && desvioEtapa(e) > 0);
  const porCat = Object.entries(d.lancs.filter((l) => l.tipo === 'despesa').reduce((a, l) => ({ ...a, [l.categoria || 'outros']: (a[l.categoria || 'outros'] || 0) + Number(l.valor) }), {})).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...porCat.map((c) => c[1]));

  return (
    <>
      <PageTitle>Dashboard</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card title="Obras ativas" value={ativas.length} />
        <Card title="% físico médio" value={`${String(pctMedio).replace('.', ',')}%`} />
        <Card title="Medido no último mês" value={brl(medidoMes)} />
        <Card title="Saldo financeiro" value={brl(rec - desp)} tone={rec - desp >= 0 ? 'ok' : 'danger'} />
        <Card title="Contas vencidas" value={vencidas} tone={vencidas ? 'danger' : undefined} />
        <Card title="Etapas atrasadas" value={atrasadas.length} tone={atrasadas.length ? 'danger' : undefined} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 font-semibold">Avanço físico por obra</h3>
          {pcts.length === 0 && <p className="text-muted">Sem obras.</p>}
          {pcts.map(({ obra, pct }) => <div key={obra.id} className="mb-3"><div className="mb-1 flex justify-between text-sm"><span>{obra.nome}</span><span>{pct}%</span></div><div className="h-2 rounded bg-border"><div className="h-full rounded bg-silver" style={{ width: `${Math.min(100, pct)}%` }} /></div></div>)}
        </section>
        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 font-semibold">Despesas por categoria</h3>
          {porCat.length === 0 && <p className="text-muted">Sem despesas.</p>}
          {porCat.map(([c, v]) => <div key={c} className="mb-3"><div className="mb-1 flex justify-between text-sm"><span>{c}</span><span>{brl(v)}</span></div><div className="h-2 rounded bg-border"><div className="h-full rounded bg-silver" style={{ width: `${(v / maxCat) * 100}%` }} /></div></div>)}
        </section>
      </div>
    </>
  );
}

// usa só a medição mais recente de cada obra (acumulado já está no item)
function ultimosItens(itens, meds) {
  const porDesc = {};
  for (const i of itens) {
    const n = meds.find((m) => m.id === i.medicao_id)?.numero ?? 0;
    if (!porDesc[i.descricao] || n >= porDesc[i.descricao].n) porDesc[i.descricao] = { n, i };
  }
  return Object.values(porDesc).map((x) => x.i);
}
