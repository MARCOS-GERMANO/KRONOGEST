-- Prumo: schema inicial (medições, financeiro, fornecedores, cronograma)
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id),
  nome text,
  papel text not null default 'leitura'
    check (papel in ('admin','engenheiro','financeiro','compras','leitura')),
  created_at timestamptz not null default now()
);

create function empresa_atual() returns uuid
language sql stable security definer as
$$ select empresa_id from profiles where id = auth.uid() $$;

create function papel_atual() returns text
language sql stable security definer as
$$ select papel from profiles where id = auth.uid() $$;

create table obras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  nome text not null,
  cliente text,
  endereco text,
  status text not null default 'planejamento'
    check (status in ('planejamento','em_andamento','concluida','paralisada')),
  data_inicio date,
  data_prevista_fim date,
  orcamento_total numeric(14,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  razao_social text not null,
  cnpj text,
  contato text,
  categoria text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table avaliacoes_fornecedor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  fornecedor_id uuid not null references fornecedores(id),
  obra_id uuid references obras(id),
  prazo int not null check (prazo between 1 and 5),
  qualidade int not null check (qualidade between 1 and 5),
  preco int not null check (preco between 1 and 5),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table medicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  obra_id uuid not null references obras(id),
  numero int not null,
  periodo_inicio date,
  periodo_fim date,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aprovada')),
  observacao text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (obra_id, numero)
);

create table medicao_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  medicao_id uuid not null references medicoes(id) on delete cascade,
  descricao text not null,
  unidade text,
  quantidade_contratada numeric(14,3) not null check (quantidade_contratada >= 0),
  quantidade_medida_periodo numeric(14,3) not null default 0 check (quantidade_medida_periodo >= 0),
  quantidade_acumulada numeric(14,3) not null default 0 check (quantidade_acumulada >= 0),
  preco_unitario numeric(14,2) not null default 0
);

create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  obra_id uuid references obras(id),
  tipo text not null check (tipo in ('receita','despesa')),
  categoria text,
  descricao text not null,
  valor numeric(14,2) not null check (valor >= 0),
  vencimento date,
  pagamento date,
  fornecedor_id uuid references fornecedores(id),
  medicao_id uuid references medicoes(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  obra_id uuid not null references obras(id),
  fornecedor_id uuid not null references fornecedores(id),
  descricao text,
  valor numeric(14,2) not null check (valor >= 0),
  prazo_entrega date,
  status text not null default 'aberto' check (status in ('aberto','entregue','cancelado')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table etapas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  obra_id uuid not null references obras(id),
  nome text not null,
  inicio_previsto date,
  fim_previsto date,
  inicio_real date,
  fim_real date,
  percentual int not null default 0 check (percentual between 0 and 100),
  depende_de uuid references etapas(id),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- RLS: isolamento por empresa; escrita restrita por papel
do $$
declare t text;
begin
  foreach t in array array['obras','fornecedores','avaliacoes_fornecedor','medicoes',
    'medicao_itens','lancamentos','pedidos_compra','etapas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (empresa_id = empresa_atual())', t||'_sel', t);
    execute format('create policy %I on %I for all using (empresa_id = empresa_atual() and papel_atual() <> ''leitura'') with check (empresa_id = empresa_atual() and papel_atual() <> ''leitura'')', t||'_mod', t);
  end loop;
end $$;
alter table empresas enable row level security;
alter table profiles enable row level security;
create policy empresas_sel on empresas for select using (id = empresa_atual());
create policy profiles_sel on profiles for select using (empresa_id = empresa_atual());
