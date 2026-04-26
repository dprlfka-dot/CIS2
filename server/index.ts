import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initDb, SCHEMA } from './db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedJsonPath = path.join(__dirname, '..', 'src', 'seed-data.json');

async function syncSeedData() {
  const productsRes = await pool.query(
    `SELECT * FROM "${SCHEMA}".products ORDER BY customer, code`
  );
  const dailyRes = await pool.query(
    `SELECT * FROM "${SCHEMA}".daily_data ORDER BY product_code, day_index`
  );

  const dailyMap: Record<string, any[]> = {};
  for (const d of dailyRes.rows) {
    if (!dailyMap[d.product_code]) dailyMap[d.product_code] = [];
    dailyMap[d.product_code].push({
      date: d.date_label,
      target: d.target,
      arrival: d.arrival,
      achievement: d.achievement,
    });
  }

  const result = productsRes.rows.map((p: any) => ({
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

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

let dataVersion = 1;

app.get('/api/version', (_req, res) => {
  res.json({ version: dataVersion });
});

app.get('/api/products', async (_req, res) => {
  try {
    const productsRes = await pool.query(
      `SELECT * FROM "${SCHEMA}".products ORDER BY customer, code`
    );
    const dailyRes = await pool.query(
      `SELECT * FROM "${SCHEMA}".daily_data ORDER BY product_code, day_index`
    );

    const dailyMap: Record<string, any[]> = {};
    for (const d of dailyRes.rows) {
      if (!dailyMap[d.product_code]) dailyMap[d.product_code] = [];
      dailyMap[d.product_code].push({
        date: d.date_label,
        target: d.target,
        arrival: d.arrival,
        achievement: d.achievement,
      });
    }

    const result = productsRes.rows.map((p: any) => ({
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.patch('/api/products/:code/daily', async (req, res) => {
  const { code } = req.params;
  const { targets, arrivals, achievements } = req.body as {
    targets?: number[];
    arrivals?: number[];
    achievements?: number[];
  };

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${SCHEMA}"`);
    const found = await client.query(
      `SELECT code FROM "${SCHEMA}".products WHERE code = $1`,
      [code]
    );
    if (found.rowCount === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    await client.query('BEGIN');
    if (targets) {
      for (let i = 0; i < targets.length; i++) {
        await client.query(
          `UPDATE "${SCHEMA}".daily_data SET target = $1 WHERE product_code = $2 AND day_index = $3`,
          [targets[i], code, i]
        );
      }
    }
    if (arrivals) {
      for (let i = 0; i < arrivals.length; i++) {
        await client.query(
          `UPDATE "${SCHEMA}".daily_data SET arrival = $1 WHERE product_code = $2 AND day_index = $3`,
          [arrivals[i], code, i]
        );
      }
    }
    if (achievements) {
      for (let i = 0; i < achievements.length; i++) {
        await client.query(
          `UPDATE "${SCHEMA}".daily_data SET achievement = $1 WHERE product_code = $2 AND day_index = $3`,
          [achievements[i], code, i]
        );
      }
    }
    await client.query('COMMIT');
    dataVersion++;
    await syncSeedData();
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
});

app.post('/api/products/bulk', async (req, res) => {
  const products = req.body as any[];
  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: 'Invalid data' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${SCHEMA}"`);
    await client.query('BEGIN');
    await client.query(`DELETE FROM "${SCHEMA}".daily_data`);
    await client.query(`DELETE FROM "${SCHEMA}".products`);

    for (const p of products) {
      await client.query(
        `INSERT INTO "${SCHEMA}".products
          (code, customer, name, buyer, cis_manager, backlog, material_capa, production_capa, production_target, unit_price, possible_revenue, weekly_total, material_progress, production_progress, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [p.code, p.customer, p.name, p.buyer || '', p.cisManager || '', p.backlog, p.materialCapa, p.productionCapa, p.productionTarget, p.unitPrice || 0, p.possibleRevenue || 0, p.weeklyTotal, p.materialProgress, p.productionProgress, p.status]
      );
      if (p.daily) {
        for (let i = 0; i < p.daily.length; i++) {
          const d = p.daily[i];
          await client.query(
            `INSERT INTO "${SCHEMA}".daily_data (product_code, day_index, date_label, target, arrival, achievement)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [p.code, i, d.date, d.target, d.arrival, d.achievement]
          );
        }
      }
    }

    await client.query('COMMIT');
    dataVersion++;
    await syncSeedData();
    res.json({ ok: true, count: products.length });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
});

app.post('/api/snapshots', async (req, res) => {
  const { label, startDate, endDate } = req.body as { label?: string; startDate?: string; endDate?: string };

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }
  if (startDate > endDate) {
    res.status(400).json({ error: 'startDate must be <= endDate' });
    return;
  }

  const DAILY_YEAR = 2026;
  const toIsoDate = (label: string): string | null => {
    const m = label.match(/^(\d+)\/(\d+)/);
    if (!m) return null;
    const mm = String(m[1]).padStart(2, '0');
    const dd = String(m[2]).padStart(2, '0');
    return `${DAILY_YEAR}-${mm}-${dd}`;
  };

  try {
    const productsRes = await pool.query(
      `SELECT * FROM "${SCHEMA}".products ORDER BY customer, code`
    );
    const dailyRes = await pool.query(
      `SELECT * FROM "${SCHEMA}".daily_data ORDER BY product_code, day_index`
    );

    const dailyMap: Record<string, any[]> = {};
    for (const d of dailyRes.rows) {
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

    const snapshot = productsRes.rows.map((p: any) => ({
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

    await pool.query(
      `INSERT INTO "${SCHEMA}".snapshots (label, start_date, end_date, data) VALUES ($1, $2, $3, $4)`,
      [label || defaultLabel, startDate, endDate, JSON.stringify(snapshot)]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/snapshots', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, label, start_date, end_date, created_at FROM "${SCHEMA}".snapshots ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/snapshots/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM "${SCHEMA}".snapshots WHERE id = $1`,
      [req.params.id]
    );
    if (r.rowCount === 0) {
      res.status(404).json({ error: 'Snapshot not found' });
      return;
    }
    const row = r.rows[0];
    res.json({ ...row, data: row.data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/snapshots/:id', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM "${SCHEMA}".snapshots WHERE id = $1`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

initDb().catch((err) => {
  console.error('DB init failed:', err);
});
