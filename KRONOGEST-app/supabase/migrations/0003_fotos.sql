-- Fotos da obra: tabela + bucket privado; arquivos ficam em <empresa_id>/<obra_id>/<arquivo>
create table fotos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default empresa_atual() references empresas(id),
  obra_id uuid not null references obras(id),
  medicao_id uuid references medicoes(id),
  caminho text not null,
  legenda text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
alter table fotos enable row level security;
create policy fotos_sel on fotos for select using (empresa_id = empresa_atual());
create policy fotos_mod on fotos for all
  using (empresa_id = empresa_atual() and papel_atual() <> 'leitura')
  with check (empresa_id = empresa_atual() and papel_atual() <> 'leitura');

insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict (id) do nothing;
create policy fotos_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = empresa_atual()::text);
create policy fotos_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = empresa_atual()::text and papel_atual() <> 'leitura');
create policy fotos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = empresa_atual()::text and papel_atual() <> 'leitura');
