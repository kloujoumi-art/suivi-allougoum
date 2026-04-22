import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { VOTERS } from './voters-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tata.db');

let db;

export function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema();
    migrateSchema();
    ensureCorrectVoters();
  }
  return db;
}

function migrateSchema() {
  try { db.exec("ALTER TABLE voters ADD COLUMN position TEXT DEFAULT ''"); } catch(e) {}
  try { db.exec("ALTER TABLE voters ADD COLUMN treatment TEXT DEFAULT ''"); } catch(e) {}
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS municipalities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('حضرية', 'قروية')) DEFAULT 'قروية',
      circle TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      municipality_id INTEGER NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
      voter_count INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS douars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      municipality_id INTEGER NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
      district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL,
      responsible_name TEXT,
      responsible_phone TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS voters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_name  TEXT NOT NULL,
      personal_name TEXT NOT NULL,
      birth_date   TEXT,
      address      TEXT,
      cin          TEXT,
      district_id  INTEGER REFERENCES districts(id) ON DELETE CASCADE,
      douar_id     INTEGER REFERENCES douars(id) ON DELETE SET NULL,
      notes        TEXT
    );
  `);
  seedData();
}

function seedData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM municipalities').get();
  if (count.c > 0) return;

  const munId = db.prepare(
    'INSERT INTO municipalities (name, type, circle) VALUES (?, ?, ?)'
  ).run('الوكوم', 'قروية', 'أقا').lastInsertRowid;

  db.prepare(
    'INSERT INTO districts (number, municipality_id, voter_count) VALUES (?, ?, ?)'
  ).run(1, munId, 0);

  db.prepare(
    'INSERT INTO districts (number, municipality_id, voter_count) VALUES (?, ?, ?)'
  ).run(2, munId, 0);

  db.prepare(
    'INSERT INTO douars (name, municipality_id, district_id) VALUES (?, ?, ?)'
  ).run('دوار الوكوم', munId, 1);
  // Voters will be inserted by ensureCorrectVoters() after migrateSchema
}

function ensureCorrectVoters() {
  const voterCount = db.prepare('SELECT COUNT(*) as c FROM voters').get().c;
  if (voterCount === VOTERS.length) return;

  const dist1 = db.prepare('SELECT id FROM districts WHERE number=1').get();
  const douar = db.prepare("SELECT id FROM douars WHERE name='دوار الوكوم'").get();
  if (!dist1) return;

  db.prepare('DELETE FROM voters').run();

  const ins = db.prepare(
    'INSERT INTO voters (personal_name, family_name, birth_date, address, district_id, douar_id, position, treatment) VALUES (?,?,?,?,?,?,?,?)'
  );

  db.exec('BEGIN TRANSACTION');
  try {
    for (const [pn, fn, bd, addr] of VOTERS) {
      ins.run(pn, fn, bd, addr, dist1.id, douar?.id || null, '', '');
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  db.prepare('UPDATE districts SET voter_count=? WHERE id=?').run(VOTERS.length, dist1.id);
  console.log(`✅ تم تحديث قاعدة البيانات: ${VOTERS.length} ناخب`);
}
