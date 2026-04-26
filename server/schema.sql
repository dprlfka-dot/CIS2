-- App Runner 배포용 스키마 초기화 스크립트
-- DBA가 앱 사용자 권한으로 실행하지 못할 경우, 슈퍼유저로 1회 실행 요청
-- DB: postgres / Schema: app_bulk_order_items_prd

CREATE SCHEMA IF NOT EXISTS app_bulk_order_items_prd;

CREATE TABLE IF NOT EXISTS app_bulk_order_items_prd.products (
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
);

CREATE TABLE IF NOT EXISTS app_bulk_order_items_prd.daily_data (
  product_code  TEXT NOT NULL REFERENCES app_bulk_order_items_prd.products(code) ON DELETE CASCADE,
  day_index     INTEGER NOT NULL,
  date_label    TEXT NOT NULL,
  target        INTEGER NOT NULL DEFAULT 0,
  arrival       INTEGER NOT NULL DEFAULT 0,
  achievement   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_code, day_index)
);

CREATE TABLE IF NOT EXISTS app_bulk_order_items_prd.snapshots (
  id         SERIAL PRIMARY KEY,
  label      TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data       JSONB NOT NULL
);

-- 앱 사용자에게 데이터 조작 권한만 부여 (DDL 권한은 부여하지 않음)
-- <APP_USERNAME>은 Secrets Manager의 username으로 치환
GRANT USAGE ON SCHEMA app_bulk_order_items_prd TO "<APP_USERNAME>";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_bulk_order_items_prd TO "<APP_USERNAME>";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_bulk_order_items_prd TO "<APP_USERNAME>";
