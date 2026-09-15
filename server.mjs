// server.mjs
import express from 'express';
import cors from 'cors';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8000;
const dbPath = join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const forbidden = ['/server.mjs', '/db.json'];
  if (forbidden.includes(req.path)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
});
app.use(express.static(join(__dirname), { index: false }));

async function readDb() {
  try {
    const content = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initial = {
        clientes: [],
        produtos: [],
        pedidos: [],
        leads: [],
        settings: {
          companyName: 'Açaí Prime',
          companyPhone: '',
          companyAddress: '',
          apiBaseUrl: '',
          whatsapp: {
            connected: false,
            number: '',
            token: '',
            welcomeMessage: ''
          }
        },
        iaResponses: [],
        accessLogs: [],
        whatsappMessages: []
      };
      await writeDb(initial);
      return initial;
    }
    throw error;
  }
}

async function writeDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function findById(list, id) {
  return list.find(item => String(item.id) === String(id));
}

function removeById(list, id) {
  return list.filter(item => String(item.id) !== String(id));
}

app.get('/api/status', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/clients', async (req, res) => {
  const db = await readDb();
  res.json(db.clientes || []);
});

app.post('/api/clients', async (req, res) => {
  const db = await readDb();
  const client = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...req.body
  };
  db.clientes.push(client);
  await writeDb(db);
  res.status(201).json(client);
});

app.put('/api/clients/:id', async (req, res) => {
  const db = await readDb();
  const client = findById(db.clientes, req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }
  Object.assign(client, req.body, { updatedAt: new Date().toISOString() });
  await writeDb(db);
  res.json(client);
});

app.delete('/api/clients/:id', async (req, res) => {
  const db = await readDb();
  db.clientes = removeById(db.clientes, req.params.id);
  await writeDb(db);
  res.status(204).send();
});

app.get('/api/products', async (req, res) => {
  const db = await readDb();
  res.json(db.produtos || []);
});

app.post('/api/products', async (req, res) => {
  const db = await readDb();
  const product = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    disponivel: true,
    orderCount: 0,
    ...req.body
  };
  db.produtos.push(product);
  await writeDb(db);
  res.status(201).json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const db = await readDb();
  const product = findById(db.produtos, req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
  await writeDb(db);
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  const db = await readDb();
  db.produtos = removeById(db.produtos, req.params.id);
  await writeDb(db);
  res.status(204).send();
});

app.get('/api/orders', async (req, res) => {
  const db = await readDb();
  res.json(db.pedidos || []);
});

app.post('/api/orders', async (req, res) => {
  const db = await readDb();
  const order = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'novo',
    frete: req.body.frete || 0,
    total: req.body.total || 0,
    totalWithFrete: req.body.totalWithFrete || parseFloat(((req.body.total || 0) + (req.body.frete || 0)).toFixed(2)),
    ...req.body
  };
  db.pedidos.push(order);
  await writeDb(db);
  res.status(201).json(order);
});

app.put('/api/orders/:id', async (req, res) => {
  const db = await readDb();
  const order = findById(db.pedidos, req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }
  Object.assign(order, req.body, { updatedAt: new Date().toISOString() });
  order.totalWithFrete = parseFloat(((order.total || 0) + (order.frete || 0)).toFixed(2));
  await writeDb(db);
  res.json(order);
});

app.delete('/api/orders/:id', async (req, res) => {
  const db = await readDb();
  db.pedidos = removeById(db.pedidos, req.params.id);
  await writeDb(db);
  res.status(204).send();
});

app.get('/api/settings', async (req, res) => {
  const db = await readDb();
  res.json(db.settings || {});
});

app.put('/api/settings', async (req, res) => {
  const db = await readDb();
  db.settings = { ...db.settings, ...req.body };
  await writeDb(db);
  res.json(db.settings);
});

app.post('/api/whatsapp/connect', async (req, res) => {
  const db = await readDb();
  db.settings.whatsapp = {
    connected: true,
    number: req.body.number || db.settings.whatsapp.number || '',
    token: req.body.token || db.settings.whatsapp.token || '',
    welcomeMessage: req.body.welcomeMessage || db.settings.whatsapp.welcomeMessage || ''
  };
  await writeDb(db);
  res.json({ connected: true, whatsapp: db.settings.whatsapp });
});

app.post('/api/whatsapp/message', async (req, res) => {
  const db = await readDb();
  const messageRecord = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    from: req.body.from || 'cliente',
    to: req.body.to || db.settings.whatsapp.number || '',
    message: req.body.message || '',
    status: 'sent'
  };
  db.whatsappMessages.push(messageRecord);
  await writeDb(db);
  res.json({ success: true, record: messageRecord });
});

app.get('/api/ia/responses', async (req, res) => {
  const db = await readDb();
  res.json(db.iaResponses || []);
});

app.post('/api/ia/responses', async (req, res) => {
  const db = await readDb();
  const response = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trigger: req.body.trigger || '',
    response: req.body.response || ''
  };
  db.iaResponses.push(response);
  await writeDb(db);
  res.status(201).json(response);
});

app.put('/api/ia/responses/:id', async (req, res) => {
  const db = await readDb();
  const iaResponse = findById(db.iaResponses, req.params.id);
  if (!iaResponse) {
    return res.status(404).json({ error: 'Resposta IA não encontrada' });
  }
  Object.assign(iaResponse, req.body, { updatedAt: new Date().toISOString() });
  await writeDb(db);
  res.json(iaResponse);
});

app.delete('/api/ia/responses/:id', async (req, res) => {
  const db = await readDb();
  db.iaResponses = removeById(db.iaResponses, req.params.id);
  await writeDb(db);
  res.status(204).send();
});

app.post('/api/ia/process', async (req, res) => {
  const db = await readDb();
  const message = String(req.body.message || '').toLowerCase();
  const match = (db.iaResponses || []).find(item => message.includes(item.trigger.toLowerCase()));
  const responseText = match
    ? match.response
    : 'Desculpe, ainda não encontrei uma resposta exata. Pergunte sobre cardápio, entrega ou pagamento.';
  res.json({ response: responseText, source: match ? 'knowledge_base' : 'default', intent: 'default' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});