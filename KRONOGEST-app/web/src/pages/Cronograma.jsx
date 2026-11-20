import React, { useState } from 'react';
import Crud from '../components/Crud';
import { Badge, Bar, Btn, PageTitle, inputCls } from '../components/ui';
import { desvioEtapa, planejamentoReverso } from '../lib/calc';
import { data } from '../lib/format';

function Reverso() {
  const [fim, setFim] = useState('');
  const [txt, setTxt] = useState('Fundação:30\nEstrutura:60\nAcabamento:45');
  const [out, setOut] = useState([]);
  function calcular() {
    const etapas = txt.split('\n').map((l) => l.split(':')).filter((p) => p[0]?.trim() && Number(p[1]) > 0).map((p) => ({ nome: p[0].trim(), dias: Number(p[1]) }));
    if (fim && etapas.length) setOut(planejamentoReverso(fim, etapas));
  }
  return (
    <section className="mb-8 rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-lg font-semibold">Planejamento reverso</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="rev-fim" className="mb-1 block text-sm text-muted">Data final da obra</label>
          <input id="rev-fim" type="date" className={inputCls} value={fim} onChange={(e) => setFim(e.target.value)} />
          <label htmlFor="rev-etapas" className="mb-1 mt-3 block text-sm text-muted">Etapas (nome:dias, uma por linha)</label>
          <textarea id="rev-etapas" rows={4} className={inputCls} value={txt} onChange={(e) => setTxt(e.target.value)} />
          <Btn className="mt-3" onClick={calcular}>Calcular datas</Btn>
        </div>
        <ul className="text-sm">
          {out.map((e) => <li key={e.nome} className="border-b border-border py-2"><b>{e.nome}</b>: {data(e.inicio)} → {data(e.fim)}</li>)}
        </ul>
      </div>
    </section>
  );
}

export default function Cronograma() {
  return (
    <>
      <PageTitle>Cronograma e planejamento</PageTitle>
      <Crud table="etapas" title="Etapas" orderBy="inicio_previsto"
        extraColumns={[
          { label: 'Progresso', csv: (e) => `${e.percentual}%`, render: (e) => <div className="flex items-center gap-2"><Bar pct={e.percentual} /><span>{e.percentual}%</span></div> },
          { label: 'Desvio', csv: (e) => desvioEtapa(e), render: (e) => { const d = e.percentual >= 100 && !e.fim_real ? 0 : desvioEtapa(e); return d > 0 && e.percentual < 100 ? <Badge tone="danger">{d} dias de atraso</Badge> : <Badge tone="ok">No prazo</Badge>; } },
        ]}
        fields={[
          { key: 'obra_id', label: 'Obra', from: { table: 'obras', label: 'nome' }, required: true },
          { key: 'nome', label: 'Etapa', required: true },
          { key: 'inicio_previsto', label: 'Início previsto', type: 'date' },
          { key: 'fim_previsto', label: 'Fim previsto', type: 'date' },
          { key: 'inicio_real', label: 'Início real', type: 'date', list: false },
          { key: 'fim_real', label: 'Fim real', type: 'date', list: false },
          { key: 'percentual', label: '% concluído', type: 'number' },
        ]} defaults={{ percentual: 0 }}
        validate={(p) => (p.percentual != null && (p.percentual < 0 || p.percentual > 100) ? 'O percentual deve estar entre 0 e 100.' : '')} />
      <Reverso />
    </>
  );
}
