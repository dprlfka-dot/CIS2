import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedJsonPath = path.join(__dirname, '..', 'src', 'seed-data.json');

// DB 전체 데이터를 src/seed-data.json에 동기화 (git 추적용)
function syncSeedData() {
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
    buyer: p.buyer || '',
    cisManager: p.cis_manager || '',
    backlog: p.backlog,
    materialCapa: p.material_capa,
    productionCapa: p.production_capa,
    productionTarget: p.production_target,
    unitPrice: p.unit_price || 0,
    possibleRevenue: p.possible_revenue || 0,
    weeklyTotal: p.weekly_total,
    materialProgress: p.material_progress,
    productionProgress: p.production_progress,
    status: p.status,
    daily: dailyMap[p.code] || [],
  }));

  const data = {
    title: '대량발주품목 진도율 관리',
    baseDate: '2026.04.06',
    products: result,
  };

  fs.writeFileSync(seedJsonPath, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 데이터 변경 시 증가하는 버전 카운터
let dataVersion = 1;

// GET /api/version - 현재 데이터 버전 조회 (폴링용, 가벼움)
app.get('/api/version', (_req, res) => {
  res.json({ version: dataVersion });
});

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
    buyer: p.buyer || '',
    cisManager: p.cis_manager || '',
    backlog: p.backlog,
    materialCapa: p.material_capa,
    productionCapa: p.production_capa,
    productionTarget: p.production_target,
    unitPrice: p.unit_price || 0,
    possibleRevenue: p.possible_revenue || 0,
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
  dataVersion++;
  syncSeedData();
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
      INSERT INTO products (code, customer, name, buyer, cis_manager, backlog, material_capa, production_capa, production_target, unit_price, possible_revenue, weekly_total, material_progress, production_progress, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDaily = db.prepare(`
      INSERT INTO daily_data (product_code, day_index, date_label, target, arrival, achievement)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const p of products) {
      insertProduct.run(p.code, p.customer, p.name, p.buyer || '', p.cisManager || '', p.backlog, p.materialCapa, p.productionCapa, p.productionTarget, p.unitPrice || 0, p.possibleRevenue || 0, p.weeklyTotal, p.materialProgress, p.productionProgress, p.status);
      if (p.daily) {
        p.daily.forEach((d: any, i: number) => {
          insertDaily.run(p.code, i, d.date, d.target, d.arrival, d.achievement);
        });
      }
    }
  });

  bulkReplace();
  dataVersion++;
  syncSeedData();
  res.json({ ok: true, count: products.length });
});

// POST /api/snapshots - 기간형 스냅샷 저장
// body: { label?, startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
// 선택 기간의 일별 데이터만 실제 값으로 저장하고, 범위 밖은 target/arrival/achievement = 0
// 비일별 필드(backlog, productionTarget 등)는 저장 시점 상태 그대로 스냅샷
app.post('/api/snapshots', (req, res) => {
  const { label, startDate, endDate } = req.body as { label?: string; startDate?: string; endDate?: string };

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }
  if (startDate > endDate) {
    res.status(400).json({ error: 'startDate must be <= endDate' });
    return;
  }

  // date_label "4/1(수)" → 'YYYY-MM-DD' (2026년 기준 데이터셋)
  const DAILY_YEAR = 2026;
  const toIsoDate = (label: string): string | null => {
    const m = label.match(/^(\d+)\/(\d+)/);
    if (!m) return null;
    const mm = String(m[1]).padStart(2, '0');
    const dd = String(m[2]).padStart(2, '0');
    return `${DAILY_YEAR}-${mm}-${dd}`;
  };

  const products = db.prepare('SELECT * FROM products ORDER BY customer, code').all() as any[];
  const dailyAll = db.prepare('SELECT * FROM daily_data ORDER BY product_code, day_index').all() as any[];

  const dailyMap: Record<string, any[]> = {};
  for (const d of dailyAll) {
    if (!dailyMap[d.product_code]) dailyMap[d.product_code] = [];
    const iso = toIsoDate(d.date_label);
    const inRange = iso !== null && iso >= startDate && iso <= endDate;
    dailyMap[d.product_code].push({
      date: d.date_label,
      target: inRange ? d.target : 0,
      arrival: inRange ? d.arrival : 0,
      achievement: inRange ? d.achievement : 0,
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
    unitPrice: p.unit_price || 0,
    possibleRevenue: p.possible_revenue || 0,
    weeklyTotal: p.weekly_total,
    materialProgress: p.material_progress,
    productionProgress: p.production_progress,
    status: p.status,
    daily: dailyMap[p.code] || [],
  }));

  const defaultLabel = `${startDate} ~ ${endDate}`;

  db.prepare('INSERT INTO snapshots (label, start_date, end_date, data) VALUES (?, ?, ?, ?)').run(
    label || defaultLabel,
    startDate,
    endDate,
    JSON.stringify(snapshot)
  );

  res.json({ ok: true });
});

// GET /api/snapshots - 스냅샷 목록 조회
app.get('/api/snapshots', (_req, res) => {
  const snapshots = db.prepare('SELECT id, label, start_date, end_date, created_at FROM snapshots ORDER BY created_at DESC').all();
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
