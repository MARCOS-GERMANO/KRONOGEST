import React from 'react';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import App from '../App';
import Obras from '../pages/Obras';
import { ProfileCtx, montarPerfil } from '../lib/profile';

async function entrar() {
  const u = userEvent.setup();
  render(<App />);
  await u.type(await screen.findByLabelText('E-mail'), 'eng@construtora.com');
  await u.type(screen.getByLabelText('Senha'), 'segredo123');
  await u.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByRole('heading', { name: /dashboard/i });
  return u;
}
const ir = async (u, nome) => { await u.click(screen.getAllByRole('link', { name: nome })[0]); };

describe('Kronogeste (modo demonstração)', () => {
  test('login valida campos e entra no dashboard com indicadores', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(await screen.findByLabelText('E-mail'), 'sem-arroba');
    await u.type(screen.getByLabelText('Senha'), '123');
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('e-mail válido');
    cleanup();
    await entrar();
    expect(screen.getByText('Obras ativas')).toBeInTheDocument();
    expect(screen.getAllByText('34,15%').length).toBeGreaterThan(0);
    expect(screen.getByText('Contas vencidas').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Etapas atrasadas').nextSibling).toHaveTextContent('1');
  });

  test('obras: cria uma obra e valida datas', async () => {
    const u = await entrar();
    await ir(u, 'Obras');
    await screen.findByText('Edifício Aurora');
    await u.click(screen.getByRole('button', { name: 'Novo' }));
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nome');
    await u.type(screen.getByLabelText(/Nome/), 'Residencial Horizonte');
    await u.selectOptions(screen.getByLabelText(/Status/), 'em_andamento');
    fireEvent.change(screen.getByLabelText('Início', { selector: 'input' }), { target: { value: '2026-12-10' } });
    fireEvent.change(screen.getByLabelText('Previsão de término'), { target: { value: '2026-12-01' } });
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('anterior ao início');
    fireEvent.change(screen.getByLabelText('Previsão de término'), { target: { value: '2027-06-01' } });
    await u.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Residencial Horizonte')).toBeInTheDocument();
  });

  test('financeiro: resumo e selo ATRASADO', async () => {
    const u = await entrar();
    await ir(u, 'Financeiro');
    expect(await screen.findByText('Concreto usinado')).toBeInTheDocument();
    expect(screen.getAllByText('ATRASADO')).toHaveLength(1);
    expect(screen.getByText('Saldo').nextSibling.textContent).toMatch(/122\.999,00|123\.000,00/);
  });

  test('medições: totais, bloqueio de excesso e novo item', async () => {
    const u = await entrar();
    await ir(u, 'Medições');
    expect(await screen.findByText('Fundação')).toBeInTheDocument();
    expect(screen.getByText('34,15%')).toBeInTheDocument();
    await u.type(screen.getByLabelText('Descrição do item'), 'Fundação');
    await u.type(screen.getByLabelText('Qtd. contratada'), '200');
    await u.type(screen.getByLabelText('Qtd. medida'), '250');
    await u.type(screen.getByLabelText('Preço unitário'), '850');
    await u.click(screen.getByRole('button', { name: 'Adicionar item' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ultrapassa');
    await u.clear(screen.getByLabelText('Descrição do item'));
    await u.type(screen.getByLabelText('Descrição do item'), 'Pintura');
    await u.clear(screen.getByLabelText('Qtd. contratada')); await u.type(screen.getByLabelText('Qtd. contratada'), '100');
    await u.clear(screen.getByLabelText('Qtd. medida')); await u.type(screen.getByLabelText('Qtd. medida'), '10');
    await u.clear(screen.getByLabelText('Preço unitário')); await u.type(screen.getByLabelText('Preço unitário'), '50');
    await u.click(screen.getByRole('button', { name: 'Adicionar item' }));
    expect(await screen.findByText('Pintura')).toBeInTheDocument();
    expect(screen.getByText('Valor medido no período').nextSibling.textContent).toMatch(/222\.500,00/);
  });

  test('medições: fluxo enviar → aprovar → lançar receita', async () => {
    const u = await entrar();
    await ir(u, 'Medições');
    await screen.findByText('Fundação');
    await u.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByRole('button', { name: /Lançar receita/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar item' })).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Lançar receita/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Receita lançada');
    await ir(u, 'Financeiro');
    expect(await screen.findAllByText('Medição 1')).toHaveLength(2);
  });

  test('cronograma: atraso por etapa e planejamento reverso', async () => {
    const u = await entrar();
    await ir(u, 'Cronograma');
    expect(await screen.findByText(/7 dias de atraso/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Data final da obra'), { target: { value: '2026-12-31' } });
    await u.click(screen.getByRole('button', { name: 'Calcular datas' }));
    expect(await screen.findByText(/16\/11\/2026 → 31\/12\/2026/)).toBeInTheDocument();
  });

  test('fornecedores: nota média e abas', async () => {
    const u = await entrar();
    await ir(u, 'Fornecedores');
    const linha = (await screen.findByText('Concreto Forte Ltda')).closest('tr');
    await waitFor(() => expect(within(linha).getByText('4.3')).toBeInTheDocument());
    await u.click(screen.getByRole('button', { name: 'Pedidos de compra' }));
    expect(await screen.findByText('Nenhum registro.')).toBeInTheDocument();
  });

  test('papel leitura não vê botões de escrita', async () => {
    render(<ProfileCtx.Provider value={montarPerfil({ papel: 'leitura' })}><Obras /></ProfileCtx.Provider>);
    expect(await screen.findByText('Edifício Aurora')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo' })).not.toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });
});

describe('Kronogeste (novidades)', () => {
  test('marca: usa Kronogeste e não Prumo', async () => {
    await entrar();
    expect(screen.getAllByText('Kronogeste').length).toBeGreaterThan(0);
    expect(screen.queryByText(/prumo/i)).not.toBeInTheDocument();
  });

  test('dashboard: alertas priorizados e gráficos', async () => {
    await entrar();
    expect(await screen.findByText('Conta vencida: Concreto usinado')).toBeInTheDocument();
    expect(screen.getByText(/Etapa atrasada 7 dias: Estrutura/)).toBeInTheDocument();
    expect(screen.getByText('Medição 1 aguardando aprovação')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Fluxo de caixa mensal' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Despesas por categoria' })).toBeInTheDocument();
  });

  test('painel da obra: indicadores, curva S, cronograma e envio de foto', async () => {
    const u = await entrar();
    await ir(u, 'Painel da obra');
    expect(await screen.findByRole('img', { name: 'Curva S' })).toBeInTheDocument();
    expect(screen.getByText('% físico').nextSibling).toHaveTextContent('34,15%');
    expect(screen.getByText('Estrutura')).toBeInTheDocument();
    expect(screen.getByText(/7 dias de atraso/)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Legenda'), 'Concretagem da laje');
    await u.upload(screen.getByLabelText('Foto'), new File(['x'], 'laje.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByAltText('Concretagem da laje')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Foto enviada');
  });

  test('listagens: ordenação e busca', async () => {
    const u = await entrar();
    await ir(u, 'Obras');
    await screen.findByText('Edifício Aurora');
    const nomes = () => screen.getAllByRole('row').slice(1).map((r) => r.textContent);
    await u.click(screen.getByRole('columnheader', { name: /Nome/ }));
    expect(nomes()[0]).toMatch(/Edifício Aurora/);
    await u.click(screen.getByRole('columnheader', { name: /Nome/ }));
    expect(nomes()[0]).toMatch(/Galpão/);
    await u.type(screen.getByLabelText('Buscar'), 'galp');
    expect(screen.queryByText('Edifício Aurora')).not.toBeInTheDocument();
    expect(screen.getByText('1 registro(s)')).toBeInTheDocument();
  });
});
