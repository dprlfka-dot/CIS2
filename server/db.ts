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

export type DbStatus = {
  connected: boolean;
  tables: string[];
  productCount: number;
  lastError?: string;
};

let lastInitError: string | null = null;

const PRIVILEGE_ERROR_CODE = '42501';

const CREATE_PRODUCTS_SQL = `
  CREATE TABLE IF NOT EXISTS "${schema}".products (
    code              TEXT PRIMARY KEY,
    customer          TEXT NOT NULL,
    name              TEXT NOT NULL,
    buyer             TEXT NOT NULL DEFAULT '',
    cis_manager       TEXT NOT NULL DEFAULT '',
    backlog           INTEGER NOT NULL DEFAULT 0,
    material_capa     INTEGER NOT NULL DEFAULT 0,
    production_capa   INTEGER NOT NULL DEFAULT 0,
    production_target INTEGER NOT NULL DEFAULT 0,
    unit_price        INTEGER NOT NULL DEFAULT 0,
    possible_revenue  INTEGER NOT NULL DEFAULT 0,
    weekly_total      INTEGER NOT NULL DEFAULT 0,
    material_progress INTEGER NOT NULL DEFAULT 0,
    production_progress INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT '이상'
  )
`;

const CREATE_DAILY_SQL = `
  CREATE TABLE IF NOT EXISTS "${schema}".daily_data (
    product_code TEXT NOT NULL REFERENCES "${schema}".products(code) ON DELETE CASCADE,
    day_index    INTEGER NOT NULL,
    date_label   TEXT NOT NULL,
    target       INTEGER NOT NULL DEFAULT 0,
    arrival      INTEGER NOT NULL DEFAULT 0,
    achievement  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_code, day_index)
  )
`;

const CREATE_SNAPSHOTS_SQL = `
  CREATE TABLE IF NOT EXISTS "${schema}".snapshots (
    id         SERIAL PRIMARY KEY,
    label      TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data       JSONB NOT NULL
  )
`;

async function seedInitialData() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}"`);
    await client.query('BEGIN');
    for (const p of DASHBOARD_DATA.products) {
      await client.query(
        `INSERT INTO "${schema}".products
          (code, customer, name, buyer, cis_manager, backlog, material_capa, production_capa, production_target, unit_price, possible_revenue, weekly_total, material_progress, production_progress, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (code) DO NOTHING`,
        [p.code, p.customer, p.name, p.buyer || '', p.cisManager || '', p.backlog, p.materialCapa, p.productionCapa, p.productionTarget, p.unitPrice || 0, p.possibleRevenue || 0, p.weeklyTotal, p.materialProgress, p.productionProgress, p.status]
      );
      for (let i = 0; i < p.daily.length; i++) {
        const d = p.daily[i];
        await client.query(
          `INSERT INTO "${schema}".daily_data (product_code, day_index, date_label, target, arrival, achievement)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (product_code, day_index) DO NOTHING`,
          [p.code, i, d.date, d.target, d.arrival, d.achievement]
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function initDb() {
  lastInitError = null;

  // 1단계: 스키마 보장
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    console.log('✅ Schema initialized');
  } catch (e: any) {
    if (e.code === PRIVILEGE_ERROR_CODE) {
      console.warn(`⚠️  스키마 생성 권한 없음 (이미 존재한다고 가정하고 진행): ${e.message}`);
      console.warn('    권한 부족: DBA에게 CREATE 권한 요청 필요');
    } else {
      lastInitError = e.message || String(e);
      console.error('❌ Schema 생성 실패:', e);
      return;
    }
  }

  // 2단계: 테이블 보장
  try {
    await pool.query(CREATE_PRODUCTS_SQL);
    await pool.query(CREATE_DAILY_SQL);
    await pool.query(CREATE_SNAPSHOTS_SQL);
    console.log('✅ Tables ready');
  } catch (e: any) {
    if (e.code === PRIVILEGE_ERROR_CODE) {
      console.warn(`⚠️  테이블 생성 권한 없음 (이미 존재한다고 가정하고 진행): ${e.message}`);
      console.warn('    권한 부족: DBA에게 CREATE 권한 요청 필요');
    } else {
      lastInitError = e.message || String(e);
      console.error('❌ Table 생성 실패:', e);
      return;
    }
  }

  // 3단계: 시드 데이터 안전 처리 (테이블이 비어있을 때만)
  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS c FROM "${schema}".products`
    );
    const count: number = countRes.rows[0].c;

    if (count === 0) {
      console.log('🌱 Empty database detected. Seeding initial data...');
      await seedInitialData();
      console.log(`✅ Seeded ${DASHBOARD_DATA.products.length} products`);
    } else {
      console.log(`📊 Existing data found (${count} products). Skipping seed.`);
    }
  } catch (e: any) {
    lastInitError = e.message || String(e);
    if (e.code === PRIVILEGE_ERROR_CODE) {
      console.error('❌ 시드 처리 권한 부족: DBA에게 SELECT/INSERT 권한 요청 필요');
    }
    console.error('❌ Seed 처리 실패:', e);
  }
}

export async function getDbStatus(): Promise<DbStatus> {
  try {
    const tablesRes = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [schema]
    );
    const tables: string[] = tablesRes.rows.map((r: any) => r.table_name);

    let productCount = 0;
    if (tables.includes('products')) {
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS c FROM "${schema}".products`
      );
      productCount = countRes.rows[0].c;
    }

    return {
      connected: true,
      tables,
      productCount,
      ...(lastInitError ? { lastError: lastInitError } : {}),
    };
  } catch (e: any) {
    return {
      connected: false,
      tables: [],
      productCount: 0,
      lastError: e.message || String(e),
    };
  }
}

export default pool;
