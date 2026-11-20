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

describe('Prumo (modo demonstração)', () => {
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
    expect(screen.getByText('34,15%')).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-12-10' } });
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
