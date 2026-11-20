import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/profile';
import { brl, data, exportCSV } from '../lib/format';
import { percentualFisico, valorMedido, round2 } from '../lib/calc';
import { Badge, Bar, Btn, Card, PageTitle, inputCls } from '../components/ui';

const vazio = { descricao: '', unidade: '', quantidade_contratada: '', quantidade_medida_periodo: '', preco_unitario: '' };

export default function Medicoes() {
  const { podeEscrever, podeAprovar } = useProfile();
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState('');
  const [meds, setMeds] = useState([]);
  const [todos, setTodos] = useState([]);
  const [medId, setMedId] = useState(null);
  const [item, setItem] = useState(vazio);
  const [novo, setNovo] = useState({ periodo_inicio: '', periodo_fim: '' });
  const [err, setErr] = useState('');

  useEffect(() => { supabase.from('obras').select('*').eq('ativo', true).order('nome', { ascending: true }).then(({ data: d }) => { setObras(d || []); if (d?.[0]) setObraId(d[0].id); }); }, []);

  const carregar = useCallback(async () => {
    if (!obraId) return;
    const { data: m } = await supabase.from('medicoes').select('*').eq('obra_id', obraId).order('numero', { ascending: true });
    setMeds(m || []);
    let its = [];
    for (const x of m || []) { const { data: i } = await supabase.from('medicao_itens').select('*').eq('medicao_id', x.id); its = its.concat(i || []); }
    setTodos(its);
    setMedId((cur) => (cur && (m || []).some((x) => x.id === cur) ? cur : m?.[m.length - 1]?.id ?? null));
  }, [obraId]);
  useEffect(() => { carregar(); }, [carregar]);

  const med = meds.find((m) => m.id === medId);
  const itens = todos.filter((i) => i.medicao_id === medId);
  const totalPeriodo = round2(itens.reduce((s, i) => s + valorMedido(i), 0));
  const pct = percentualFisico(itens);
  const editavel = podeEscrever && med && med.status !== 'aprovada';

  async function criarMedicao() {
    setErr('');
    const numero = meds.length ? Math.max(...meds.map((m) => m.numero)) + 1 : 1;
    const { error } = await supabase.from('medicoes').insert({ obra_id: obraId, numero, periodo_inicio: novo.periodo_inicio || null, periodo_fim: novo.periodo_fim || null, status: 'rascunho' });
    if (error) return setErr(error.message);
    setNovo({ periodo_inicio: '', periodo_fim: '' });
    carregar();
  }

  async function addItem(e) {
    e.preventDefault();
    setErr('');
    const q = Number(item.quantidade_medida_periodo || 0), c = Number(item.quantidade_contratada), pu = Number(item.preco_unitario);
    if (!item.descricao.trim()) return setErr('Informe a descrição do item.');
    if (!(c > 0) || !(pu >= 0) || q < 0) return setErr('Confira as quantidades e o preço.');
    const anteriores = todos.filter((i) => i.descricao === item.descricao.trim() && meds.find((m) => m.id === i.medicao_id)?.numero < med.numero);
    const acumAnt = anteriores.length ? Math.max(...anteriores.map((i) => Number(i.quantidade_acumulada))) : 0;
    if (acumAnt + q > c) return setErr('A quantidade acumulada ultrapassa a quantidade contratada.');
    const { error } = await supabase.from('medicao_itens').insert({ medicao_id: medId, descricao: item.descricao.trim(), unidade: item.unidade, quantidade_contratada: c, quantidade_medida_periodo: q, quantidade_acumulada: acumAnt + q, preco_unitario: pu });
    if (error) return setErr(error.message);
    setItem(vazio);
    carregar();
  }

  async function status(novoStatus) {
    await supabase.from('medicoes').update({ status: novoStatus }).eq('id', medId);
    carregar();
  }

  async function gerarReceita() {
    const { error } = await supabase.from('lancamentos').insert({ obra_id: obraId, medicao_id: medId, tipo: 'receita', categoria: 'medição', descricao: `Medição ${med.numero}`, valor: totalPeriodo, vencimento: med.periodo_fim || null });
    setErr(error ? error.message : 'Receita lançada no Financeiro.');
  }

  const tone = { rascunho: 'muted', enviada: 'warn', aprovada: 'ok' };
  const set = (k) => (e) => setItem({ ...item, [k]: e.target.value });

  return (
    <>
      <PageTitle>Medições</PageTitle>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="med-obra" className="mb-1 block text-sm text-muted">Obra</label>
          <select id="med-obra" className={inputCls} value={obraId} onChange={(e) => { setObraId(e.target.value); setMedId(null); }}>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="med-sel" className="mb-1 block text-sm text-muted">Medição</label>
          <select id="med-sel" className={inputCls} value={medId || ''} onChange={(e) => setMedId(e.target.value)}>
            {meds.length === 0 && <option value="">Nenhuma</option>}
            {meds.map((m) => <option key={m.id} value={m.id}>Medição {m.numero}</option>)}
          </select>
        </div>
        {podeEscrever && obraId && (
          <div className="flex items-end gap-2">
            <div><label htmlFor="med-ini" className="mb-1 block text-sm text-muted">Período início</label><input id="med-ini" type="date" className={inputCls} value={novo.periodo_inicio} onChange={(e) => setNovo({ ...novo, periodo_inicio: e.target.value })} /></div>
            <div><label htmlFor="med-fim" className="mb-1 block text-sm text-muted">Período fim</label><input id="med-fim" type="date" className={inputCls} value={novo.periodo_fim} onChange={(e) => setNovo({ ...novo, periodo_fim: e.target.value })} /></div>
            <Btn onClick={criarMedicao}>Nova medição</Btn>
          </div>
        )}
      </div>

      {err && <p role="alert" className="mb-3 text-sm text-danger">{err}</p>}

      {med && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card title="Situação" value={<Badge tone={tone[med.status]}>{med.status}</Badge>} />
            <Card title="Período" value={<span className="text-xl">{data(med.periodo_inicio)} a {data(med.periodo_fim)}</span>} />
            <Card title="Valor medido no período" value={brl(totalPeriodo)} />
            <Card title="% físico acumulado" value={`${String(pct).replace('.', ',')}%`}><div className="mt-2"><Bar pct={pct} /></div></Card>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {podeEscrever && med.status === 'rascunho' && <Btn onClick={() => status('enviada')}>Enviar para aprovação</Btn>}
            {podeAprovar && med.status === 'enviada' && <Btn onClick={() => status('aprovada')}>Aprovar</Btn>}
            {podeAprovar && med.status === 'enviada' && <Btn kind="ghost" onClick={() => status('rascunho')}>Devolver ao rascunho</Btn>}
            {podeEscrever && med.status === 'aprovada' && <Btn kind="ghost" onClick={gerarReceita}>Lançar receita no Financeiro</Btn>}
            <Btn kind="ghost" onClick={() => exportCSV(`medicao-${med.numero}`, [
              { label: 'Item', key: 'descricao' }, { label: 'Un.', key: 'unidade' }, { label: 'Contratado', key: 'quantidade_contratada' },
              { label: 'Medido', key: 'quantidade_medida_periodo' }, { label: 'Acumulado', key: 'quantidade_acumulada' },
              { label: 'Preço unit.', key: 'preco_unitario' }, { label: 'Valor medido', csv: (i) => valorMedido(i) },
            ], itens)}>Exportar CSV</Btn>
            <Btn kind="ghost" onClick={() => window.print()}>Imprimir / PDF</Btn>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="text-muted"><tr>{['Item', 'Un.', 'Contratado', 'Medido', 'Acumulado', 'Preço unit.', 'Valor medido'].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {itens.length === 0 && <tr><td colSpan={7} className="p-4 text-muted">Nenhum item nesta medição.</td></tr>}
                {itens.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="p-3">{i.descricao}</td><td className="p-3">{i.unidade}</td><td className="p-3">{i.quantidade_contratada}</td>
                    <td className="p-3">{i.quantidade_medida_periodo}</td><td className="p-3">{i.quantidade_acumulada}</td>
                    <td className="p-3">{brl(i.preco_unitario)}</td><td className="p-3">{brl(valorMedido(i))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editavel && (
            <form onSubmit={addItem} className="mt-4 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-6">
              <div className="md:col-span-2"><label htmlFor="it-desc" className="mb-1 block text-sm text-muted">Descrição do item</label><input id="it-desc" className={inputCls} value={item.descricao} onChange={set('descricao')} /></div>
              <div><label htmlFor="it-un" className="mb-1 block text-sm text-muted">Unidade</label><input id="it-un" className={inputCls} value={item.unidade} onChange={set('unidade')} /></div>
              <div><label htmlFor="it-cont" className="mb-1 block text-sm text-muted">Qtd. contratada</label><input id="it-cont" type="number" step="0.001" className={inputCls} value={item.quantidade_contratada} onChange={set('quantidade_contratada')} /></div>
              <div><label htmlFor="it-med" className="mb-1 block text-sm text-muted">Qtd. medida</label><input id="it-med" type="number" step="0.001" className={inputCls} value={item.quantidade_medida_periodo} onChange={set('quantidade_medida_periodo')} /></div>
              <div><label htmlFor="it-pu" className="mb-1 block text-sm text-muted">Preço unitário</label><input id="it-pu" type="number" step="0.01" className={inputCls} value={item.preco_unitario} onChange={set('preco_unitario')} /></div>
              <div className="md:col-span-6"><Btn type="submit">Adicionar item</Btn></div>
            </form>
          )}
        </>
      )}
    </>
  );
}
