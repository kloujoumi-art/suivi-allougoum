import { getDb } from './database.js';
import { VOTERS } from './voters-data.js';

const db = getDb();

// Get IDs
const dist1 = db.prepare('SELECT id FROM districts WHERE number=1').get();
const douar  = db.prepare("SELECT id FROM douars WHERE name='دوار الوكوم'").get();
if (!dist1) { console.error('لا توجد دائرة رقم 1'); process.exit(1); }

const dist1Id  = dist1.id;
const douarId  = douar?.id || null;

// Delete all existing voters
db.prepare('DELETE FROM voters').run();
console.log('✅ تم حذف الناخبين القدامى');

const ins = db.prepare(
  'INSERT INTO voters (personal_name, family_name, birth_date, address, district_id, douar_id, position, treatment) VALUES (?,?,?,?,?,?,?,?)'
);

db.exec('BEGIN TRANSACTION');
try {
  for (const [pn, fn, bd, addr] of VOTERS) {
    ins.run(pn, fn, bd, addr, dist1Id, douarId, '', '');
  }
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

const count = db.prepare('SELECT COUNT(*) as c FROM voters').get().c;
console.log(`✅ تم إدخال ${count} ناخب بنجاح`);

// Update district voter count
db.prepare('UPDATE districts SET voter_count=? WHERE id=?').run(count, dist1Id);
console.log('✅ تم تحديث عدد الناخبين في الدائرة 1');
