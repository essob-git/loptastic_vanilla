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

    const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    tr.appendChild(el('td', {}, [fullName || '—']));

    const userCell = document.createElement('td');
    userCell.appendChild(txt(u.userid ?? '—'));
    userCell.appendChild(document.createElement('br'));
    userCell.appendChild(el('small', {}, [u.email ?? '—']));
    tr.appendChild(userCell);

    const roleBadge = el('span', { class: `badge ${u.role === 'admin' ? 'admin' : 'user'}` }, [u.role ?? 'user']);
    tr.appendChild(el('td', {}, [roleBadge]));

    const statusCell = document.createElement('td');
    if (u.pending) {
      statusCell.appendChild(el('span', { class: 'badge locked' }, ['wartet auf Freigabe']));
    } else {
      statusCell.appendChild(txt(u.locked ? 'gesperrt' : 'aktiv'));
    }
    tr.appendChild(statusCell);

    tr.appendChild(el('td', {}, [u.department || '—']));
    tr.appendChild(el('td', {}, [u.last_login_at ?? '—']));
    tr.appendChild(el('td', {}, [u.created_at ?? '—']));

    const actionsCell = document.createElement('td');
    if (u.pending) {
      const approveBtn = el('button', {}, ['Freigeben']);
      approveBtn.addEventListener('click', () => approveUser(u.id));
      actionsCell.appendChild(approveBtn);
    } else {
      const toggleBtn = el('button', {}, ['Sperren/Entsperren']);
      toggleBtn.addEventListener('click', () => toggleLock(u.id, !u.locked));
      actionsCell.appendChild(toggleBtn);
    }

    const resetBtn = el('button', {}, ['Passwort setzen']);
    resetBtn.addEventListener('click', () => resetPass(u.id));
    actionsCell.appendChild(resetBtn);

    const deleteBtn = el('button', {}, ['Löschen']);
    deleteBtn.addEventListener('click', () => delUser(u.id));
    actionsCell.appendChild(deleteBtn);

    tr.appendChild(actionsCell);
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
