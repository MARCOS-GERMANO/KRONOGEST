import React from 'react';
import Crud from '../components/Crud';
import { PageTitle } from '../components/ui';

export const STATUS_OBRA = [['planejamento', 'Planejamento'], ['em_andamento', 'Em andamento'], ['concluida', 'Concluída'], ['paralisada', 'Paralisada']];

export default function Obras() {
  return (
    <>
      <PageTitle>Obras</PageTitle>
      <Crud table="obras" title="Obras" soft fields={[
        { key: 'nome', label: 'Nome', required: true },
        { key: 'cliente', label: 'Cliente' },
        { key: 'endereco', label: 'Endereço', list: false },
        { key: 'status', label: 'Status', options: STATUS_OBRA, required: true },
        { key: 'data_inicio', label: 'Início', type: 'date' },
        { key: 'data_prevista_fim', label: 'Previsão de término', type: 'date' },
        { key: 'orcamento_total', label: 'Orçamento', type: 'money' },
      ]} defaults={{ status: 'planejamento' }}
        validate={(p) => (p.data_inicio && p.data_prevista_fim && p.data_prevista_fim < p.data_inicio ? 'A previsão de término não pode ser anterior ao início.' : '')} />
    </>
  );
}
