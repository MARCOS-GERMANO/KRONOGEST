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

export const mesCurto = (ym) => `${ym.slice(5, 7)}/${ym.slice(2, 4)}`;

export function listarMeses(ini, fim) {
  const out = [];
  let [y, m] = ini.slice(0, 7).split('-').map(Number);
  const [y2, m2] = fim.slice(0, 7).split('-').map(Number);
  while ((y < y2 || (y === y2 && m <= m2)) && out.length < 240) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

// Usa só o acumulado mais recente de cada descrição (o item já guarda o acumulado)
export function ultimosItens(itens, meds) {
  const porDesc = {};
  for (const i of itens) {
    const n = meds.find((m) => m.id === i.medicao_id)?.numero ?? 0;
    if (!porDesc[i.descricao] || n >= porDesc[i.descricao].n) porDesc[i.descricao] = { n, i };
  }
  return Object.values(porDesc).map((x) => x.i);
}
export const valorAcumulado = (itens) => round2(itens.reduce((s, i) => s + Number(i.quantidade_acumulada) * Number(i.preco_unitario), 0));

export function fluxoMensal(lancs) {
  const map = {};
  for (const l of lancs) {
    const ref = l.pagamento || l.vencimento;
    if (!ref) continue;
    const mes = ref.slice(0, 7);
    map[mes] ||= { mes, receitas: 0, despesas: 0 };
    map[mes][l.tipo === 'receita' ? 'receitas' : 'despesas'] += Number(l.valor);
  }
  return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes));
}

// Curva S: previsto (curva suave ao longo do prazo) x realizado (medido acumulado por mês)
export function curvaS(obra, medicoes, itens, hoje = new Date()) {
  const total = Number(obra.orcamento_total);
  if (!obra.data_inicio || !obra.data_prevista_fim || !total) return [];
  const meses = listarMeses(obra.data_inicio, obra.data_prevista_fim);
  const porMes = {};
  for (const m of medicoes) {
    const mes = (m.periodo_fim || m.periodo_inicio || '').slice(0, 7);
    if (!mes) continue;
    porMes[mes] = (porMes[mes] || 0) + itens.filter((i) => i.medicao_id === m.id).reduce((s, i) => s + valorMedido(i), 0);
  }
  const atual = dia(hoje).slice(0, 7);
  let acum = 0;
  return meses.map((mes, idx) => {
    const t = (idx + 1) / meses.length;
    acum += porMes[mes] || 0;
    return { mes, previsto: round2(total * (3 * t * t - 2 * t * t * t)), realizado: mes <= atual ? round2(acum) : null };
  });
}

export function alertas({ lancs = [], etapas = [], meds = [], pedidos = [], hoje = new Date() }) {
  const h = dia(hoje), lim = dia(new Date(hoje.getTime() + 7 * 864e5)), out = [];
  for (const l of lancs) {
    if (l.tipo !== 'despesa' || l.pagamento || !l.vencimento) continue;
    if (l.vencimento < h) out.push({ nivel: 'danger', texto: `Conta vencida: ${l.descricao}`, ref: 'financeiro' });
    else if (l.vencimento <= lim) out.push({ nivel: 'warn', texto: `Vence em até 7 dias: ${l.descricao}`, ref: 'financeiro' });
  }
  for (const e of etapas) {
    const d = desvioEtapa(e, hoje);
    if (e.percentual < 100 && d > 0) out.push({ nivel: 'danger', texto: `Etapa atrasada ${d} dias: ${e.nome}`, ref: 'cronograma' });
  }
  for (const m of meds) if (m.status === 'enviada') out.push({ nivel: 'warn', texto: `Medição ${m.numero} aguardando aprovação`, ref: 'medicoes' });
  for (const p of pedidos) if (p.status === 'aberto' && p.prazo_entrega && p.prazo_entrega < h) out.push({ nivel: 'danger', texto: `Entrega atrasada: ${p.descricao || 'pedido sem descrição'}`, ref: 'fornecedores' });
  return out.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'danger' ? -1 : 1));
}
