-- Convites: só o admin da empresa cria; o gatilho de cadastro consulta esta tabela.
-- NUNCA confiar em raw_user_meta_data para empresa/papel: o próprio usuário preenche esse campo no cadastro.
create table convites (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  email text not null,
  papel text not null default 'leitura'
    check (papel in ('admin','engenheiro','financeiro','compras','leitura')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (empresa_id, email)
);
alter table convites enable row level security;
create policy convites_admin on convites for all
  using (empresa_id = empresa_atual() and papel_atual() = 'admin')
  with check (empresa_id = empresa_atual() and papel_atual() = 'admin');

-- Primeiro acesso: com convite para o e-mail, entra na empresa com o papel convidado;
-- sem convite, cria a própria empresa e vira admin.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare conv convites%rowtype; emp uuid;
begin
  select * into conv from convites where lower(email) = lower(new.email) order by created_at limit 1;
  if found then
    insert into profiles (id, empresa_id, nome, papel)
      values (new.id, conv.empresa_id, new.raw_user_meta_data->>'nome', conv.papel);
    delete from convites where id = conv.id;
  else
    insert into empresas (nome)
      values (coalesce(nullif(new.raw_user_meta_data->>'empresa_nome', ''), 'Minha empresa'))
      returning id into emp;
    insert into profiles (id, empresa_id, nome, papel)
      values (new.id, emp, new.raw_user_meta_data->>'nome', 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
