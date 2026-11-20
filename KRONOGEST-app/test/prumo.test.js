const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const c = require('../server/lib/calc');

test('valor medido = quantidade x preço', () => {
  assert.equal(c.valorMedido({ quantidade_medida_periodo: 12.5, preco_unitario: 80.1 }), 1001.25);
});

test('percentual físico acumulado ponderado por valor', () => {
  const itens = [
    { quantidade_contratada: 100, quantidade_acumulada: 50, preco_unitario: 10 },
    { quantidade_contratada: 10, quantidade_acumulada: 10, preco_unitario: 100 },
  ];
  assert.equal(c.percentualFisico(itens), 75);
  assert.equal(c.percentualFisico([]), 0);
});

test('status do lançamento: pago, atrasado, previsto', () => {
  const hoje = new Date('2026-11-20');
  assert.equal(c.statusLancamento({ pagamento: '2026-11-01', vencimento: '2026-10-01' }, hoje), 'pago');
  assert.equal(c.statusLancamento({ vencimento: '2026-11-19' }, hoje), 'atrasado');
  assert.equal(c.statusLancamento({ vencimento: '2026-11-20' }, hoje), 'previsto');
});

test('desvio de etapa em dias', () => {
  const hoje = new Date('2026-11-20');
  assert.equal(c.desvioEtapa({ fim_previsto: '2026-11-10' }, hoje), 10);
  assert.equal(c.desvioEtapa({ fim_previsto: '2026-11-10', fim_real: '2026-11-08' }, hoje), 0);
});

test('nota média do fornecedor', () => {
  assert.equal(c.notaMedia([]), null);
  assert.equal(c.notaMedia([{ prazo: 5, qualidade: 4, preco: 3 }, { prazo: 3, qualidade: 3, preco: 3 }]), 3.5);
});

test('planejamento reverso encadeia etapas a partir da data final', () => {
  const r = c.planejamentoReverso('2026-12-31', [{ nome: 'A', dias: 10 }, { nome: 'B', dias: 20 }]);
  assert.equal(r[1].fim, '2026-12-31');
  assert.equal(r[1].inicio, '2026-12-11');
  assert.equal(r[0].fim, '2026-12-11');
  assert.equal(r[0].inicio, '2026-12-01');
});

test('resumo financeiro', () => {
  const r = c.resumoFinanceiro([
    { tipo: 'receita', valor: 1000 },
    { tipo: 'despesa', valor: 300.5, vencimento: '2026-01-01' },
    { tipo: 'despesa', valor: 99.5, pagamento: '2026-01-02', vencimento: '2026-01-01' },
    { tipo: 'despesa', valor: 500, ativo: false },
  ], new Date('2026-11-20'));
  assert.deepEqual(r, { receitas: 1000, despesas: 400, vencidas: 1, saldo: 600 });
});

test('schema + RLS no Postgres (PGlite): isolamento por empresa e papel leitura', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create role app_user;
  `);
  await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/0001_init.sql'), 'utf8'));
  await db.exec(`grant usage on schema public, auth to app_user;
                 grant all on all tables in schema public to app_user;
                 grant execute on all functions in schema public to app_user;
                 grant execute on all functions in schema auth to app_user;`);

  const A = '11111111-1111-1111-1111-111111111111';
  const B = '22222222-2222-2222-2222-222222222222';
  const uEng = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const uLeit = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const uOut = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  await db.exec(`
    insert into empresas (id, nome) values ('${A}','Construtora A'), ('${B}','Construtora B');
    insert into auth.users (id) values ('${uEng}'), ('${uLeit}'), ('${uOut}');
    insert into profiles (id, empresa_id, papel) values
      ('${uEng}','${A}','engenheiro'), ('${uLeit}','${A}','leitura'), ('${uOut}','${B}','engenheiro');
  `);

  const as = async (uid, sql) => {
    await db.exec(`set role app_user; select set_config('app.uid','${uid}',false);`);
    try { return await db.query(sql); } finally { await db.exec('reset role'); }
  };

  // engenheiro cria obra (empresa_id vem do default)
  await as(uEng, `insert into obras (nome, orcamento_total) values ('Obra 1', 1500000.50)`);
  const eng = await as(uEng, 'select nome, empresa_id from obras');
  assert.equal(eng.rows.length, 1);
  assert.equal(eng.rows[0].empresa_id, A);

  // outra empresa não enxerga
  const outra = await as(uOut, 'select * from obras');
  assert.equal(outra.rows.length, 0);

  // leitura vê, mas não escreve
  const leit = await as(uLeit, 'select * from obras');
  assert.equal(leit.rows.length, 1);
  await assert.rejects(() => as(uLeit, `insert into obras (nome) values ('Proibida')`));

  // constraints: nota fora do intervalo e valor negativo
  await as(uEng, `insert into fornecedores (razao_social) values ('Forn X')`);
  await assert.rejects(() => as(uEng, `insert into avaliacoes_fornecedor (fornecedor_id, prazo, qualidade, preco)
    select id, 6, 3, 3 from fornecedores`));
  await assert.rejects(() => as(uEng, `insert into lancamentos (tipo, descricao, valor) values ('despesa','x',-1)`));

  // outra empresa não pode inserir em empresa alheia
  await assert.rejects(() => as(uOut, `insert into obras (empresa_id, nome) values ('${A}','Invasora')`));
});

test('cadastro (0002): primeiro usuário cria empresa e vira admin; convidado entra na empresa com o papel', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  `);
  for (const f of ['0001_init.sql', '0002_signup.sql']) await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', f), 'utf8'));

  const admin = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await db.exec(`insert into auth.users (id, raw_user_meta_data) values ('${admin}', '{"nome":"Ana","empresa_nome":"Construtora Z"}')`);
  let p = await db.query(`select p.papel, e.nome as empresa, e.id as empresa_id from profiles p join empresas e on e.id = p.empresa_id where p.id = '${admin}'`);
  assert.equal(p.rows[0].papel, 'admin');
  assert.equal(p.rows[0].empresa, 'Construtora Z');

  const conv = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  await db.exec(`insert into auth.users (id, raw_user_meta_data) values ('${conv}', '{"empresa_id":"${p.rows[0].empresa_id}","papel":"financeiro"}')`);
  p = await db.query(`select papel, empresa_id from profiles where id = '${conv}'`);
  assert.equal(p.rows[0].papel, 'financeiro');
  assert.equal((await db.query('select count(*)::int as n from empresas')).rows[0].n, 1);
});
