import React, { useEffect, useState } from 'react';
import { DEMO, supabase } from './lib/supabase';
import { ProfileCtx, montarPerfil } from './lib/profile';
import { Logo } from './components/Logo';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Painel from './pages/Painel';
import Obras from './pages/Obras';
import Medicoes from './pages/Medicoes';
import Financeiro from './pages/Financeiro';
import Fornecedores from './pages/Fornecedores';
import Cronograma from './pages/Cronograma';

const ICONES = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  painel: 'M3 20h18M6 20V10m6 10V4m6 16v-7',
  obras: 'M4 21V5l8-3 8 3v16M9 21v-6h6v6M8 9h2m4 0h2',
  medicoes: 'M3 17L17 3l4 4L7 21zM8 12l2 2m1-5l2 2m1-5l2 2',
  financeiro: 'M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.5 4 2.5 4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5',
  fornecedores: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  cronograma: 'M4 6h16v14H4zM4 10h16M8 3v4m8-4v4',
};
const Icone = ({ k }) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONES[k]} /></svg>;

const PAGES = [
  ['dashboard', 'Início', Dashboard, 'Início'], ['painel', 'Painel da obra', Painel, 'Painel'], ['obras', 'Obras', Obras, 'Obras'],
  ['medicoes', 'Medições', Medicoes, 'Medições'], ['financeiro', 'Financeiro', Financeiro, 'Caixa'],
  ['fornecedores', 'Fornecedores', Fornecedores, 'Compras'], ['cronograma', 'Cronograma', Cronograma, 'Prazos'],
];
const pageFromHash = () => (PAGES.find((p) => p[0] === window.location.hash.slice(1)) || PAGES[0])[0];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [empresa, setEmpresa] = useState('');
  const [page, setPage] = useState(pageFromHash());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const h = () => { setPage(pageFromHash()); window.scrollTo?.(0, 0); };
    window.addEventListener('hashchange', h);
    return () => { data.subscription.unsubscribe(); window.removeEventListener('hashchange', h); };
  }, []);

  useEffect(() => {
    if (!session) { setPerfil(null); return; }
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setPerfil(montarPerfil(data || { papel: 'leitura' })));
    supabase.from('empresas').select('*').single().then(({ data }) => setEmpresa(data?.nome || ''));
  }, [session]);

  if (session === undefined) return <p className="p-6 text-muted">Carregando…</p>;
  if (!session) return <Login />;
  if (!perfil) return <p className="p-6 text-muted">Carregando…</p>;

  const Page = PAGES.find((p) => p[0] === page)[2];
  return (
    <ProfileCtx.Provider value={perfil}>
      <div className="min-h-screen md:flex">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-surface p-4 md:block print:hidden">
          <Logo className="mb-8 text-lg" size={30} />
          <nav aria-label="Menu principal">
            {PAGES.map(([k, l]) => (
              <a key={k} href={`#${k}`} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 transition ${page === k ? 'bg-border text-silver' : 'text-muted hover:bg-surface-2 hover:text-text'}`}>
                <Icone k={k} />{l}
              </a>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 pb-24 md:pb-0">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 print:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
              <i className="h-2 w-2 shrink-0 rounded-full bg-ok" />
              <span className="truncate">{empresa || 'Empresa'} · {session.user.email} · {perfil.papel}{DEMO ? ' · demonstração' : ''}</span>
            </span>
            <button className="shrink-0 text-sm text-silver underline" onClick={() => supabase.auth.signOut()}>Sair</button>
          </header>
          <main className="p-4 md:p-8"><Page /></main>
        </div>
        <nav aria-label="Menu inferior" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {PAGES.map(([k, l, , curto]) => (
            <a key={k} href={`#${k}`} aria-label={l} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${page === k ? 'text-silver' : 'text-muted'}`}>
              <Icone k={k} />{curto}
            </a>
          ))}
        </nav>
      </div>
    </ProfileCtx.Provider>
  );
}
