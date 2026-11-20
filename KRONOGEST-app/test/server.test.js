const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server/index');

test('servidor: health, cálculo de medição, validação e front estático', async () => {
  const srv = createApp().listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    assert.deepEqual(await (await fetch(base + '/api/health')).json(), { ok: true, app: 'Prumo' });
    const r = await fetch(base + '/api/medicoes/calcular', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itens: [{ quantidade_contratada: 10, quantidade_acumulada: 5, quantidade_medida_periodo: 5, preco_unitario: 20 }] }),
    });
    const j = await r.json();
    assert.equal(j.percentual_fisico, 50);
    assert.equal(j.itens[0].valor_medido, 100);
    assert.equal((await fetch(base + '/api/medicoes/calcular', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 400);
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /Josefin\+Sans/);
    assert.match(html, /<title>Prumo<\/title>/);
  } finally { srv.close(); }
});
