export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const valorMedido = (i) => round2(Number(i.quantidade_medida_periodo) * Number(i.preco_unitario));
export function percentualFisico(itens) {
  const total = itens.reduce((s, i) => s + Number(i.quantidade_contratada) * Number(i.preco_unitario), 0);
  if (!total) return 0;
  return round2((itens.reduce((s, i) => s + Number(i.quantidade_acumulada) * Number(i.preco_unitario), 0) / total) * 100);
}
const dia = (d) => d.toISOString().slice(0, 10);
export function statusLancamento(l, hoje = new Date()) {
  if (l.pagamento) return 'pago';
  if (l.vencimento && l.vencimento < dia(hoje)) return 'atrasado';
  return 'previsto';
}
export function desvioEtapa(e, hoje = new Date()) {
  if (!e.fim_previsto) return 0;
  const ref = e.fim_real ? new Date(e.fim_real) : new Date(hoje.toISOString().slice(0, 10));
  return Math.max(0, Math.round((ref - new Date(e.fim_previsto)) / 86400000));
}
export function planejamentoReverso(dataFinal, etapas) {
  let fim = new Date(dataFinal); const out = [];
  for (let i = etapas.length - 1; i >= 0; i--) {
    const ini = new Date(fim); ini.setUTCDate(ini.getUTCDate() - etapas[i].dias);
    out.unshift({ nome: etapas[i].nome, inicio: dia(ini), fim: dia(fim) }); fim = ini;
  }
  return out;
}
