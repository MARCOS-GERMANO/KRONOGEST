import { describe, expect, test } from 'vitest';
import { alertas, curvaS, fluxoMensal, listarMeses, mesCurto } from '../lib/calc';

describe('calc (front)', () => {
  test('listarMeses e mesCurto', () => {
    expect(listarMeses('2026-11-15', '2027-02-01')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(mesCurto('2026-11')).toBe('11/26');
  });
  test('fluxoMensal usa a data de pagamento quando existe', () => {
    const f = fluxoMensal([
      { tipo: 'receita', valor: 100, vencimento: '2026-01-10' },
      { tipo: 'despesa', valor: 30, vencimento: '2026-01-20', pagamento: '2026-02-02' },
      { tipo: 'despesa', valor: 5 },
    ]);
    expect(f).toEqual([{ mes: '2026-01', receitas: 100, despesas: 0 }, { mes: '2026-02', receitas: 0, despesas: 30 }]);
  });
  test('curvaS: previsto cresce até o orçamento e realizado para no mês atual', () => {
    const obra = { data_inicio: '2026-01-10', data_prevista_fim: '2026-04-20', orcamento_total: 1000 };
    const c = curvaS(obra, [{ id: 'm1', periodo_fim: '2026-02-28' }], [{ medicao_id: 'm1', quantidade_medida_periodo: 10, preco_unitario: 5 }], new Date('2026-03-15'));
    expect(c.map((p) => p.mes)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
    expect(c[3].previsto).toBe(1000);
    expect(c.every((p, i) => i === 0 || p.previsto > c[i - 1].previsto)).toBe(true);
    expect(c.map((p) => p.realizado)).toEqual([0, 50, 50, null]);
    expect(curvaS({ orcamento_total: 0 }, [], [])).toEqual([]);
  });
  test('alertas: vencidas e atrasos primeiro, depois avisos', () => {
    const a = alertas({
      hoje: new Date('2026-11-20'),
      lancs: [{ tipo: 'despesa', descricao: 'Aço', vencimento: '2026-11-25' }, { tipo: 'despesa', descricao: 'Cimento', vencimento: '2026-11-01' }, { tipo: 'despesa', descricao: 'Pago', vencimento: '2026-11-01', pagamento: '2026-11-02' }],
      meds: [{ numero: 2, status: 'enviada' }],
      pedidos: [{ status: 'aberto', descricao: 'Areia', prazo_entrega: '2026-11-10' }],
    });
    expect(a.map((x) => x.texto)).toEqual(['Conta vencida: Cimento', 'Entrega atrasada: Areia', 'Vence em até 7 dias: Aço', 'Medição 2 aguardando aprovação']);
  });
});
