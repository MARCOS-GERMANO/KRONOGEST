// Regras de negócio puras (testáveis sem banco)
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function valorMedido(item) {
  return round2(Number(item.quantidade_medida_periodo) * Number(item.preco_unitario));
}

function percentualFisico(itens) {
  const total = itens.reduce((s, i) => s + Number(i.quantidade_contratada) * Number(i.preco_unitario), 0);
  if (total === 0) return 0;
  const medido = itens.reduce((s, i) => s + Number(i.quantidade_acumulada) * Number(i.preco_unitario), 0);
  return round2((medido / total) * 100);
}

function statusLancamento(l, hoje = new Date()) {
  if (l.pagamento) return 'pago';
  if (l.vencimento && new Date(l.vencimento) < new Date(hoje.toISOString().slice(0, 10))) return 'atrasado';
  return 'previsto';
}

function desvioEtapa(e, hoje = new Date()) {
  if (!e.fim_previsto) return 0;
  const ref = e.fim_real ? new Date(e.fim_real) : new Date(hoje.toISOString().slice(0, 10));
  return Math.max(0, Math.round((ref - new Date(e.fim_previsto)) / 86400000));
}

function notaMedia(avaliacoes) {
  if (!avaliacoes.length) return null;
  const soma = avaliacoes.reduce((s, a) => s + (a.prazo + a.qualidade + a.preco) / 3, 0);
  return round2(soma / avaliacoes.length);
}

// Planejamento reverso: dada a data final e durações (dias) em ordem, devolve as datas
function planejamentoReverso(dataFinal, etapas) {
  let fim = new Date(dataFinal);
  const out = [];
  for (let i = etapas.length - 1; i >= 0; i--) {
    const inicio = new Date(fim);
    inicio.setUTCDate(inicio.getUTCDate() - etapas[i].dias);
    out.unshift({ nome: etapas[i].nome, inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) });
    fim = inicio;
  }
  return out;
}

function resumoFinanceiro(lancs, hoje = new Date()) {
  const r = { receitas: 0, despesas: 0, vencidas: 0 };
  for (const l of lancs.filter((x) => x.ativo !== false)) {
    const v = Number(l.valor);
    if (l.tipo === 'receita') r.receitas += v; else r.despesas += v;
    if (l.tipo === 'despesa' && statusLancamento(l, hoje) === 'atrasado') r.vencidas += 1;
  }
  r.saldo = round2(r.receitas - r.despesas);
  r.receitas = round2(r.receitas);
  r.despesas = round2(r.despesas);
  return r;
}

module.exports = { valorMedido, percentualFisico, statusLancamento, desvioEtapa, notaMedia, planejamentoReverso, resumoFinanceiro, round2 };
