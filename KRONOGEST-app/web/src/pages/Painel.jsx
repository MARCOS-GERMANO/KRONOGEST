import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/profile';
import { brl, data as fdata } from '../lib/format';
import { reduzirImagem } from '../lib/imagem';
import { curvaS, desvioEtapa, mesCurto, percentualFisico, statusLancamento, ultimosItens, valorAcumulado } from '../lib/calc';
import { Badge, Btn, Card, PageTitle, inputCls } from '../components/ui';
import { LineChart } from '../components/charts';

const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

export default function Painel() {
  const { podeEscrever, empresa_id } = useProfile();
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState('');
  const [d, setD] = useState(null);
  const [urls, setUrls] = useState({});
  const [legenda, setLegenda] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { supabase.from('obras').select('*').eq('ativo', true).order('nome', { ascending: true }).then(({ data }) => { setObras(data || []); if (data?.[0]) setObraId(data[0].id); }); }, []);

  const carregar = useCallback(async () => {
    if (!obraId) return;
    const q = (t) => supabase.from(t).select('*').eq('obra_id', obraId);
    const [meds, lancs, etapas, fotos] = await Promise.all([q('medicoes').order('numero', { ascending: true }), q('lancamentos').eq('ativo', true).order('vencimento', { ascending: false }), q('etapas').order('inicio_previsto', { ascending: true }), q('fotos').order('created_at', { ascending: false })]);
    let itens = [];
    for (const m of meds.data || []) itens = itens.concat((await supabase.from('medicao_itens').select('*').eq('medicao_id', m.id)).data || []);
    setD({ meds: meds.data || [], itens, lancs: lancs.data || [], etapas: etapas.data || [], fotos: fotos.data || [] });
    const paths = (fotos.data || []).map((f) => f.caminho);
    if (paths.length) {
      const { data: s } = await supabase.storage.from('fotos').createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((s || []).map((x) => [x.path, x.signedUrl])));
    } else setUrls({});
  }, [obraId]);
  useEffect(() => { carregar(); }, [carregar]);

  async function enviarFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setMsg('Enviando…');
    const corpo = await reduzirImagem(arquivo);
    const caminho = `${empresa_id}/${obraId}/${crypto.randomUUID()}.jpg`;
    const up = await supabase.storage.from('fotos').upload(caminho, corpo, { contentType: 'image/jpeg' });
    if (up.error) return setMsg(up.error.message);
    const { error } = await supabase.from('fotos').insert({ obra_id: obraId, caminho, legenda: legenda.trim() || null });
    setMsg(error ? error.message : 'Foto enviada.');
    setLegenda(''); e.target.value = '';
    carregar();
  }
  async function apagarFoto(f) {
    if (!window.confirm('Excluir esta foto?')) return;
    await supabase.storage.from('fotos').remove([f.caminho]);
    await supabase.from('fotos').delete().eq('id', f.id);
    carregar();
  }

  const obra = obras.find((o) => o.id === obraId);
  if (!obra && obras.length === 0) return <><PageTitle>Painel da obra</PageTitle><p className="text-muted">Cadastre uma obra para ver o painel.</p></>;
  if (!obra || !d) return <p className="text-muted">Carregando…</p>;

  const atuais = ultimosItens(d.itens, d.meds);
  const pct = percentualFisico(atuais);
  const desp = d.lancs.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
  const rec = d.lancs.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const restante = obra.data_prevista_fim ? dias(new Date().toISOString().slice(0, 10), obra.data_prevista_fim) : null;
  const curva = curvaS(obra, d.meds, d.itens).map((p) => ({ label: mesCurto(p.mes), previsto: p.previsto, realizado: p.realizado }));
  const ini = d.etapas.map((e) => e.inicio_previsto).filter(Boolean).sort()[0];
  const fim = d.etapas.map((e) => e.fim_previsto).filter(Boolean).sort().slice(-1)[0];
  const span = ini && fim ? Math.max(1, dias(ini, fim)) : 1;
  const tone = { pago: 'ok', atrasado: 'danger', previsto: 'muted' };
  const painel = 'rounded-xl border border-border bg-surface p-4';

  return (
    <div className="fade-in">
      <PageTitle>Painel da obra</PageTitle>
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label htmlFor="pn-obra" className="mb-1 block text-sm text-muted">Obra</label>
          <select id="pn-obra" className={inputCls} value={obraId} onChange={(e) => setObraId(e.target.value)}>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
        <Btn kind="ghost" onClick={() => window.print()}>Imprimir relatório</Btn>
      </div>
      <h3 className="mb-3 hidden text-lg font-semibold print:block">{obra.nome} — {obra.cliente}</h3>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card title="% físico" value={`${String(pct).replace('.', ',')}%`} />
        <Card title="Orçamento" value={brl(obra.orcamento_total)} />
        <Card title="Medido acumulado" value={brl(valorAcumulado(atuais))} />
        <Card title="Despesas da obra" value={brl(desp)} />
        <Card title="Saldo da obra" value={brl(rec - desp)} tone={rec - desp >= 0 ? 'ok' : 'danger'} />
        <Card title="Prazo" value={<span className="text-2xl">{restante === null ? '—' : restante >= 0 ? `${restante} dias restantes` : `${-restante} dias de atraso`}</span>} tone={restante !== null && restante < 0 ? 'danger' : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={painel}>
          <h3 className="mb-3 font-semibold">Curva S (previsto × realizado)</h3>
          {curva.length ? <LineChart label="Curva S" data={curva} series={[{ key: 'previsto', label: 'Previsto', color: '#5b6b7d', dashed: true }, { key: 'realizado', label: 'Realizado (medido)', color: '#3fb68b' }]} />
            : <p className="text-muted">Informe início, término e orçamento da obra para ver a curva S.</p>}
        </section>
        <section className={painel}>
          <h3 className="mb-3 font-semibold">Cronograma</h3>
          {d.etapas.length === 0 && <p className="text-muted">Sem etapas cadastradas.</p>}
          {d.etapas.map((e) => {
            const esq = e.inicio_previsto && ini ? (dias(ini, e.inicio_previsto) / span) * 100 : 0;
            const larg = e.inicio_previsto && e.fim_previsto ? Math.max(3, (dias(e.inicio_previsto, e.fim_previsto) / span) * 100) : 100;
            const atrasada = e.percentual < 100 && desvioEtapa(e) > 0;
            return (
              <div key={e.id} className="mb-3">
                <div className="mb-1 flex justify-between text-sm"><span>{e.nome}</span><span className={atrasada ? 'text-danger' : 'text-muted'}>{e.percentual}%{atrasada ? ` · ${desvioEtapa(e)} dias de atraso` : ''}</span></div>
                <div className="relative h-4 rounded bg-border">
                  <div className="absolute h-full rounded bg-border brightness-150" style={{ left: `${esq}%`, width: `${Math.min(larg, 100 - esq)}%` }}>
                    <div className={`h-full rounded ${atrasada ? 'bg-danger' : 'bg-ok'}`} style={{ width: `${e.percentual}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <section className={`${painel} mt-4`}>
        <h3 className="mb-3 font-semibold">Lançamentos recentes</h3>
        {d.lancs.length === 0 && <p className="text-muted">Sem lançamentos.</p>}
        {d.lancs.slice(0, 5).map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
            <span>{l.descricao} <span className="text-muted">· {fdata(l.vencimento)}</span></span>
            <span className="flex items-center gap-2">{brl(l.valor)} <Badge tone={tone[statusLancamento(l)]}>{statusLancamento(l) === 'atrasado' ? 'ATRASADO' : statusLancamento(l)}</Badge></span>
          </div>
        ))}
      </section>

      <section className={`${painel} mt-4`}>
        <h3 className="mb-3 font-semibold">Fotos da obra</h3>
        {podeEscrever && (
          <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
            <div><label htmlFor="ft-leg" className="mb-1 block text-sm text-muted">Legenda</label><input id="ft-leg" className={inputCls} value={legenda} onChange={(e) => setLegenda(e.target.value)} /></div>
            <div><label htmlFor="ft-arq" className="mb-1 block text-sm text-muted">Foto</label><input id="ft-arq" type="file" accept="image/*" capture="environment" className="text-sm" onChange={enviarFoto} /></div>
          </div>
        )}
        {msg && <p role="status" className="mb-3 text-sm text-muted">{msg}</p>}
        {d.fotos.length === 0 && <p className="text-muted">Nenhuma foto ainda.</p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {d.fotos.map((f) => (
            <figure key={f.id} className="overflow-hidden rounded-lg border border-border">
              <img src={urls[f.caminho]} alt={f.legenda || 'Foto da obra'} className="aspect-square w-full object-cover" />
              <figcaption className="flex items-center justify-between gap-2 p-2 text-xs text-muted">
                <span>{f.legenda || fdata(f.created_at?.slice(0, 10))}</span>
                {podeEscrever && <button className="text-danger underline print:hidden" onClick={() => apagarFoto(f)}>Excluir</button>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
