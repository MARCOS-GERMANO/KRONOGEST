import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const DEMO = !(url && key);

const uid = () => (globalThis.crypto?.randomUUID?.() ?? 'id-' + Math.random().toString(36).slice(2));
const hoje = new Date();
const off = (d) => { const x = new Date(hoje); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

function seed() {
  const E = 'demo-empresa';
  const o1 = uid(), o2 = uid(), f1 = uid(), f2 = uid(), m1 = uid();
  const base = (r) => ({ id: uid(), empresa_id: E, ativo: true, created_at: new Date().toISOString(), ...r });
  return {
    profiles: [{ id: 'demo-user', empresa_id: E, nome: 'Usuário Demo', papel: 'admin' }],
    obras: [
      base({ id: o1, nome: 'Edifício Aurora', cliente: 'Incorporadora Alfa', status: 'em_andamento', data_inicio: off(-90), data_prevista_fim: off(120), orcamento_total: 4500000 }),
      base({ id: o2, nome: 'Galpão Logístico Sul', cliente: 'Beta Logística', status: 'planejamento', data_inicio: off(10), data_prevista_fim: off(200), orcamento_total: 2300000 }),
    ],
    fornecedores: [
      base({ id: f1, razao_social: 'Concreto Forte Ltda', cnpj: '00.000.000/0001-00', contato: '(85) 90000-0000', categoria: 'Concreto' }),
      base({ id: f2, razao_social: 'Aço Brasil Comércio', cnpj: '11.111.111/0001-11', contato: '(85) 91111-1111', categoria: 'Aço' }),
    ],
    avaliacoes_fornecedor: [base({ fornecedor_id: f1, obra_id: o1, prazo: 5, qualidade: 4, preco: 4 }), base({ fornecedor_id: f2, obra_id: o1, prazo: 3, qualidade: 4, preco: 3 })],
    medicoes: [base({ id: m1, obra_id: o1, numero: 1, periodo_inicio: off(-30), periodo_fim: off(-1), status: 'enviada' })],
    medicao_itens: [
      base({ medicao_id: m1, descricao: 'Fundação', unidade: 'm³', quantidade_contratada: 200, quantidade_medida_periodo: 120, quantidade_acumulada: 120, preco_unitario: 850 }),
      base({ medicao_id: m1, descricao: 'Estrutura', unidade: 'm³', quantidade_contratada: 400, quantidade_medida_periodo: 100, quantidade_acumulada: 100, preco_unitario: 1200 }),
    ],
    lancamentos: [
      base({ obra_id: o1, tipo: 'receita', categoria: 'medição', descricao: 'Medição 1', valor: 222000, vencimento: off(15) }),
      base({ obra_id: o1, tipo: 'despesa', categoria: 'material', descricao: 'Concreto usinado', valor: 58000, vencimento: off(-5), fornecedor_id: f1 }),
      base({ obra_id: o1, tipo: 'despesa', categoria: 'mão de obra', descricao: 'Folha quinzenal', valor: 41000, vencimento: off(-20), pagamento: off(-19) }),
    ],
    pedidos_compra: [],
    etapas: [
      base({ obra_id: o1, nome: 'Fundação', inicio_previsto: off(-90), fim_previsto: off(-40), fim_real: off(-38), percentual: 100 }),
      base({ obra_id: o1, nome: 'Estrutura', inicio_previsto: off(-40), fim_previsto: off(-7), percentual: 60 }),
      base({ obra_id: o1, nome: 'Alvenaria', inicio_previsto: off(-7), fim_previsto: off(40), percentual: 5 }),
    ],
  };
}

function createDemoClient() {
  let db = seed();
  let session = null;
  const listeners = new Set();
  const notify = (ev) => listeners.forEach((fn) => fn(ev, session));
  const from = (table) => {
    let op = 'select', payload = null, filters = [], order = null, one = false;
    const run = () => {
      const rows = (db[table] ||= []);
      const match = (r) => filters.every(([c, v]) => r[c] === v);
      if (op === 'insert') {
        const novos = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ id: uid(), empresa_id: 'demo-empresa', ativo: true, created_at: new Date().toISOString(), ...p }));
        rows.push(...novos); return { data: one ? novos[0] : novos, error: null };
      }
      if (op === 'update') { const alvo = rows.filter(match); alvo.forEach((r) => Object.assign(r, payload)); return { data: alvo, error: null }; }
      if (op === 'delete') { db[table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
      let out = rows.filter(match);
      if (order) out = [...out].sort((a, b) => (a[order[0]] > b[order[0]] ? 1 : a[order[0]] < b[order[0]] ? -1 : 0) * (order[1] ? 1 : -1));
      return { data: one ? out[0] ?? null : out, error: null };
    };
    const b = {
      select() { return b; }, insert(p) { op = 'insert'; payload = p; return b; }, update(p) { op = 'update'; payload = p; return b; },
      delete() { op = 'delete'; return b; }, eq(c, v) { filters.push([c, v]); return b; },
      order(c, o) { order = [c, o?.ascending !== false]; return b; }, single() { one = true; return b; }, maybeSingle() { one = true; return b; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return b;
  };
  return {
    __reset() { db = seed(); session = null; },
    from,
    auth: {
      getSession: async () => ({ data: { session } }),
      signInWithPassword: async ({ email }) => { session = { user: { id: 'demo-user', email } }; notify('SIGNED_IN'); return { data: { session }, error: null }; },
      signUp: async ({ email }) => { session = { user: { id: 'demo-user', email } }; notify('SIGNED_IN'); return { data: { session }, error: null }; },
      signOut: async () => { session = null; notify('SIGNED_OUT'); return { error: null }; },
      onAuthStateChange: (fn) => { listeners.add(fn); return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } }; },
    },
  };
}

export const supabase = DEMO ? createDemoClient() : createClient(url, key);
