-- Primeiro acesso: cada novo usuário cria sua empresa e vira admin,
-- a menos que o convite informe empresa_id (e papel) em raw_user_meta_data.
create function handle_new_user() returns trigger
language plpgsql security definer as $$
declare emp uuid;
begin
  emp := nullif(new.raw_user_meta_data->>'empresa_id', '')::uuid;
  if emp is null then
    insert into empresas (nome) values (coalesce(new.raw_user_meta_data->>'empresa_nome', 'Minha empresa'))
      returning id into emp;
    insert into profiles (id, empresa_id, nome, papel)
      values (new.id, emp, new.raw_user_meta_data->>'nome', 'admin');
  else
    insert into profiles (id, empresa_id, nome, papel)
      values (new.id, emp, new.raw_user_meta_data->>'nome', coalesce(new.raw_user_meta_data->>'papel', 'leitura'));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
