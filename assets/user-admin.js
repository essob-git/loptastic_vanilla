// /loptastic/assets/user-admin.js
let CSRF = null;

function txt(t){ return document.createTextNode(t ?? ''); }
function el(name, props={}, children=[]) {
  const e = document.createElement(name);
  Object.entries(props).forEach(([k,v])=>{
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  children.forEach(c => e.appendChild(typeof c==='string'?txt(c):c));
  return e;
}
//function val(id){ return document.getElementById(id).value.trim(); }
function val(id){
  const el = document.getElementById(id);
  return el ? el.value : '';
}
function clearInputs(...ids){ ids.forEach(i=>{ const el = document.getElementById(i); if (el) el.value=''; }); }

async function me() {
  const r = await fetch('/loptastic/api/auth/me.php', {credentials:'include'});
  const j = await r.json();
  if (!j.ok) { alert(j.error||'Fehler'); location.href='/loptastic/login.php'; return; }
  CSRF = j.data.csrf;
  if (!j.data.authenticated || (j.data.user.role!=='admin')) {
    alert('Adminrechte erforderlich'); location.href='/loptastic/'; return;
  }
}

async function loadUsers() {
  const r = await fetch('/loptastic/api/users/list.php', {credentials:'include'});
  const j = await r.json();
  if (!j.ok) { alert(j.error||'Fehler'); return; }

  const tb = document.querySelector('#tbl tbody');
  tb.innerHTML = ''; // alte Zeilen löschen

  j.data.users.forEach(u=>{
    const tr = document.createElement('tr');
const status = u.pending 
  ? '<span class="badge locked">wartet auf Freigabe</span>' 
  : (u.locked ? '<span class="badge locked">gesperrt</span>' : 'aktiv');

const passwordStatus = u.force_password_change
  ? '<span class="badge locked">Passwortwechsel erforderlich</span>'
  : '<span class="badge user">ok</span>';

tr.innerHTML = `
  <td>${u.first_name} ${u.last_name}</td>
  <td>${u.userid}<br><small>${u.email}</small></td>
  <td><span class="badge ${u.role}">${u.role}</span></td>
  <td>${status}</td>
  <td>${u.department ?? '—'}</td>
  <td>${u.last_login_at ?? '—'}</td>
  <td>${u.created_at ?? '—'}</td>
  <td>${passwordStatus}</td>
  <td>
    ${u.pending 
      ? `<button onclick="approveUser('${u.id}')">Freigeben</button>`
      : `<button onclick="toggleLock('${u.id}', ${!u.locked})">Sperren/Entsperren</button>`
    }
    <button onclick="resetPass('${u.id}')">Passwort setzen</button>
    <button onclick="forcePwChange('${u.id}')">Passwort-Reset erzwingen</button>
    <button onclick="delUser('${u.id}')">Löschen</button>
  </td>`;
    tb.appendChild(tr);
  });
}
async function approveUser(id) {
  const r = await fetch('/loptastic/api/users/approve.php', {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json','X-CSRF-Token':CSRF},
    body: JSON.stringify({id})
  });
  const j = await r.json();
  if (!j.ok) return alert(j.error||'Fehler');
  loadUsers();
}
async function createUser() {
  const body = {
    first_name: val('first_name'),
    last_name: val('last_name'),
    userid: val('userid'),
    email: val('email'),
    role: val('role'),
    password: val('password'),
    department: val('department')
  };
  const r = await fetch('/loptastic/api/users/create.php', {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json','X-CSRF-Token':CSRF},
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!j.ok) return alert(j.error||'Fehler');
  clearInputs('first_name','last_name','userid','email','password');
  loadUsers();
}

async function toggleLock(id, lock) {
  const r = await fetch('/loptastic/api/users/update.php', {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json','X-CSRF-Token':CSRF},
    body: JSON.stringify({id, locked: !!lock})
  });
  const j = await r.json();
  if (!j.ok) return alert(j.error||'Fehler');
  loadUsers();
}

async function resetPass(id) {
  const pw = prompt('Neues Passwort:');
  if (!pw) return;
  const r = await fetch('/loptastic/api/users/set_password.php', {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json','X-CSRF-Token':CSRF},
    body: JSON.stringify({id, password: pw})
  });
  const j = await r.json();
  if (!j.ok) return alert(j.error||'Fehler');
  alert('Passwort aktualisiert');
  loadUsers();
}

async function forcePwChange(id) {
  const r = await fetch('/loptastic/api/users/force_password_reset.php', {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json','X-CSRF-Token':CSRF},
    body: JSON.stringify({id})
  });
  const j = await r.json();
  if (!j.ok) return alert(j.error||'Fehler');
  alert('Passwort-Reset wurde für den nächsten Login erzwungen');
  loadUsers();
}

async function delUser(id) {
  if (!confirm('User wirklich löschen?')) return;
  const r = await fetch('/loptastic/api/users/delete.php', {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json','X-CSRF-Token':CSRF},
    body: JSON.stringify({id})
  });
  const j = await r.json();
  if (!j.ok) return alert(j.error||'Fehler');
  loadUsers();
}

async function loadDepartmentsSelect(selectId, currentValue="") {
  try {
    const res = await fetch('/loptastic/api/public/settings/registration.php', {cache:"no-cache"});
    const payload = await res.json();
    const departments = payload?.data?.departments || [];
    const sel = document.getElementById(selectId);
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Abteilung wählen --</option>';
    departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      if (d === currentValue) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Abteilungen konnten nicht geladen werden", e);
  }
}


document.getElementById('btn-create')?.addEventListener('click', createUser);

(async function init(){
  await me();

  await loadDepartmentsSelect("department");
    await loadUsers();
})();
