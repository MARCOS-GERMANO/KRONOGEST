import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Crud from '../components/Crud';
import { Btn, PageTitle } from '../components/ui';

const NOTAS = [1, 2, 3, 4, 5].map((n) => [String(n), String(n)]);
const media = (avs) => (avs.length ? (avs.reduce((s, a) => s + (a.prazo + a.qualidade + a.preco) / 3, 0) / avs.length).toFixed(1) : '—');

export default function Fornecedores() {
  const [aba, setAba] = useState('forn');
  const [avals, setAvals] = useState([]);
  useEffect(() => { supabase.from('avaliacoes_fornecedor').select('*').then(({ data }) => setAvals(data || [])); }, [aba]);
  const abas = [['forn', 'Fornecedores'], ['ped', 'Pedidos de compra'], ['av', 'Avaliações']];
  return (
    <>
      <PageTitle>Fornecedores</PageTitle>
      <div className="mb-4 flex gap-2">
        {abas.map(([k, l]) => <Btn key={k} kind={aba === k ? 'solid' : 'ghost'} onClick={() => setAba(k)}>{l}</Btn>)}
      </div>
      {aba === 'forn' && (
        <Crud table="fornecedores" title="Fornecedores" soft orderBy="razao_social"
          extraColumns={[{ label: 'Nota média', render: (f) => media(avals.filter((a) => a.fornecedor_id === f.id)), csv: (f) => media(avals.filter((a) => a.fornecedor_id === f.id)) }]}
          fields={[
            { key: 'razao_social', label: 'Razão social', required: true },
            { key: 'cnpj', label: 'CNPJ' },
            { key: 'contato', label: 'Contato' },
            { key: 'categoria', label: 'Categoria' },
          ]} />
      )}
      {aba === 'ped' && (
        <Crud table="pedidos_compra" title="Pedidos de compra" fields={[
          { key: 'obra_id', label: 'Obra', from: { table: 'obras', label: 'nome' }, required: true },
          { key: 'fornecedor_id', label: 'Fornecedor', from: { table: 'fornecedores', label: 'razao_social' }, required: true },
          { key: 'descricao', label: 'Descrição' },
          { key: 'valor', label: 'Valor', type: 'money', required: true },
          { key: 'prazo_entrega', label: 'Prazo de entrega', type: 'date' },
          { key: 'status', label: 'Status', options: [['aberto', 'Aberto'], ['entregue', 'Entregue'], ['cancelado', 'Cancelado']], required: true },
        ]} defaults={{ status: 'aberto' }} />
      )}
      {aba === 'av' && (
        <Crud table="avaliacoes_fornecedor" title="Avaliações (1 a 5)" onLoad={setAvals} fields={[
          { key: 'fornecedor_id', label: 'Fornecedor', from: { table: 'fornecedores', label: 'razao_social' }, required: true },
          { key: 'obra_id', label: 'Obra', from: { table: 'obras', label: 'nome' } },
          { key: 'prazo', label: 'Prazo', options: NOTAS, type: 'number', required: true },
          { key: 'qualidade', label: 'Qualidade', options: NOTAS, type: 'number', required: true },
          { key: 'preco', label: 'Preço', options: NOTAS, type: 'number', required: true },
        ]} />
      )}
    </>
  );
}
