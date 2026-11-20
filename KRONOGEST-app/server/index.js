const express = require('express');
const path = require('path');
const calc = require('./lib/calc');

function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Prumo' }));
  app.post('/api/medicoes/calcular', (req, res) => {
    const itens = Array.isArray(req.body.itens) ? req.body.itens : null;
    if (!itens) return res.status(400).json({ erro: 'Informe a lista de itens.' });
    res.json({
      itens: itens.map((i) => ({ ...i, valor_medido: calc.valorMedido(i) })),
      percentual_fisico: calc.percentualFisico(itens),
    });
  });
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  return app;
}
module.exports = { createApp };
if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => console.log(`Prumo rodando na porta ${port}`));
}
