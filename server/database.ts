import Database from 'better-sqlite3';
import path from 'node:path';

let db: Database.Database | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS setups (
    name TEXT PRIMARY KEY,
    state TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

function getDbPath(): string {
  const envPath = process.env.SAVES_DB_PATH;
  if (envPath) return envPath;
  return path.resolve(process.cwd(), 'planner-saves.db');
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA);
  }
  return db;
}

const stmts = {
  getAllNames: null as Database.Statement | null,
  get: null as Database.Statement | null,
  save: null as Database.Statement | null,
  delete: null as Database.Statement | null,
  getMeta: null as Database.Statement | null,
  setMeta: null as Database.Statement | null,
};

function prepare(): void {
  const d = getDb();
  if (!stmts.getAllNames) stmts.getAllNames = d.prepare('SELECT name FROM setups ORDER BY name');
  if (!stmts.get) stmts.get = d.prepare('SELECT state FROM setups WHERE name = ?');
  if (!stmts.save) stmts.save = d.prepare('INSERT OR REPLACE INTO setups (name, state) VALUES (?, ?)');
  if (!stmts.delete) stmts.delete = d.prepare('DELETE FROM setups WHERE name = ?');
  if (!stmts.getMeta) stmts.getMeta = d.prepare('SELECT value FROM meta WHERE key = ?');
  if (!stmts.setMeta) stmts.setMeta = d.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
}

export function getAllSetupNames(): string[] {
  prepare();
  return (stmts.getAllNames!.all() as { name: string }[]).map((r) => r.name);
}

export function getSetup(name: string): string | null {
  prepare();
  const row = stmts.get!.get(name) as { state: string } | undefined;
  return row ? row.state : null;
}

export function saveSetup(name: string, state: string): void {
  prepare();
  stmts.save!.run(name, state);
}

export function deleteSetup(name: string): boolean {
  prepare();
  const result = stmts.delete!.run(name);
  return result.changes > 0;
}

export function getMeta(key: string): string | null {
  prepare();
  const row = stmts.getMeta!.get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setMeta(key: string, value: string): void {
  prepare();
  stmts.setMeta!.run(key, value);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
  stmts.getAllNames = null;
  stmts.get = null;
  stmts.save = null;
  stmts.delete = null;
  stmts.getMeta = null;
  stmts.setMeta = null;
}
