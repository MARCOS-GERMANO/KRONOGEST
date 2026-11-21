import React, { useState } from 'react';
import { DEMO, supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { Btn, inputCls } from '../components/ui';

export default function Login() {
  const [modo, setModo] = useState('entrar');
  const [f, setF] = useState({ email: '', senha: '', nome: '', empresa: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setMsg('');
    if (!f.email.includes('@')) return setMsg('Informe um e-mail válido.');
    if (f.senha.length < 6) return setMsg('A senha deve ter ao menos 6 caracteres.');
    setBusy(true);
    const r = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email: f.email, password: f.senha })
      : await supabase.auth.signUp({ email: f.email, password: f.senha, options: { data: { nome: f.nome, empresa_nome: f.empresa || 'Minha empresa' } } });
    setBusy(false);
    if (r.error) return setMsg(r.error.message);
    if (modo === 'criar' && !r.data?.session) setMsg('Conta criada. Confirme o e-mail e depois entre.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form noValidate onSubmit={enviar} className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h1 className="mb-1 flex justify-center text-2xl"><Logo size={44} /></h1>
        <p className="mb-6 text-center text-sm text-muted">Prazo, custo e medição da obra no mesmo lugar</p>
        {DEMO && <p className="mb-4 rounded bg-border p-2 text-center text-xs">Modo demonstração: qualquer e-mail e senha (6+ caracteres) entram.</p>}
        {modo === 'criar' && <>
          <label htmlFor="lg-nome" className="mb-1 block text-sm text-muted">Seu nome</label>
          <input id="lg-nome" className={`${inputCls} mb-3`} value={f.nome} onChange={set('nome')} />
          <label htmlFor="lg-emp" className="mb-1 block text-sm text-muted">Nome da empresa</label>
          <input id="lg-emp" className={`${inputCls} mb-3`} value={f.empresa} onChange={set('empresa')} />
        </>}
        <label htmlFor="lg-email" className="mb-1 block text-sm text-muted">E-mail</label>
        <input id="lg-email" type="email" className={`${inputCls} mb-3`} value={f.email} onChange={set('email')} />
        <label htmlFor="lg-senha" className="mb-1 block text-sm text-muted">Senha</label>
        <input id="lg-senha" type="password" className={`${inputCls} mb-4`} value={f.senha} onChange={set('senha')} />
        {msg && <p role="alert" className="mb-3 text-sm text-danger">{msg}</p>}
        <Btn type="submit" disabled={busy} className="w-full">{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</Btn>
        <button type="button" className="mt-4 w-full text-sm text-muted underline" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setMsg(''); }}>
          {modo === 'entrar' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  );
}
