import pg from 'pg';
import { DASHBOARD_DATA } from '../src/data';

const { Pool } = pg;

const schema = process.env.DB_SCHEMA || 'app_bulk_order_items_prd';

const host = process.env.DB_HOST || 'localhost';
const isLocal = /^(localhost|127\.)/.test(host);

export const pool = new Pool({
  host,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
});

pool.on('connect', (client) => {
  client.query(`SET search_path TO "${schema}"`).catch(() => {});
});

export const SCHEMA = schema;

export async function initDb() {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".products (
      code TEXT PRIMARY KEY,
      customer TEXT NOT NULL,
      name TEXT NOT NULL,
      buyer TEXT NOT NULL DEFAULT '',
      cis_manager TEXT NOT NULL DEFAULT '',
      backlog INTEGER NOT NULL DEFAULT 0,
      material_capa INTEGER NOT NULL DEFAULT 0,
      production_capa INTEGER NOT NULL DEFAULT 0,
      production_target INTEGER NOT NULL DEFAULT 0,
      unit_price INTEGER NOT NULL DEFAULT 0,
      possible_revenue INTEGER NOT NULL DEFAULT 0,
      weekly_total INTEGER NOT NULL DEFAULT 0,
      material_progress INTEGER NOT NULL DEFAULT 0,
      production_progress INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '이상'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".daily_data (
      product_code TEXT NOT NULL REFERENCES "${schema}".products(code) ON DELETE CASCADE,
      day_index INTEGER NOT NULL,
      date_label TEXT NOT NULL,
      target INTEGER NOT NULL DEFAULT 0,
      arrival INTEGER NOT NULL DEFAULT 0,
      achievement INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (product_code, day_index)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".snapshots (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data JSONB NOT NULL
    );
  `);

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}"`);
    await client.query('BEGIN');
    await client.query(`DELETE FROM "${schema}".daily_data`);
    await client.query(`DELETE FROM "${schema}".products`);
    for (const p of DASHBOARD_DATA.products) {
      await client.query(
        `INSERT INTO "${schema}".products
          (code, customer, name, buyer, cis_manager, backlog, material_capa, production_capa, production_target, unit_price, possible_revenue, weekly_total, material_progress, production_progress, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [p.code, p.customer, p.name, p.buyer || '', p.cisManager || '', p.backlog, p.materialCapa, p.productionCapa, p.productionTarget, p.unitPrice || 0, p.possibleRevenue || 0, p.weeklyTotal, p.materialProgress, p.productionProgress, p.status]
      );
      for (let i = 0; i < p.daily.length; i++) {
        const d = p.daily[i];
        await client.query(
          `INSERT INTO "${schema}".daily_data (product_code, day_index, date_label, target, arrival, achievement)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [p.code, i, d.date, d.target, d.arrival, d.achievement]
        );
      }
    }
    await client.query('COMMIT');
    console.log(`Seeded ${DASHBOARD_DATA.products.length} products into schema "${schema}"`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export default pool;
