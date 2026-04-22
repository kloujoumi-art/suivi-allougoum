// ══════ STATE ══════
let currentPage = 'dashboard';
let modalAction = null;
let modalType   = null;
let editingId   = null;
let cachedDistricts = [];
let cachedDouars = [];

// ══════ BOOT ══════
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-page]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.page); })
  );
  let st;
  const gs = document.getElementById('globalSearch');
  if (gs) gs.addEventListener('input', e => {
    clearTimeout(st);
    st = setTimeout(() => { if (e.target.value.trim().length > 1) globalSearch(e.target.value.trim()); }, 300);
  });
  navigate('dashboard');
});

// ══════ NAVIGATION ══════
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`)?.classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  document.querySelectorAll('.bot-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  if (page === 'dashboard') loadDashboard();
  else if (page === 'voters')    loadVoters();
  else if (page === 'districts') loadDistricts();
  else if (page === 'douars')    loadDouars();
  else if (page === 'campaign')  loadCampaign();
}

// ══════ API ══════
async function api(url, opts = {}) {
  const r = await fetch(url, { headers:{'Content-Type':'application/json'}, ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 401) { window.location.href = '/login'; return; }
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error||'خطأ'); }
  return r.json();
}

async function getDistricts() {
  if (!cachedDistricts.length) cachedDistricts = await api('/api/districts');
  return cachedDistricts;
}

// ══════ FIELD HELPERS ══════
const lbl = (t, req) =>
  `<label class="block text-sm font-black mb-1" style="color:#9f1239">${t}${req?'<span class="text-red-500"> *</span>':''}</label>`;

function inp(id, ph='', val='', type='text') {
  return `<input id="${id}" type="${type}" value="${escHtml(val)}" placeholder="${ph}"
    class="inp" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'" />`;
}

function sel(id, opts, onch='') {
  return `<select id="${id}" ${onch?`onchange="${onch}"`:''}
    class="inp" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'">${opts}</select>`;
}

function ta(id, val='') {
  return `<textarea id="${id}" rows="2"
    class="inp resize-none" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'">${escHtml(val)}</textarea>`;
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return el.type==='checkbox' ? (el.checked?1:0) : el.value.trim();
}

// ══════ DASHBOARD ══════
async function loadDashboard() {
  const c = document.getElementById('page-dashboard');
  c.innerHTML = `<div class="text-center py-16 text-rose-300 text-xl animate-pulse">⏳ جارٍ التحميل...</div>`;
  const s = await api('/api/stats');
  const pctV = n => s.voters > 0 ? Math.round(n / s.voters * 100) : 0;
  const isWinning = s.maana > (s.mutaraddid + s.diddana) && s.maana > 0;
  const hasData   = s.maana > 0 || s.mutaraddid > 0 || s.diddana > 0;
  c.innerHTML = `

    <!-- Winner / Loser Banner -->
    ${hasData ? `
    <div class="${isWinning ? 'winner-banner' : 'loser-banner'} rounded-2xl p-3 md:p-4 text-center mb-4 fade-in flex items-center justify-center gap-3">
      <div class="text-3xl md:text-4xl">${isWinning ? '🏆' : '❌'}</div>
      <div>
        <div class="text-base md:text-xl font-black" style="color:${isWinning ? '#78350f' : '#7f1d1d'}">${isWinning ? 'فائز! معنا في المقدمة' : 'خاسر! معنا في المؤخرة'}</div>
        <div class="text-xs font-bold mt-0.5" style="color:${isWinning ? '#92400e' : '#991b1b'}">معنا ${s.maana} | متردد+ضدنا ${s.mutaraddid + s.diddana}</div>
      </div>
    </div>` : ''}

    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4">
      <div class="rounded-2xl p-3 md:p-5 text-white shadow-lg cursor-pointer hover:opacity-90 transition fade-in"
           style="background:linear-gradient(135deg,#9f1239,#be123c)" onclick="navigate('voters')">
        <div class="text-xl md:text-3xl mb-0.5">🗳️</div>
        <div class="text-3xl md:text-4xl font-black">${s.voters}</div>
        <div class="text-xs opacity-80 mt-0.5">ناخب مسجّل</div>
      </div>
      <div class="rounded-2xl p-3 md:p-5 text-white shadow-lg fade-in" style="background:linear-gradient(135deg,#d1fae5,#6ee7b7)">
        <div class="text-xl md:text-3xl mb-0.5">✅</div>
        <div class="text-3xl md:text-4xl font-black text-green-800">${s.maana}</div>
        <div class="text-xs text-green-700 mt-0.5 font-bold">معنا — ${pctV(s.maana)}%</div>
      </div>
      <div class="rounded-2xl p-3 md:p-5 text-white shadow-lg fade-in" style="background:linear-gradient(135deg,#fef3c7,#fcd34d)">
        <div class="text-xl md:text-3xl mb-0.5">⚠️</div>
        <div class="text-3xl md:text-4xl font-black text-yellow-800">${s.mutaraddid}</div>
        <div class="text-xs text-yellow-700 mt-0.5 font-bold">متردد — ${pctV(s.mutaraddid)}%</div>
      </div>
      <div class="rounded-2xl p-3 md:p-5 text-white shadow-lg fade-in" style="background:linear-gradient(135deg,#fee2e2,#fca5a5)">
        <div class="text-xl md:text-3xl mb-0.5">❌</div>
        <div class="text-3xl md:text-4xl font-black text-red-800">${s.diddana}</div>
        <div class="text-xs text-red-700 mt-0.5 font-bold">ضدنا — ${pctV(s.diddana)}%</div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="card p-3 md:p-4 mb-4">
      <div class="flex justify-between text-xs text-gray-500 mb-1">
        <span class="font-bold">توزيع المواقف</span>
        <span class="font-bold" style="color:#be123c">${s.voters - s.maana - s.mutaraddid - s.diddana} لم يُقيَّم</span>
      </div>
      <div class="flex h-5 rounded-full overflow-hidden bg-gray-100">
        ${s.maana      ? `<div style="width:${pctV(s.maana)}%;background:#059669"     class="flex items-center justify-center text-white text-xs font-bold">${pctV(s.maana) > 5 ? pctV(s.maana)+'%' : ''}</div>` : ''}
        ${s.mutaraddid ? `<div style="width:${pctV(s.mutaraddid)}%;background:#d97706" class="flex items-center justify-center text-white text-xs font-bold">${pctV(s.mutaraddid) > 5 ? pctV(s.mutaraddid)+'%' : ''}</div>` : ''}
        ${s.diddana    ? `<div style="width:${pctV(s.diddana)}%;background:#dc2626"    class="flex items-center justify-center text-white text-xs font-bold">${pctV(s.diddana) > 5 ? pctV(s.diddana)+'%' : ''}</div>` : ''}
      </div>
    </div>

    <!-- Districts breakdown -->
    <div class="card p-3 md:p-5 mb-4">
      <h3 class="font-black text-base md:text-lg mb-3" style="color:#9f1239">🗺️ توزيع الناخبين حسب الدائرة</h3>
      <div class="space-y-3">
        ${s.byDistrict.map(d => `
          <div class="cursor-pointer" onclick="navigate('voters');setTimeout(()=>loadVoters('',${d.id||''}),50)">
            <div class="flex justify-between mb-1">
              <span class="font-bold text-gray-800 text-sm">الدائرة ${d.number}</span>
              <span class="font-black text-sm" style="color:#be123c">${d.voter_count} ناخب</span>
            </div>
            <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="bar" style="width:${s.voters>0?Math.round(d.voter_count/s.voters*100):0}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Quick actions -->
    <div class="card p-3 md:p-5">
      <h3 class="font-black text-base md:text-lg mb-3" style="color:#9f1239">⚡ إجراءات سريعة</h3>
      <div class="grid grid-cols-2 md:flex md:flex-wrap gap-2">
        <button onclick="navigate('voters');setTimeout(()=>openAddModal('voter'),100)" class="btn-rose text-sm">+ إضافة ناخب</button>
        <button onclick="navigate('campaign')" style="background:#059669" class="btn-rose text-sm">🎯 الحملة</button>
        <a href="/api/export/voters" class="btn-dark text-sm text-center">📥 تصدير الناخبين</a>
        <a href="/api/export/districts" class="btn-dark text-sm text-center">📥 تصدير الدوائر</a>
      </div>
    </div>
  `;
}

// ══════ VOTERS ══════
async function loadVoters(search='', districtId='') {
  const c = document.getElementById('page-voters');
  const dists = await getDistricts();
  let url = '/api/voters';
  const p = [];
  if (search)    p.push(`search=${encodeURIComponent(search)}`);
  if (districtId) p.push(`district_id=${districtId}`);
  if (p.length) url += '?' + p.join('&');
  const data = await api(url);

  const distOpts = `<option value="">كل الدوائر</option>${dists.map(d=>`<option value="${d.id}" ${districtId==d.id?'selected':''}>الدائرة ${d.number}</option>`).join('')}`;

  c.innerHTML = `
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl md:text-2xl font-black" style="color:#9f1239">🗳️ قائمة الناخبين</h2>
        <button onclick="openAddModal('voter')" class="btn-rose text-sm">+ إضافة</button>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <input id="voterSearch" type="text" placeholder="🔍 بحث بالاسم..." value="${escHtml(search)}"
          class="inp flex-1" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'" />
        <select id="distFilter" onchange="loadVoters('',this.value)" class="inp sm:w-40"
          onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'">${distOpts}</select>
        <a href="/api/export/voters${districtId?'?district_id='+districtId:''}" class="btn-dark text-sm text-center">📥 Excel</a>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="px-4 py-2 flex items-center gap-2" style="background:#fff0f5">
        <span style="color:#be123c" class="font-bold text-sm">${data.length} ناخب</span>
      </div>
      <div class="tbl-scroll">
        <table class="w-full text-sm" style="min-width:520px">
          <thead class="tbl-head">
            <tr>
              <th class="px-3 py-3 text-center font-bold w-8">#</th>
              <th class="px-3 py-3 text-right font-bold">الاسم العائلي</th>
              <th class="px-3 py-3 text-right font-bold">الاسم الشخصي</th>
              <th class="px-3 py-3 text-right font-bold hide-xs">ت. الازدياد</th>
              <th class="px-3 py-3 text-right font-bold hide-xs">الدائرة</th>
              <th class="px-3 py-3 text-center font-bold">الموقف</th>
              <th class="px-3 py-3 text-center font-bold w-16">⚙️</th>
            </tr>
          </thead>
          <tbody>
            ${data.length===0
              ? `<tr><td colspan="7" class="text-center py-14 text-gray-300 text-xl">لا توجد نتائج</td></tr>`
              : data.map((v,i) => `
                <tr class="tbl-row border-b transition${v.position==='maana'?' row-maana':v.position==='mutaraddid'?' row-mutar':v.position==='diddana'?' row-didd':''}">
                  <td class="px-3 py-2 font-black text-center text-xs" style="color:#be123c">${i+1}</td>
                  <td class="px-3 py-2 font-black text-gray-900 whitespace-nowrap">${escHtml(v.family_name)}</td>
                  <td class="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">${escHtml(v.personal_name)}</td>
                  <td class="px-3 py-2 text-gray-500 text-xs hide-xs whitespace-nowrap">${v.birth_date||'—'}</td>
                  <td class="px-3 py-2 hide-xs"><span class="badge badge-rose">د${v.district_number||'—'}</span></td>
                  <td class="px-3 py-2">
                    <div class="flex gap-1 justify-center">
                      <button onclick="quickPos(${v.id},'maana',this)" class="pos-btn pos-maana${v.position==='maana'?' active':''}">✅<span class="hidden sm:inline"> معنا</span></button>
                      <button onclick="quickPos(${v.id},'mutaraddid',this)" class="pos-btn pos-mutar${v.position==='mutaraddid'?' active':''}">⚠️<span class="hidden sm:inline"> متردد</span></button>
                      <button onclick="quickPos(${v.id},'diddana',this)" class="pos-btn pos-didd${v.position==='diddana'?' active':''}">❌<span class="hidden sm:inline"> ضدنا</span></button>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex gap-1 justify-center">
                      <button onclick="openEditModal('voter',${v.id})" class="p-1 rounded-lg hover:bg-rose-50 text-base">✏️</button>
                      <button onclick="confirmDelete('voter',${v.id},'${escHtml(v.family_name)}')" class="p-1 rounded-lg hover:bg-red-50 text-base">🗑️</button>
                    </div>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('voterSearch').addEventListener('input', e => {
    clearTimeout(window._vt);
    window._vt = setTimeout(() => loadVoters(e.target.value.trim(), districtId), 300);
  });
}

// ══════ DISTRICTS ══════
async function loadDistricts(search='') {
  const c = document.getElementById('page-districts');
  const url = search ? `/api/districts?search=${encodeURIComponent(search)}` : '/api/districts';
  const data = await api(url);
  c.innerHTML = `
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl md:text-2xl font-black" style="color:#9f1239">🗺️ الدوائر الانتخابية</h2>
        <button onclick="openAddModal('district')" class="btn-rose text-sm">+ إضافة</button>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <input id="distSearch" type="text" placeholder="🔍 بحث..." value="${escHtml(search)}"
          class="inp flex-1" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'" />
        <a href="/api/export/districts" class="btn-dark text-sm text-center">📥 Excel</a>
      </div>
    </div>
    <div class="card overflow-hidden">
      <div class="tbl-scroll">
      <table class="w-full text-sm" style="min-width:400px">
        <thead class="tbl-head">
          <tr>
            <th class="px-4 py-3 text-right font-bold">رقم الدائرة</th>
            <th class="px-4 py-3 text-right font-bold">الجماعة</th>
            <th class="px-4 py-3 text-right font-bold">عدد الناخبين</th>
            <th class="px-4 py-3 text-right font-bold">الدواوير</th>
            <th class="px-4 py-3 text-right font-bold">ملاحظات</th>
            <th class="px-4 py-3 text-center font-bold">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${data.length===0
            ? `<tr><td colspan="6" class="text-center py-14 text-gray-300 text-xl">لا توجد نتائج</td></tr>`
            : data.map((d,i) => `
              <tr class="tbl-row border-b">
                <td class="px-4 py-3"><span class="badge badge-rose font-black">الدائرة ${d.number}</span></td>
                <td class="px-4 py-3 font-bold text-gray-800">${escHtml(d.municipality_name)}</td>
                <td class="px-4 py-3 font-black" style="color:#be123c">${d.voter_count_real??d.voter_count}</td>
                <td class="px-4 py-3"><span class="badge badge-dark">${d.douar_count} دوار</span></td>
                <td class="px-4 py-3 text-gray-400 text-xs">${d.notes||'—'}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-1 justify-center">
                    <button onclick="navigate('voters');setTimeout(()=>loadVoters('',${d.id}),50)"
                      class="px-3 py-1 rounded-lg text-xs font-bold transition badge-rose">ناخبين</button>
                    <button onclick="openEditModal('district',${d.id})" class="p-1.5 rounded-lg hover:bg-rose-50">✏️</button>
                    <button onclick="confirmDelete('district',${d.id},'الدائرة ${d.number}')" class="p-1.5 rounded-lg hover:bg-red-50">🗑️</button>
                  </div>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>
  `;
  document.getElementById('distSearch').addEventListener('input', e => {
    clearTimeout(window._dt);
    window._dt = setTimeout(() => loadDistricts(e.target.value.trim()), 300);
  });
}

// ══════ DOUARS ══════
async function loadDouars(search='') {
  const c = document.getElementById('page-douars');
  const url = search ? `/api/douars?search=${encodeURIComponent(search)}` : '/api/douars';
  const data = await api(url);
  c.innerHTML = `
    <div class="mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl md:text-2xl font-black" style="color:#9f1239">🏡 الدواوير</h2>
        <button onclick="openAddModal('douar')" class="btn-rose text-sm">+ إضافة</button>
      </div>
      <input id="douarSearch" type="text" placeholder="🔍 بحث..." value="${escHtml(search)}"
        class="inp" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'" />
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      ${data.length===0
        ? '<div class="col-span-3 text-center py-16 text-gray-300 text-xl">لا توجد نتائج</div>'
        : data.map(d => `
          <div class="card p-5 fade-in">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-black text-gray-900">${escHtml(d.name)}</h3>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span class="badge badge-rose">${escHtml(d.municipality_name)}</span>
                  ${d.district_number ? `<span class="badge badge-dark">الدائرة ${d.district_number}</span>` : ''}
                  <span class="badge ${d.active ? 'badge-green' : ''}" style="${!d.active?'background:#fee2e2;color:#991b1b':''}">${d.active?'نشط':'غير نشط'}</span>
                </div>
              </div>
              <div class="flex gap-1">
                <button onclick="openEditModal('douar',${d.id})" class="p-2 rounded-lg hover:bg-rose-50 text-lg">✏️</button>
                <button onclick="confirmDelete('douar',${d.id},'${escHtml(d.name)}')" class="p-2 rounded-lg hover:bg-red-50 text-lg">🗑️</button>
              </div>
            </div>
            ${d.responsible_name ? `
              <div class="mt-3 p-3 rounded-xl text-sm bg-gray-50">
                <div class="text-gray-500">المسؤول: <span class="font-bold text-gray-800">${escHtml(d.responsible_name)}</span></div>
                ${d.responsible_phone ? `<div class="text-gray-500">📞 ${escHtml(d.responsible_phone)}</div>` : ''}
              </div>` : ''}
          </div>`).join('')}
    </div>
  `;
  document.getElementById('douarSearch').addEventListener('input', e => {
    clearTimeout(window._dwt);
    window._dwt = setTimeout(() => loadDouars(e.target.value.trim()), 300);
  });
}

// ══════ GLOBAL SEARCH ══════
async function globalSearch(q) {
  const voters = await api(`/api/voters?search=${encodeURIComponent(q)}`);
  if (voters.length) { navigate('voters'); loadVoters(q); }
  else { navigate('districts'); loadDistricts(q); }
}

// ══════ MODAL OPEN ══════
function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modal').classList.add('open');
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  modalAction = null; modalType = null; editingId = null;
}

async function openAddModal(type) {
  const dists = await getDistricts();
  const distOpts = `<option value="">اختر الدائرة</option>${dists.map(d=>`<option value="${d.id}">الدائرة ${d.number}</option>`).join('')}`;
  const muns = await api('/api/municipalities');
  const munOpts = `<option value="">اختر الجماعة</option>${muns.map(m=>`<option value="${m.id}">${escHtml(m.name)}</option>`).join('')}`;

  modalAction = 'add'; modalType = type;

  if (type === 'voter') {
    const douars = await api('/api/douars');
    const douarOpts = `<option value="">اختر الدوار (اختياري)</option>${douars.map(d=>`<option value="${d.id}">${escHtml(d.name)}</option>`).join('')}`;
    openModal('إضافة ناخب جديد', `
      <div class="grid grid-cols-2 gap-3">
        <div>${lbl('الاسم العائلي',1)}${inp('f_family_name','مثال: المنصوري')}</div>
        <div>${lbl('الاسم الشخصي',1)}${inp('f_personal_name','مثال: فاطمة')}</div>
      </div>
      <div>${lbl('تاريخ الازدياد')}${inp('f_birth_date','مثال: 01/01/1980')}</div>
      <div>${lbl('العنوان')}${inp('f_address','دوار الوكوم جماعة الوكوم')}</div>
      <div>${lbl('رقم البطاقة الوطنية')}${inp('f_cin','AB123456')}</div>
      <div>${lbl('الدائرة الانتخابية')}${sel('f_district_id',distOpts)}</div>
      <div>${lbl('الدوار')}${sel('f_douar_id',douarOpts)}</div>`);

  } else if (type === 'district') {
    openModal('إضافة دائرة انتخابية', `
      <div>${lbl('الجماعة',1)}${sel('f_mun_id',munOpts)}</div>
      <div>${lbl('رقم الدائرة',1)}${inp('f_number','1','','number')}</div>
      <div>${lbl('ملاحظات')}${ta('f_notes')}</div>`);

  } else if (type === 'douar') {
    openModal('إضافة دوار', `
      <div>${lbl('اسم الدوار',1)}${inp('f_name','مثال: دوار الوكوم')}</div>
      <div>${lbl('الجماعة',1)}${sel('f_mun_id',munOpts)}</div>
      <div>${lbl('الدائرة')}${sel('f_district_id',distOpts)}</div>
      <div class="grid grid-cols-2 gap-3">
        <div>${lbl('المسؤول')}${inp('f_resp_name')}</div>
        <div>${lbl('الهاتف')}${inp('f_resp_phone','06xxxxxxxx')}</div>
      </div>
      <div class="flex items-center gap-2">
        <input id="f_active" type="checkbox" checked class="w-4 h-4" />
        <label for="f_active" class="font-bold text-sm text-gray-700">نشط</label>
      </div>`);
  }
}

async function openEditModal(type, id) {
  const dists = await getDistricts();
  const distOpts = (sel_id) => `<option value="">اختر الدائرة</option>${dists.map(d=>`<option value="${d.id}" ${d.id==sel_id?'selected':''}>${'الدائرة '+d.number}</option>`).join('')}`;
  const muns = await api('/api/municipalities');
  const munOpts = (sel_id) => `<option value="">اختر الجماعة</option>${muns.map(m=>`<option value="${m.id}" ${m.id==sel_id?'selected':''}>${escHtml(m.name)}</option>`).join('')}`;

  modalAction = 'edit'; modalType = type; editingId = id;

  if (type === 'voter') {
    const d = await api(`/api/voters/${id}`);
    const douars = await api('/api/douars');
    const douarOpts = `<option value="">اختر الدوار (اختياري)</option>${douars.map(dw=>`<option value="${dw.id}" ${dw.id==d.douar_id?'selected':''}>${escHtml(dw.name)}</option>`).join('')}`;
    openModal('تعديل بيانات الناخب', `
      <div class="grid grid-cols-2 gap-3">
        <div>${lbl('الاسم العائلي',1)}${inp('f_family_name','',d.family_name)}</div>
        <div>${lbl('الاسم الشخصي',1)}${inp('f_personal_name','',d.personal_name)}</div>
      </div>
      <div>${lbl('تاريخ الازدياد')}${inp('f_birth_date','',d.birth_date||'')}</div>
      <div>${lbl('العنوان')}${inp('f_address','',d.address||'')}</div>
      <div>${lbl('رقم البطاقة الوطنية')}${inp('f_cin','',d.cin||'')}</div>
      <div>${lbl('الدائرة الانتخابية')}${sel('f_district_id',distOpts(d.district_id))}</div>
      <div>${lbl('الدوار')}${sel('f_douar_id',douarOpts)}</div>`);

  } else if (type === 'district') {
    const d = await api(`/api/districts/${id}`);
    openModal('تعديل الدائرة', `
      <div>${lbl('الجماعة',1)}${sel('f_mun_id',munOpts(d.municipality_id))}</div>
      <div>${lbl('رقم الدائرة',1)}${inp('f_number','',d.number,'number')}</div>
      <div>${lbl('ملاحظات')}${ta('f_notes',d.notes||'')}</div>`);

  } else if (type === 'douar') {
    const d = await api(`/api/douars/${id}`);
    openModal('تعديل الدوار', `
      <div>${lbl('اسم الدوار',1)}${inp('f_name','',d.name)}</div>
      <div>${lbl('الجماعة',1)}${sel('f_mun_id',munOpts(d.municipality_id))}</div>
      <div>${lbl('الدائرة')}${sel('f_district_id',distOpts(d.district_id))}</div>
      <div class="grid grid-cols-2 gap-3">
        <div>${lbl('المسؤول')}${inp('f_resp_name','',d.responsible_name||'')}</div>
        <div>${lbl('الهاتف')}${inp('f_resp_phone','',d.responsible_phone||'')}</div>
      </div>
      <div class="flex items-center gap-2">
        <input id="f_active" type="checkbox" ${d.active?'checked':''} class="w-4 h-4" />
        <label for="f_active" class="font-bold text-sm text-gray-700">نشط</label>
      </div>`);
  }
}

// ══════ SAVE ══════
async function saveModal() {
  try {
    let body, url, method;

    if (modalType === 'voter') {
      const family_name = getVal('f_family_name'), personal_name = getVal('f_personal_name');
      if (!family_name || !personal_name) return showToast('الاسم العائلي والشخصي مطلوبان', true);
      body = { family_name, personal_name,
               birth_date: getVal('f_birth_date'),
               address:    getVal('f_address'),
               cin:        getVal('f_cin'),
               district_id: getVal('f_district_id') ? parseInt(getVal('f_district_id')) : null,
               douar_id:    getVal('f_douar_id')    ? parseInt(getVal('f_douar_id'))    : null };
      url    = modalAction==='add' ? '/api/voters' : `/api/voters/${editingId}`;
      method = modalAction==='add' ? 'POST' : 'PUT';

    } else if (modalType === 'district') {
      const number = getVal('f_number'), mun = getVal('f_mun_id');
      if (!number || !mun) return showToast('رقم الدائرة والجماعة مطلوبان', true);
      body = { number: parseInt(number), municipality_id: parseInt(mun), voter_count: 0, notes: getVal('f_notes') };
      url    = modalAction==='add' ? '/api/districts' : `/api/districts/${editingId}`;
      method = modalAction==='add' ? 'POST' : 'PUT';

    } else if (modalType === 'douar') {
      const name = getVal('f_name'), mun = getVal('f_mun_id');
      if (!name || !mun) return showToast('الاسم والجماعة مطلوبان', true);
      body = { name, municipality_id: parseInt(mun),
               district_id: getVal('f_district_id') ? parseInt(getVal('f_district_id')) : null,
               responsible_name: getVal('f_resp_name'), responsible_phone: getVal('f_resp_phone'),
               active: getVal('f_active') };
      url    = modalAction==='add' ? '/api/douars' : `/api/douars/${editingId}`;
      method = modalAction==='add' ? 'POST' : 'PUT';
    }

    await api(url, { method, body });
    closeModal();
    cachedDistricts = [];
    showToast(modalAction==='add' ? '✅ تمت الإضافة بنجاح' : '✅ تم التعديل بنجاح');
    if (currentPage==='dashboard')  loadDashboard();
    else if (currentPage==='voters')    loadVoters();
    else if (currentPage==='districts') loadDistricts();
    else if (currentPage==='douars')    loadDouars();
  } catch(e) { showToast('❌ ' + e.message, true); }
}

// ══════ DELETE ══════
function confirmDelete(type, id, name) {
  document.getElementById('confirmMsg').textContent = `هل تريد حذف "${name}"؟`;
  document.getElementById('confirmOk').onclick = () => doDelete(type, id);
  document.getElementById('confirmDlg').classList.add('open');
}
function closeConfirm() { document.getElementById('confirmDlg').classList.remove('open'); }

async function doDelete(type, id) {
  closeConfirm();
  const urls = { voter:`/api/voters/${id}`, district:`/api/districts/${id}`, douar:`/api/douars/${id}` };
  await api(urls[type], { method:'DELETE' });
  cachedDistricts = [];
  showToast('🗑️ تم الحذف');
  if (currentPage==='dashboard')  loadDashboard();
  else if (currentPage==='voters')    loadVoters();
  else if (currentPage==='districts') loadDistricts();
  else if (currentPage==='douars')    loadDouars();
}

// ══════ CAMPAIGN ══════
async function loadCampaign(search='', position='', douarId='') {
  const c = document.getElementById('page-campaign');
  c.innerHTML = `<div class="text-center py-16 text-rose-300 text-xl animate-pulse">⏳ جارٍ التحميل...</div>`;

  const [s, voters, douars] = await Promise.all([
    api('/api/campaign/stats'),
    api(`/api/campaign/voters${buildQuery({search, position, douar_id: douarId})}`),
    api('/api/douars')
  ]);

  const total = s.total || 1;
  const pct   = n => Math.round(n / total * 100);
  const douarOpts = `<option value="">📍 كل الدواوير</option>${douars.map(d=>`<option value="${d.id}" ${d.id==douarId?'selected':''}>  ${escHtml(d.name)}</option>`).join('')}`;
  const posOpts   = `<option value="">🎯 كل المواقف</option>
    <option value="maana" ${position==='maana'?'selected':''}>✅ معنا</option>
    <option value="mutaraddid" ${position==='mutaraddid'?'selected':''}>⚠️ متردد</option>
    <option value="diddana" ${position==='diddana'?'selected':''}>❌ ضدنا</option>
    <option value="none" ${position==='none'?'selected':''}>— لم يقيَّم</option>`;

  c.innerHTML = `
    <!-- Title -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-xl md:text-2xl font-black" style="color:#9f1239">🎯 إدارة الحملة الانتخابية</h2>
        <p class="text-xs text-gray-400 hidden sm:block">جماعة الوكوم — إقليم طاطا — حزب الاستقلال</p>
      </div>
      <a href="/api/export/campaign" class="btn-dark text-sm">📥 Excel</a>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
      <div class="rounded-2xl p-3 md:p-4 text-center cursor-pointer hover:opacity-90 transition" style="background:#d1fae5" onclick="loadCampaign('','maana','')">
        <div class="text-3xl md:text-4xl font-black text-green-700">${s.maana}</div>
        <div class="text-xs md:text-sm text-green-600 font-bold mt-1">✅ معنا</div>
        <div class="text-xs text-green-500">${pct(s.maana)}%</div>
      </div>
      <div class="rounded-2xl p-3 md:p-4 text-center cursor-pointer hover:opacity-90 transition" style="background:#fef3c7" onclick="loadCampaign('','mutaraddid','')">
        <div class="text-3xl md:text-4xl font-black text-yellow-700">${s.mutaraddid}</div>
        <div class="text-xs md:text-sm text-yellow-600 font-bold mt-1">⚠️ متردد</div>
        <div class="text-xs text-yellow-500">${pct(s.mutaraddid)}%</div>
      </div>
      <div class="rounded-2xl p-3 md:p-4 text-center cursor-pointer hover:opacity-90 transition" style="background:#fee2e2" onclick="loadCampaign('','diddana','')">
        <div class="text-3xl md:text-4xl font-black text-red-700">${s.diddana}</div>
        <div class="text-xs md:text-sm text-red-600 font-bold mt-1">❌ ضدنا</div>
        <div class="text-xs text-red-500">${pct(s.diddana)}%</div>
      </div>
      <div class="rounded-2xl p-3 md:p-4 text-center cursor-pointer hover:opacity-90 transition bg-gray-50" onclick="loadCampaign('','none','')">
        <div class="text-3xl md:text-4xl font-black text-gray-500">${s.notEval}</div>
        <div class="text-xs md:text-sm text-gray-400 font-bold mt-1">⏳ لم يقيَّم</div>
        <div class="text-xs text-gray-400">${pct(s.notEval)}%</div>
      </div>
    </div>

    ${s.maana > (s.mutaraddid + s.diddana) && s.maana > 0 ? `
    <div class="winner-banner rounded-2xl p-4 text-center mb-4 fade-in">
      <div class="text-3xl mb-1">🏆</div>
      <div class="text-xl font-black" style="color:#78350f">فائز! معنا في المقدمة</div>
      <div class="text-sm font-bold mt-1" style="color:#92400e">معنا (${s.maana}) أكثر من متردد + ضدنا (${s.mutaraddid + s.diddana})</div>
    </div>` : s.maana > 0 || s.mutaraddid > 0 || s.diddana > 0 ? `
    <div class="loser-banner rounded-2xl p-4 text-center mb-4 fade-in">
      <div class="text-3xl mb-1">❌</div>
      <div class="text-xl font-black" style="color:#7f1d1d">خاسر! معنا في المؤخرة</div>
      <div class="text-sm font-bold mt-1" style="color:#991b1b">معنا (${s.maana}) أقل من متردد + ضدنا (${s.mutaraddid + s.diddana})</div>
    </div>` : ''}

    <!-- Progress bar -->
    <div class="card p-3 md:p-4 mb-4">
      <div class="flex justify-between text-xs text-gray-500 mb-1">
        <span class="font-bold">${100 - pct(s.notEval)}% مقيَّم</span>
        <span>${s.total} ناخب</span>
      </div>
      <div class="flex h-5 rounded-full overflow-hidden bg-gray-100">
        ${s.maana      ? `<div style="width:${pct(s.maana)}%;background:#059669"     class="flex items-center justify-center text-white text-xs font-bold">${pct(s.maana) > 5 ? pct(s.maana)+'%' : ''}</div>` : ''}
        ${s.mutaraddid ? `<div style="width:${pct(s.mutaraddid)}%;background:#d97706" class="flex items-center justify-center text-white text-xs font-bold">${pct(s.mutaraddid) > 5 ? pct(s.mutaraddid)+'%' : ''}</div>` : ''}
        ${s.diddana    ? `<div style="width:${pct(s.diddana)}%;background:#dc2626"    class="flex items-center justify-center text-white text-xs font-bold">${pct(s.diddana) > 5 ? pct(s.diddana)+'%' : ''}</div>` : ''}
      </div>
      <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
        <span><span class="inline-block w-2.5 h-2.5 rounded-full bg-green-600 ml-1"></span>معنا</span>
        <span><span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500 ml-1"></span>متردد</span>
        <span><span class="inline-block w-2.5 h-2.5 rounded-full bg-red-600 ml-1"></span>ضدنا</span>
        <span><span class="inline-block w-2.5 h-2.5 rounded-full bg-gray-200 ml-1"></span>لم يقيَّم</span>
      </div>
    </div>

    <!-- Douar stats -->
    <div class="card p-3 md:p-4 mb-4">
      <h3 class="font-black text-sm md:text-base mb-3" style="color:#9f1239">📍 إحصائيات حسب الدوار</h3>
      <div class="tbl-scroll">
        <table class="w-full text-sm" style="min-width:420px">
          <thead><tr class="tbl-head">
            <th class="px-3 py-2 text-right font-bold">الدوار</th>
            <th class="px-3 py-2 text-center font-bold">المجموع</th>
            <th class="px-3 py-2 text-center font-bold text-green-300">✅</th>
            <th class="px-3 py-2 text-center font-bold text-yellow-300">⚠️</th>
            <th class="px-3 py-2 text-center font-bold text-red-300">❌</th>
            <th class="px-3 py-2 text-center font-bold">⏳</th>
            <th class="px-3 py-2 text-right font-bold hidden md:table-cell">التقدم</th>
          </tr></thead>
          <tbody>
            ${s.byDouar.map(d => `
              <tr class="tbl-row border-b cursor-pointer hover:opacity-80" onclick="loadCampaign('','','${d.douar_id||''}')">
                <td class="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">${escHtml(d.douar_name)}</td>
                <td class="px-3 py-2 text-center font-black" style="color:#be123c">${d.total}</td>
                <td class="px-3 py-2 text-center"><span class="badge badge-green">${d.maana}</span></td>
                <td class="px-3 py-2 text-center"><span class="badge" style="background:#fef3c7;color:#92400e">${d.mutaraddid}</span></td>
                <td class="px-3 py-2 text-center"><span class="badge" style="background:#fee2e2;color:#991b1b">${d.diddana}</span></td>
                <td class="px-3 py-2 text-center text-gray-400 text-xs">${d.not_eval}</td>
                <td class="px-3 py-2 hidden md:table-cell">
                  <div class="flex h-2 rounded-full overflow-hidden bg-gray-100 w-24">
                    <div style="width:${d.total?Math.round(d.maana/d.total*100):0}%;background:#059669"></div>
                    <div style="width:${d.total?Math.round(d.mutaraddid/d.total*100):0}%;background:#d97706"></div>
                    <div style="width:${d.total?Math.round(d.diddana/d.total*100):0}%;background:#dc2626"></div>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Treatment stats -->
    <div class="card p-3 md:p-4 mb-4">
      <h3 class="font-black text-sm md:text-base mb-3" style="color:#9f1239">🔧 طرق المعالجة</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="border-2 rounded-xl p-3 md:p-4 text-center" style="border-color:#be123c22">
          <div class="text-2xl md:text-3xl font-black" style="color:#be123c">${s.byTreatment[0].count}</div>
          <div class="text-xs md:text-sm text-gray-600 mt-1 font-bold">🏃 زيارة المرشح مباشرة</div>
        </div>
        <div class="border-2 rounded-xl p-3 md:p-4 text-center" style="border-color:#7c3aed22">
          <div class="text-2xl md:text-3xl font-black text-purple-700">${s.byTreatment[1].count}</div>
          <div class="text-xs md:text-sm text-gray-600 mt-1 font-bold">🤝 إرسال شخص يعرفه جيداً ويتواصل معه</div>
        </div>
        <div class="border-2 rounded-xl p-3 md:p-4 text-center" style="border-color:#1d4ed822">
          <div class="text-2xl md:text-3xl font-black text-blue-700">${s.byTreatment[2].count}</div>
          <div class="text-xs md:text-sm text-gray-600 mt-1 font-bold">👥 زيارة مع السيد الحسين بوزيحاي والسيد عبد اللطيف أكناو</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-3 mb-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <input id="campSearch" type="text" placeholder="🔍 البحث بالاسم..." value="${escHtml(search)}"
          class="inp flex-1" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'">
        <select id="campPos" class="inp sm:w-40" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'">${posOpts}</select>
        <select id="campDouar" class="inp sm:w-40" onfocus="this.style.borderColor='#be123c'" onblur="this.style.borderColor='#fca5a5'">${douarOpts}</select>
        <button onclick="document.getElementById('campSearch').value='';loadCampaign()" class="btn-dark text-sm">↺</button>
      </div>
      <div class="mt-1 text-xs text-gray-400">${voters.length} ناخب معروض</div>
    </div>

    <!-- Voters table -->
    <div class="card overflow-hidden">
      <div class="tbl-scroll">
        <table class="w-full text-sm" style="min-width:480px">
          <thead class="tbl-head">
            <tr>
              <th class="px-3 py-3 text-center w-8">#</th>
              <th class="px-3 py-3 text-right font-bold">الاسم العائلي</th>
              <th class="px-3 py-3 text-right font-bold hidden sm:table-cell">الاسم الشخصي</th>
              <th class="px-3 py-3 text-right font-bold hidden md:table-cell">الدوار</th>
              <th class="px-3 py-3 text-center font-bold">الموقف</th>
              <th class="px-3 py-3 text-right font-bold hidden md:table-cell">المعالجة</th>
            </tr>
          </thead>
          <tbody>
            ${voters.length === 0
              ? `<tr><td colspan="6" class="text-center py-14 text-gray-300 text-xl">لا توجد نتائج</td></tr>`
              : voters.map((v, i) => `
                <tr class="tbl-row border-b${v.position==='maana'?' row-maana':v.position==='mutaraddid'?' row-mutar':v.position==='diddana'?' row-didd':''}">
                  <td class="px-3 py-2 text-center text-xs font-black" style="color:#be123c">${i+1}</td>
                  <td class="px-3 py-2 font-black text-gray-900 whitespace-nowrap">${escHtml(v.family_name)}</td>
                  <td class="px-3 py-2 font-semibold text-gray-700 hidden sm:table-cell whitespace-nowrap">${escHtml(v.personal_name)}</td>
                  <td class="px-3 py-2 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">${escHtml(v.douar_name||'—')}</td>
                  <td class="px-3 py-2">
                    <div class="flex gap-1 justify-center">
                      <button onclick="setCampaignPos(${v.id},'maana',this)"      class="pos-btn pos-maana${v.position==='maana'?' active':''}">✅<span class="hidden sm:inline"> معنا</span></button>
                      <button onclick="setCampaignPos(${v.id},'mutaraddid',this)" class="pos-btn pos-mutar${v.position==='mutaraddid'?' active':''}">⚠️<span class="hidden sm:inline"> متردد</span></button>
                      <button onclick="setCampaignPos(${v.id},'diddana',this)"    class="pos-btn pos-didd${v.position==='diddana'?' active':''}">❌<span class="hidden sm:inline"> ضدنا</span></button>
                    </div>
                  </td>
                  <td class="px-3 py-2 hidden md:table-cell">
                    <select onchange="setCampaignTreat(${v.id},this.value)"
                      class="text-xs border rounded-lg px-2 py-1 w-full focus:outline-none"
                      style="border-color:#fca5a5;min-width:160px">
                      <option value="" ${!v.treatment?'selected':''}>— اختر —</option>
                      <option value="v1" ${v.treatment==='v1'?'selected':''}>🏃 زيارة المرشح مباشرة</option>
                      <option value="v2" ${v.treatment==='v2'?'selected':''}>🤝 إرسال شخص يعرفه</option>
                      <option value="v3" ${v.treatment==='v3'?'selected':''}>👥 مع السيد الحسين بوزيحاي</option>
                    </select>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Listeners
  document.getElementById('campSearch').addEventListener('input', e => {
    clearTimeout(window._ct);
    window._ct = setTimeout(() => loadCampaign(e.target.value.trim(),
      document.getElementById('campPos').value,
      document.getElementById('campDouar').value), 300);
  });
  document.getElementById('campPos').addEventListener('change', e =>
    loadCampaign(document.getElementById('campSearch').value, e.target.value, document.getElementById('campDouar').value));
  document.getElementById('campDouar').addEventListener('change', e =>
    loadCampaign(document.getElementById('campSearch').value, document.getElementById('campPos').value, e.target.value));
}

function buildQuery(params) {
  const p = Object.entries(params).filter(([,v]) => v !== '' && v !== undefined && v !== null).map(([k,v]) => `${k}=${encodeURIComponent(v)}`);
  return p.length ? '?' + p.join('&') : '';
}

async function setCampaignPos(id, pos, btn) {
  const row = btn.closest('tr');
  const currentActive = btn.closest('td').querySelector('.active');
  const newPos = currentActive && currentActive === btn ? '' : pos;
  try {
    const treat = row.querySelector('select') ? row.querySelector('select').value : '';
    await api(`/api/voters/${id}/campaign`, { method:'PATCH', body:{ position: newPos, treatment: treat } });
    // Toggle UI
    btn.closest('td').querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
    if (newPos) btn.classList.add('active');
    row.classList.remove('row-maana','row-mutar','row-didd');
    if (newPos === 'maana') row.classList.add('row-maana');
    else if (newPos === 'mutaraddid') row.classList.add('row-mutar');
    else if (newPos === 'diddana') row.classList.add('row-didd');
    showToast('✅ تم الحفظ');
  } catch(e) { showToast('❌ ' + e.message, true); }
}

async function setCampaignTreat(id, treatment) {
  try {
    const row = document.querySelector(`button[onclick*="setCampaignPos(${id},"]`)?.closest('tr');
    const activeBtn = row?.querySelector('.pos-btn.active');
    const position = activeBtn?.classList.contains('pos-maana') ? 'maana'
                   : activeBtn?.classList.contains('pos-mutar') ? 'mutaraddid'
                   : activeBtn?.classList.contains('pos-didd')  ? 'diddana' : '';
    await api(`/api/voters/${id}/campaign`, { method:'PATCH', body:{ position, treatment } });
    showToast('✅ تم الحفظ');
  } catch(e) { showToast('❌ ' + e.message, true); }
}

// Quick position update from the voters list page
async function quickPos(id, pos, btn) {
  const row = btn.closest('tr');
  const currentActive = btn.closest('td').querySelector('.active');
  const newPos = currentActive && currentActive === btn ? '' : pos;
  try {
    await api(`/api/voters/${id}/campaign`, { method:'PATCH', body:{ position: newPos, treatment:'' } });
    btn.closest('td').querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
    if (newPos) btn.classList.add('active');
    row.classList.remove('row-maana','row-mutar','row-didd');
    if (newPos === 'maana') row.classList.add('row-maana');
    else if (newPos === 'mutaraddid') row.classList.add('row-mutar');
    else if (newPos === 'diddana') row.classList.add('row-didd');
    showToast('✅ تم الحفظ');
  } catch(e) { showToast('❌ ' + e.message, true); }
}

// ══════ TOAST ══════
function showToast(msg, err=false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = err ? '#dc2626' : '#be123c';
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  clearTimeout(window._tt);
  window._tt = setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(12px)'; }, 3000);
}
