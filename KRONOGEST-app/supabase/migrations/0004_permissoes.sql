-- Funções de apoio não precisam ficar expostas à API pública (anon).
-- handle_new_user é só gatilho; empresa_atual/papel_atual são usadas pelas políticas (RLS) de quem está logado.
revoke execute on function handle_new_user() from public;
revoke execute on function empresa_atual() from public;
revoke execute on function papel_atual() from public;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on function handle_new_user() from %I', r);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    -- no Supabase o anon recebe EXECUTE direto (não só via PUBLIC): revogar de forma explícita
    revoke execute on function empresa_atual() from anon;
    revoke execute on function papel_atual() from anon;
  end if;
  foreach r in array array['authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant execute on function empresa_atual() to %I', r);
      execute format('grant execute on function papel_atual() to %I', r);
    end if;
  end loop;
end $$;
