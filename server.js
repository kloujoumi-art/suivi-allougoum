import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { getDb } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════
//  بيانات الدخول — غيّر هنا فقط
// ══════════════════════════════════════════
const AUTH = {
  username: 'admin',
  password: 'istiqlal2026'
};

app.use(express.json());

// ── Sessions ──────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'wkm-istiqlal-tata-s3cr3t-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 10 * 60 * 60 * 1000 } // 10 heures
}));

// ── Routes publiques (avant le guard) ────
app.get('/login', (req, res) => {
  if (req.session?.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH.username && password === AUTH.password) {
    req.session.authenticated = true;
    req.session.username = username;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ── Guard : toutes les routes suivantes sont protégées ──
app.use((req, res, next) => {
  if (req.session?.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'غير مصرح — الرجاء تسجيل الدخول' });
  res.redirect('/login');
});

// ── Fichiers statiques (protégés) ─────────
app.use(express.static(path.join(__dirname, 'public')));

// ==================== MUNICIPALITIES ====================

app.get('/api/municipalities', (req, res) => {
  const db = getDb();
  const { search } = req.query;
  const sql = `SELECT m.*,
    (SELECT COUNT(*) FROM districts WHERE municipality_id=m.id) as district_count,
    (SELECT COUNT(*) FROM douars WHERE municipality_id=m.id) as douar_count
   FROM municipalities m ${search ? 'WHERE m.name LIKE ?' : 'ORDER BY m.name'}`;
  res.json(search ? db.prepare(sql).all(`%${search}%`) : db.prepare(sql).all());
});

app.get('/api/municipalities/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM municipalities WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/municipalities', (req, res) => {
  const db = getDb();
  const { name, type, circle, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'الاسم مطلوب' });
  try {
    const r = db.prepare('INSERT INTO municipalities (name,type,circle,notes) VALUES (?,?,?,?)').run(name, type||'قروية', circle||'', notes||'');
    res.json({ id: r.lastInsertRowid });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/municipalities/:id', (req, res) => {
  const db = getDb();
  const { name, type, circle, notes } = req.body;
  try {
    db.prepare('UPDATE municipalities SET name=?,type=?,circle=?,notes=? WHERE id=?').run(name, type, circle, notes, req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/municipalities/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM municipalities WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ==================== DISTRICTS ====================

app.get('/api/municipalities/:munId/districts', (req, res) => {
  const db = getDb();
  res.json(db.prepare(
    `SELECT d.*, (SELECT COUNT(*) FROM douars WHERE district_id=d.id) as douar_count,
      (SELECT COUNT(*) FROM voters WHERE district_id=d.id) as voter_count_real
     FROM districts d WHERE municipality_id=? ORDER BY number`
  ).all(req.params.munId));
});

app.get('/api/districts', (req, res) => {
  const db = getDb();
  const { search } = req.query;
  const base = `SELECT d.*, m.name as municipality_name,
    (SELECT COUNT(*) FROM douars WHERE district_id=d.id) as douar_count,
    (SELECT COUNT(*) FROM voters WHERE district_id=d.id) as voter_count_real
   FROM districts d JOIN municipalities m ON d.municipality_id=m.id`;
  const rows = search
    ? db.prepare(base + ' WHERE m.name LIKE ? OR CAST(d.number AS TEXT) LIKE ? ORDER BY d.number').all(`%${search}%`, `%${search}%`)
    : db.prepare(base + ' ORDER BY d.number').all();
  res.json(rows);
});

app.get('/api/districts/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT d.*, m.name as municipality_name FROM districts d JOIN municipalities m ON d.municipality_id=m.id WHERE d.id=?'
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/districts', (req, res) => {
  const db = getDb();
  const { number, municipality_id, voter_count, notes } = req.body;
  if (!number || !municipality_id) return res.status(400).json({ error: 'رقم الدائرة والجماعة مطلوبان' });
  const r = db.prepare('INSERT INTO districts (number,municipality_id,voter_count,notes) VALUES (?,?,?,?)').run(number, municipality_id, voter_count||0, notes||'');
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/districts/:id', (req, res) => {
  const db = getDb();
  const { number, municipality_id, voter_count, notes } = req.body;
  db.prepare('UPDATE districts SET number=?,municipality_id=?,voter_count=?,notes=? WHERE id=?').run(number, municipality_id, voter_count, notes, req.params.id);
  res.json({ success: true });
});

app.delete('/api/districts/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM districts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ==================== DOUARS ====================

app.get('/api/douars', (req, res) => {
  const db = getDb();
  const { search, municipality_id, district_id } = req.query;
  let sql = `SELECT dw.*, m.name as municipality_name, d.number as district_number
             FROM douars dw JOIN municipalities m ON dw.municipality_id=m.id
             LEFT JOIN districts d ON dw.district_id=d.id WHERE 1=1`;
  const params = [];
  if (search)        { sql += ' AND dw.name LIKE ?';          params.push(`%${search}%`); }
  if (municipality_id){ sql += ' AND dw.municipality_id=?';   params.push(municipality_id); }
  if (district_id)   { sql += ' AND dw.district_id=?';        params.push(district_id); }
  sql += ' ORDER BY d.number, dw.name';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/douars/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    `SELECT dw.*, m.name as municipality_name, d.number as district_number
     FROM douars dw JOIN municipalities m ON dw.municipality_id=m.id
     LEFT JOIN districts d ON dw.district_id=d.id WHERE dw.id=?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/douars', (req, res) => {
  const db = getDb();
  const { name, municipality_id, district_id, responsible_name, responsible_phone, active } = req.body;
  if (!name || !municipality_id) return res.status(400).json({ error: 'الاسم والجماعة مطلوبان' });
  const r = db.prepare('INSERT INTO douars (name,municipality_id,district_id,responsible_name,responsible_phone,active) VALUES (?,?,?,?,?,?)').run(name, municipality_id, district_id||null, responsible_name||'', responsible_phone||'', active!==undefined?active:1);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/douars/:id', (req, res) => {
  const db = getDb();
  const { name, municipality_id, district_id, responsible_name, responsible_phone, active } = req.body;
  db.prepare('UPDATE douars SET name=?,municipality_id=?,district_id=?,responsible_name=?,responsible_phone=?,active=? WHERE id=?').run(name, municipality_id, district_id||null, responsible_name, responsible_phone, active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/douars/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM douars WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ==================== VOTERS ====================

app.get('/api/voters', (req, res) => {
  const db = getDb();
  const { search, district_id, douar_id } = req.query;
  let sql = `SELECT v.*, d.number as district_number, dw.name as douar_name
             FROM voters v
             LEFT JOIN districts d ON v.district_id=d.id
             LEFT JOIN douars dw ON v.douar_id=dw.id
             WHERE 1=1`;
  const params = [];
  if (search)    { sql += ' AND (v.family_name LIKE ? OR v.personal_name LIKE ? OR v.cin LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (district_id){ sql += ' AND v.district_id=?'; params.push(district_id); }
  if (douar_id)  { sql += ' AND v.douar_id=?';     params.push(douar_id); }
  sql += ' ORDER BY d.number, v.id';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/voters/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    `SELECT v.*, d.number as district_number, dw.name as douar_name
     FROM voters v LEFT JOIN districts d ON v.district_id=d.id LEFT JOIN douars dw ON v.douar_id=dw.id
     WHERE v.id=?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/voters', (req, res) => {
  const db = getDb();
  const { family_name, personal_name, birth_date, address, cin, district_id, douar_id, notes } = req.body;
  if (!family_name || !personal_name) return res.status(400).json({ error: 'الاسم العائلي والشخصي مطلوبان' });
  const r = db.prepare('INSERT INTO voters (family_name,personal_name,birth_date,address,cin,district_id,douar_id,notes) VALUES (?,?,?,?,?,?,?,?)').run(family_name, personal_name, birth_date||'', address||'', cin||'', district_id||null, douar_id||null, notes||'');
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/voters/:id', (req, res) => {
  const db = getDb();
  const { family_name, personal_name, birth_date, address, cin, district_id, douar_id, notes } = req.body;
  db.prepare('UPDATE voters SET family_name=?,personal_name=?,birth_date=?,address=?,cin=?,district_id=?,douar_id=?,notes=? WHERE id=?').run(family_name, personal_name, birth_date||'', address||'', cin||'', district_id||null, douar_id||null, notes||'', req.params.id);
  res.json({ success: true });
});

app.delete('/api/voters/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM voters WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ==================== CAMPAIGN ====================

app.patch('/api/voters/:id/campaign', (req, res) => {
  const db = getDb();
  const { position, treatment } = req.body;
  db.prepare('UPDATE voters SET position=?, treatment=? WHERE id=?')
    .run(position || '', treatment || '', req.params.id);
  res.json({ success: true });
});

app.get('/api/campaign/stats', (req, res) => {
  const db = getDb();
  const total      = db.prepare('SELECT COUNT(*) as c FROM voters').get().c;
  const maana      = db.prepare("SELECT COUNT(*) as c FROM voters WHERE position='maana'").get().c;
  const mutaraddid = db.prepare("SELECT COUNT(*) as c FROM voters WHERE position='mutaraddid'").get().c;
  const diddana    = db.prepare("SELECT COUNT(*) as c FROM voters WHERE position='diddana'").get().c;
  const notEval    = total - maana - mutaraddid - diddana;

  const byDouar = db.prepare(`
    SELECT COALESCE(dw.name, 'غير محدد') as douar_name, dw.id as douar_id,
      COUNT(*) as total,
      SUM(CASE WHEN v.position='maana'      THEN 1 ELSE 0 END) as maana,
      SUM(CASE WHEN v.position='mutaraddid' THEN 1 ELSE 0 END) as mutaraddid,
      SUM(CASE WHEN v.position='diddana'    THEN 1 ELSE 0 END) as diddana,
      COUNT(*) - SUM(CASE WHEN v.position!='' THEN 1 ELSE 0 END) as not_eval
    FROM voters v
    LEFT JOIN douars dw ON v.douar_id = dw.id
    GROUP BY dw.id
    ORDER BY total DESC
  `).all();

  const tv1 = db.prepare("SELECT COUNT(*) as c FROM voters WHERE treatment='v1'").get().c;
  const tv2 = db.prepare("SELECT COUNT(*) as c FROM voters WHERE treatment='v2'").get().c;
  const tv3 = db.prepare("SELECT COUNT(*) as c FROM voters WHERE treatment='v3'").get().c;

  res.json({ total, maana, mutaraddid, diddana, notEval, byDouar,
             byTreatment: [{ key:'v1', count:tv1 }, { key:'v2', count:tv2 }, { key:'v3', count:tv3 }] });
});

app.get('/api/campaign/voters', (req, res) => {
  const db = getDb();
  const { search, position, douar_id } = req.query;
  let sql = `SELECT v.*, d.number as district_number, dw.name as douar_name
             FROM voters v
             LEFT JOIN districts d ON v.district_id=d.id
             LEFT JOIN douars dw ON v.douar_id=dw.id
             WHERE 1=1`;
  const params = [];
  if (search)   { sql += ' AND (v.family_name LIKE ? OR v.personal_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (position === 'none') { sql += " AND (v.position IS NULL OR v.position='')"; }
  else if (position) { sql += ' AND v.position=?'; params.push(position); }
  if (douar_id) { sql += ' AND v.douar_id=?'; params.push(douar_id); }
  sql += ' ORDER BY d.number, v.id';
  res.json(db.prepare(sql).all(...params));
});

// ==================== STATS ====================

app.get('/api/stats', (req, res) => {
  const db = getDb();
  const municipalities = db.prepare('SELECT COUNT(*) as c FROM municipalities').get().c;
  const districts      = db.prepare('SELECT COUNT(*) as c FROM districts').get().c;
  const douars         = db.prepare('SELECT COUNT(*) as c FROM douars').get().c;
  const voters         = db.prepare('SELECT COUNT(*) as c FROM voters').get().c;
  const byDistrict = db.prepare(
    `SELECT d.number, COUNT(v.id) as voter_count, dw.name as douar_name
     FROM districts d
     LEFT JOIN voters v ON v.district_id=d.id
     LEFT JOIN douars dw ON dw.district_id=d.id
     GROUP BY d.id ORDER BY d.number`
  ).all();
  const maana      = db.prepare("SELECT COUNT(*) as c FROM voters WHERE position='maana'").get().c;
  const mutaraddid = db.prepare("SELECT COUNT(*) as c FROM voters WHERE position='mutaraddid'").get().c;
  const diddana    = db.prepare("SELECT COUNT(*) as c FROM voters WHERE position='diddana'").get().c;
  res.json({ municipalities, districts, douars, voters, byDistrict, maana, mutaraddid, diddana });
});

// ==================== EXPORT ====================

app.get('/api/export/voters', (req, res) => {
  const db = getDb();
  const { district_id } = req.query;
  let sql = `SELECT d.number as 'رقم الدائرة الانتخابية', v.family_name as 'الاسم العائلي للناخب',
    v.personal_name as 'الاسم الشخصي للناخب', v.birth_date as 'تاريخ الازدياد',
    v.address as 'العنوان', v.cin as 'رقم البطاقة الوطنية'
   FROM voters v LEFT JOIN districts d ON v.district_id=d.id LEFT JOIN douars dw ON v.douar_id=dw.id`;
  if (district_id) sql += ` WHERE v.district_id=${parseInt(district_id)}`;
  sql += ' ORDER BY d.number, v.id';
  sendExcel(res, db.prepare(sql).all(), 'قائمة الناخبين');
});

app.get('/api/export/campaign', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT d.number as 'رقم الدائرة', v.family_name as 'الاسم العائلي', v.personal_name as 'الاسم الشخصي',
      v.birth_date as 'تاريخ الازدياد', dw.name as 'الدوار',
      CASE v.position WHEN 'maana' THEN 'معنا 100%' WHEN 'mutaraddid' THEN 'متردد 50%' WHEN 'diddana' THEN 'ضدنا 0%' ELSE 'لم يقيَّم' END as 'الموقف',
      CASE v.treatment WHEN 'v1' THEN 'زيارة المرشح مباشرة' WHEN 'v2' THEN 'إرسال شخص يعرفه جيداً ويتواصل معه' WHEN 'v3' THEN 'زيارة مع السيد الحسين بوزيحاي والسيد عبد اللطيف أكناو' ELSE '' END as 'طريقة المعالجة'
    FROM voters v LEFT JOIN districts d ON v.district_id=d.id LEFT JOIN douars dw ON v.douar_id=dw.id
    ORDER BY d.number, v.id
  `).all();
  sendExcel(res, rows, 'إحصائيات الحملة');
});

app.get('/api/export/districts', (req, res) => {
  const db = getDb();
  sendExcel(res, db.prepare(
    `SELECT d.number as 'رقم الدائرة', m.name as 'الجماعة',
      (SELECT COUNT(*) FROM voters WHERE district_id=d.id) as 'عدد الناخبين',
      (SELECT COUNT(*) FROM douars WHERE district_id=d.id) as 'عدد الدواوير',
      d.notes as 'ملاحظات'
     FROM districts d JOIN municipalities m ON d.municipality_id=m.id ORDER BY d.number`
  ).all(), 'الدوائر');
});

function sendExcel(res, rows, sheetName) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(sheetName)}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
});
