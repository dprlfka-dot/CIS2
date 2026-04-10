import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { DASHBOARD_DATA } from '../src/data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
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

  CREATE TABLE IF NOT EXISTS daily_data (
    product_code TEXT NOT NULL,
    day_index INTEGER NOT NULL,
    date_label TEXT NOT NULL,
    target INTEGER NOT NULL DEFAULT 0,
    arrival INTEGER NOT NULL DEFAULT 0,
    achievement INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_code, day_index),
    FOREIGN KEY (product_code) REFERENCES products(code) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    data TEXT NOT NULL
  );
`);

// 서버 시작 시 항상 seed-data.json 기준으로 DB 동기화
// (git pull만 하면 다른 AI도 최신 데이터 사용 가능)
const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products (code, customer, name, buyer, cis_manager, backlog, material_capa, production_capa, production_target, unit_price, possible_revenue, weekly_total, material_progress, production_progress, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertDaily = db.prepare(`
  INSERT OR REPLACE INTO daily_data (product_code, day_index, date_label, target, arrival, achievement)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const seed = db.transaction(() => {
  db.prepare('DELETE FROM daily_data').run();
  db.prepare('DELETE FROM products').run();
  for (const p of DASHBOARD_DATA.products) {
    insertProduct.run(p.code, p.customer, p.name, p.buyer || '', p.cisManager || '', p.backlog, p.materialCapa, p.productionCapa, p.productionTarget, p.unitPrice || 0, p.possibleRevenue || 0, p.weeklyTotal, p.materialProgress, p.productionProgress, p.status);
    p.daily.forEach((d, i) => {
      insertDaily.run(p.code, i, d.date, d.target, d.arrival, d.achievement);
    });
  }
});
seed();
console.log(`Seeded ${DASHBOARD_DATA.products.length} products from seed-data.json`);

export default db;
