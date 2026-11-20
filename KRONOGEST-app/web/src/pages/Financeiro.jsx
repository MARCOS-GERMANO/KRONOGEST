import React, { useState } from 'react';
import Crud from '../components/Crud';
import { Badge, Card, PageTitle } from '../components/ui';
import { brl } from '../lib/format';
import { statusLancamento } from '../lib/calc';

const CATEGORIAS = ['mão de obra', 'material', 'equipamento', 'subempreitada', 'impostos', 'administrativo', 'medição'].map((c) => [c, c]);

export default function Financeiro() {
  const [rows, setRows] = useState([]);
  const rec = rows.filter((r) => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0);
  const desp = rows.filter((r) => r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor), 0);
  const venc = rows.filter((r) => r.tipo === 'despesa' && statusLancamento(r) === 'atrasado').length;
  const tone = { pago: 'ok', atrasado: 'danger', previsto: 'muted' };
  return (
    <>
      <PageTitle>Financeiro</PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card title="Receitas" value={brl(rec)} />
        <Card title="Despesas" value={brl(desp)} />
        <Card title="Saldo" value={brl(rec - desp)} tone={rec - desp >= 0 ? 'ok' : 'danger'} />
        <Card title="Contas vencidas" value={venc} tone={venc ? 'danger' : undefined} />
      </div>
      <Crud table="lancamentos" title="Lançamentos" soft orderBy="vencimento" onLoad={setRows}
        extraColumns={[{ label: 'Situação', csv: (l) => statusLancamento(l), render: (l) => { const s = statusLancamento(l); return <Badge tone={tone[s]}>{s === 'atrasado' ? 'ATRASADO' : s}</Badge>; } }]}
        fields={[
          { key: 'tipo', label: 'Tipo', options: [['receita', 'Receita'], ['despesa', 'Despesa']], required: true },
          { key: 'descricao', label: 'Descrição', required: true },
          { key: 'categoria', label: 'Categoria', options: CATEGORIAS },
          { key: 'valor', label: 'Valor', type: 'money', required: true },
          { key: 'vencimento', label: 'Vencimento', type: 'date' },
          { key: 'pagamento', label: 'Pagamento', type: 'date' },
          { key: 'obra_id', label: 'Obra', from: { table: 'obras', label: 'nome' } },
          { key: 'fornecedor_id', label: 'Fornecedor', from: { table: 'fornecedores', label: 'razao_social' }, list: false },
        ]}
        validate={(p) => (p.valor < 0 ? 'O valor não pode ser negativo.' : '')} />
    </>
  );
}
