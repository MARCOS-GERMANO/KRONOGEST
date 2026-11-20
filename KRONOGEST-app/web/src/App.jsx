import React, { useEffect, useState } from 'react';
import { DEMO, supabase } from './lib/supabase';
import { ProfileCtx, montarPerfil } from './lib/profile';
import { APP_NAME } from './config';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Obras from './pages/Obras';
import Medicoes from './pages/Medicoes';
import Financeiro from './pages/Financeiro';
import Fornecedores from './pages/Fornecedores';
import Cronograma from './pages/Cronograma';

const PAGES = [
  ['dashboard', 'Início', Dashboard], ['obras', 'Obras', Obras], ['medicoes', 'Medições', Medicoes],
  ['financeiro', 'Financeiro', Financeiro], ['fornecedores', 'Fornecedores', Fornecedores], ['cronograma', 'Cronograma', Cronograma],
];
const pageFromHash = () => (PAGES.find((p) => p[0] === window.location.hash.slice(1)) || PAGES[0])[0];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [page, setPage] = useState(pageFromHash());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const h = () => setPage(pageFromHash());
    window.addEventListener('hashchange', h);
    return () => { data.subscription.unsubscribe(); window.removeEventListener('hashchange', h); };
  }, []);

  useEffect(() => {
    if (!session) return setPerfil(null);
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setPerfil(montarPerfil(data || { papel: 'leitura' })));
  }, [session]);

  if (session === undefined) return <p className="p-6 text-muted">Carregando…</p>;
  if (!session) return <Login />;
  if (!perfil) return <p className="p-6 text-muted">Carregando…</p>;

  const Page = PAGES.find((p) => p[0] === page)[2];
  return (
    <ProfileCtx.Provider value={perfil}>
      <div className="min-h-screen md:flex">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-surface p-4 md:block print:hidden">
          <div className="mb-6 text-xl font-bold uppercase tracking-widest text-silver">{APP_NAME}</div>
          <nav aria-label="Menu principal">
            {PAGES.map(([k, l]) => <a key={k} href={`#${k}`} className={`mb-1 block rounded-lg px-3 py-2 ${page === k ? 'bg-border text-silver' : 'text-muted hover:text-text'}`}>{l}</a>)}
          </nav>
        </aside>
        <div className="flex-1 pb-20 md:pb-0">
          <header className="flex items-center justify-between border-b border-border p-3 print:hidden">
            <span className="text-sm text-muted">{session.user.email} · {perfil.papel}{DEMO ? ' · demonstração' : ''}</span>
            <button className="text-sm text-silver underline" onClick={() => supabase.auth.signOut()}>Sair</button>
          </header>
          <main className="p-4 md:p-8"><Page /></main>
        </div>
        <nav aria-label="Menu inferior" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden print:hidden">
          {PAGES.map(([k, l]) => <a key={k} href={`#${k}`} className={`flex-1 py-3 text-center text-[11px] ${page === k ? 'text-silver' : 'text-muted'}`}>{l}</a>)}
        </nav>
      </div>
    </ProfileCtx.Provider>
  );
}
