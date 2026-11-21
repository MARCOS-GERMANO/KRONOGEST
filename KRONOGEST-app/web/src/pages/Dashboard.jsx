import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, PageTitle } from '../components/ui';
import { BarsChart, Donut } from '../components/charts';
import { brl } from '../lib/format';
import { alertas, desvioEtapa, fluxoMensal, mesCurto, percentualFisico, round2, statusLancamento, ultimosItens, valorAcumulado, valorMedido } from '../lib/calc';

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    (async () => {
      const get = async (t, soft) => { let q = supabase.from(t).select('*'); if (soft) q = q.eq('ativo', true); return (await q).data || []; };
      const [obras, meds, itens, lancs, etapas, pedidos] = await Promise.all([get('obras', true), get('medicoes'), get('medicao_itens'), get('lancamentos', true), get('etapas'), get('pedidos_compra')]);
      setD({ obras, meds, itens, lancs, etapas, pedidos });
    })();
  }, []);
  if (!d) return <p className="text-muted">Carregando…</p>;

  const itensObra = (id) => ultimosItens(d.itens.filter((i) => d.meds.find((m) => m.id === i.medicao_id)?.obra_id === id), d.meds);
  const porObra = d.obras.map((o) => ({ obra: o, itens: itensObra(o.id) }));
  const comMed = porObra.filter((p) => p.itens.length);
  const pcts = porObra.map((p) => ({ ...p, pct: percentualFisico(p.itens) }));
  const pctMedio = comMed.length ? round2(pcts.filter((p) => p.itens.length).reduce((s, p) => s + p.pct, 0) / comMed.length) : 0;
  const limite = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10);
  const medidoMes = round2(d.itens.filter((i) => (d.meds.find((m) => m.id === i.medicao_id)?.periodo_fim || '') >= limite).reduce((s, i) => s + valorMedido(i), 0));
  const rec = d.lancs.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const desp = d.lancs.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
  const vencidas = d.lancs.filter((l) => l.tipo === 'despesa' && statusLancamento(l) === 'atrasado').length;
  const atrasadas = d.etapas.filter((e) => e.percentual < 100 && desvioEtapa(e) > 0).length;
  const lista = alertas(d);
  const fluxo = fluxoMensal(d.lancs).map((f) => ({ label: mesCurto(f.mes), receitas: f.receitas, despesas: f.despesas }));
  const orcMed = d.obras.map((o) => ({ label: o.nome, orcamento: Number(o.orcamento_total), medido: valorAcumulado(itensObra(o.id)) }));
  const cats = Object.entries(d.lancs.filter((l) => l.tipo === 'despesa').reduce((a, l) => ({ ...a, [l.categoria || 'outros']: (a[l.categoria || 'outros'] || 0) + Number(l.valor) }), {})).map(([label, value]) => ({ label, value }));
  const nivel = { danger: 'bg-danger', warn: 'bg-warn' };
  const painel = 'rounded-xl border border-border bg-surface p-4';

  return (
    <div className="fade-in">
      <PageTitle>Dashboard</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card title="Obras ativas" value={d.obras.filter((o) => o.status === 'em_andamento').length} />
        <Card title="% físico médio" value={`${String(pctMedio).replace('.', ',')}%`} />
        <Card title="Medido no último mês" value={brl(medidoMes)} />
        <Card title="Saldo financeiro" value={brl(rec - desp)} tone={rec - desp >= 0 ? 'ok' : 'danger'} />
        <Card title="Contas vencidas" value={vencidas} tone={vencidas ? 'danger' : undefined} />
        <Card title="Etapas atrasadas" value={atrasadas} tone={atrasadas ? 'danger' : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={painel}>
          <h3 className="mb-3 font-semibold">Atenção agora</h3>
          {lista.length === 0 && <p className="text-muted">Nada pendente. Tudo em dia.</p>}
          <ul>
            {lista.slice(0, 8).map((a, i) => (
              <li key={i} className="border-b border-border last:border-0">
                <a href={`#${a.ref}`} className="flex items-center gap-3 py-2 text-sm hover:text-silver">
                  <i className={`h-2.5 w-2.5 shrink-0 rounded-full ${nivel[a.nivel]}`} />{a.texto}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className={painel}>
          <h3 className="mb-3 font-semibold">Fluxo de caixa mensal</h3>
          <BarsChart label="Fluxo de caixa mensal" data={fluxo} series={[{ key: 'receitas', label: 'Receitas', color: '#3fb68b' }, { key: 'despesas', label: 'Despesas', color: '#e5534b' }]} />
        </section>
        <section className={painel}>
          <h3 className="mb-3 font-semibold">Orçado × medido por obra</h3>
          <BarsChart label="Orçado e medido por obra" data={orcMed} series={[{ key: 'orcamento', label: 'Orçamento', color: '#5b6b7d' }, { key: 'medido', label: 'Medido acumulado', color: '#c9d1d9' }]} />
        </section>
        <section className={painel}>
          <h3 className="mb-3 font-semibold">Despesas por categoria</h3>
          <Donut label="Despesas por categoria" data={cats} />
        </section>
      </div>

      <section className={`${painel} mt-4`}>
        <h3 className="mb-3 font-semibold">Avanço físico por obra</h3>
        {pcts.length === 0 && <p className="text-muted">Sem obras.</p>}
        {pcts.map(({ obra, pct }) => (
          <a key={obra.id} href="#painel" className="mb-3 block">
            <div className="mb-1 flex justify-between text-sm"><span>{obra.nome}</span><span>{String(pct).replace('.', ',')}%</span></div>
            <div className="h-2 rounded bg-border"><div className="h-full rounded bg-silver transition-all" style={{ width: `${Math.min(100, pct)}%` }} /></div>
          </a>
        ))}
      </section>
    </div>
  );
}
