import express from 'express';
import cors from 'cors';
import db from './db';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// GET /api/products - 전체 제품 + 일별 데이터 조회
app.get('/api/products', (_req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY customer, code').all() as any[];
  const dailyAll = db.prepare('SELECT * FROM daily_data ORDER BY product_code, day_index').all() as any[];

  const dailyMap: Record<string, any[]> = {};
  for (const d of dailyAll) {
    if (!dailyMap[d.product_code]) dailyMap[d.product_code] = [];
    dailyMap[d.product_code].push({
      date: d.date_label,
      target: d.target,
      arrival: d.arrival,
      achievement: d.achievement,
    });
  }

  const result = products.map(p => ({
    customer: p.customer,
    code: p.code,
    name: p.name,
    backlog: p.backlog,
    materialCapa: p.material_capa,
    productionCapa: p.production_capa,
    productionTarget: p.production_target,
    weeklyTotal: p.weekly_total,
    materialProgress: p.material_progress,
    productionProgress: p.production_progress,
    status: p.status,
    daily: dailyMap[p.code] || [],
  }));

  res.json(result);
});

// PATCH /api/products/:code/daily - 단일 제품 일별 데이터 수정
app.patch('/api/products/:code/daily', (req, res) => {
  const { code } = req.params;
  const { targets, arrivals, achievements } = req.body as {
    targets?: number[];
    arrivals?: number[];
    achievements?: number[];
  };

  const product = db.prepare('SELECT code FROM products WHERE code = ?').get(code);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const update = db.transaction(() => {
    if (targets) {
      const stmt = db.prepare('UPDATE daily_data SET target = ? WHERE product_code = ? AND day_index = ?');
      targets.forEach((v, i) => stmt.run(v, code, i));
    }
    if (arrivals) {
      const stmt = db.prepare('UPDATE daily_data SET arrival = ? WHERE product_code = ? AND day_index = ?');
      arrivals.forEach((v, i) => stmt.run(v, code, i));
    }
    if (achievements) {
      const stmt = db.prepare('UPDATE daily_data SET achievement = ? WHERE product_code = ? AND day_index = ?');
      achievements.forEach((v, i) => stmt.run(v, code, i));
    }
  });

  update();
  res.json({ ok: true });
});

// POST /api/products/bulk - 전체 제품 교체 (엑셀 업로드용)
app.post('/api/products/bulk', (req, res) => {
  const products = req.body as any[];
  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: 'Invalid data' });
    return;
  }

  const bulkReplace = db.transaction(() => {
    db.prepare('DELETE FROM daily_data').run();
    db.prepare('DELETE FROM products').run();

    const insertProduct = db.prepare(`
      INSERT INTO products (code, customer, name, backlog, material_capa, production_capa, production_target, weekly_total, material_progress, production_progress, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDaily = db.prepare(`
      INSERT INTO daily_data (product_code, day_index, date_label, target, arrival, achievement)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const p of products) {
      insertProduct.run(p.code, p.customer, p.name, p.backlog, p.materialCapa, p.productionCapa, p.productionTarget, p.weeklyTotal, p.materialProgress, p.productionProgress, p.status);
      if (p.daily) {
        p.daily.forEach((d: any, i: number) => {
          insertDaily.run(p.code, i, d.date, d.target, d.arrival, d.achievement);
        });
      }
    }
  });

  bulkReplace();
  res.json({ ok: true, count: products.length });
});

// POST /api/snapshots - 스냅샷 저장
app.post('/api/snapshots', (req, res) => {
  const { label } = req.body as { label?: string };

  // 현재 데이터 조회
  const products = db.prepare('SELECT * FROM products ORDER BY customer, code').all() as any[];
  const dailyAll = db.prepare('SELECT * FROM daily_data ORDER BY product_code, day_index').all() as any[];

  const dailyMap: Record<string, any[]> = {};
  for (const d of dailyAll) {
    if (!dailyMap[d.product_code]) dailyMap[d.product_code] = [];
    dailyMap[d.product_code].push({
      date: d.date_label,
      target: d.target,
      arrival: d.arrival,
      achievement: d.achievement,
    });
  }

  const snapshot = products.map(p => ({
    customer: p.customer,
    code: p.code,
    name: p.name,
    backlog: p.backlog,
    materialCapa: p.material_capa,
    productionCapa: p.production_capa,
    productionTarget: p.production_target,
    weeklyTotal: p.weekly_total,
    materialProgress: p.material_progress,
    productionProgress: p.production_progress,
    status: p.status,
    daily: dailyMap[p.code] || [],
  }));

  const now = new Date();
  const defaultLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}월 스냅샷`;

  db.prepare('INSERT INTO snapshots (label, data) VALUES (?, ?)').run(
    label || defaultLabel,
    JSON.stringify(snapshot)
  );

  res.json({ ok: true });
});

// GET /api/snapshots - 스냅샷 목록 조회
app.get('/api/snapshots', (_req, res) => {
  const snapshots = db.prepare('SELECT id, label, created_at FROM snapshots ORDER BY created_at DESC').all();
  res.json(snapshots);
});

// GET /api/snapshots/:id - 스냅샷 상세 조회
app.get('/api/snapshots/:id', (req, res) => {
  const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id) as any;
  if (!snapshot) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }
  res.json({ ...snapshot, data: JSON.parse(snapshot.data) });
});

// DELETE /api/snapshots/:id - 스냅샷 삭제
app.delete('/api/snapshots/:id', (req, res) => {
  db.prepare('DELETE FROM snapshots WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
