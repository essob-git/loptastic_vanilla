// /listify/assets/user-admin.js
let CSRF = null;

function val(id) {
  const node = document.getElementById(id);
  return node ? node.value : '';
}

function clearInputs(...ids) {
  ids.forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.value = '';
  });
}

function linesToArray(value) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

function objectToLines(obj) {
  return Object.entries(obj || {}).map(([key, value]) => `${key}=${value}`).join('\n');
}

function linesToObject(value) {
  const result = {};
  value.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const separator = trimmed.indexOf('=');
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const valPart = trimmed.slice(separator + 1).trim();
    if (key && valPart) {
      result[key] = valPart;
    }
  });
  return result;
}

function setCheckbox(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.checked = value === true || value === 'true';
}

async function me() {
  const response = await fetch('/listify/api/auth/me.php', { credentials: 'include' });
  const data = await response.json();
  if (!data.ok) {
    alert(data.error || 'Fehler');
    location.href = '/listify/login.php';
    return;
  }

  CSRF = data.data.csrf;
  if (!data.data.authenticated || data.data.user.role !== 'admin') {
    alert('Adminrechte erforderlich');
    location.href = '/listify/';
  }
}

async function loadUsers() {
  const response = await fetch('/listify/api/users/list.php', { credentials: 'include' });
  const data = await response.json();
  if (!data.ok) {
    alert(data.error || 'Fehler');
    return;
  }

  const tbody = document.querySelector('#tbl tbody');
  tbody.innerHTML = '';

  data.data.users.forEach((u) => {
    const tr = document.createElement('tr');
    const status = u.pending
      ? '<span class="badge locked">wartet auf Freigabe</span>'
      : (u.locked ? '<span class="badge locked">gesperrt</span>' : 'aktiv');

    tr.innerHTML = `
      <td>${u.first_name} ${u.last_name}</td>
      <td>${u.userid}<br><small>${u.email}</small></td>
      <td><span class="badge ${u.role}">${u.role}</span></td>
      <td>${status}</td>
      <td>${u.department ?? '—'}</td>
      <td>${u.last_login_at ?? '—'}</td>
      <td>${u.created_at ?? '—'}</td>
      <td>
        ${u.pending
    ? `<button onclick="approveUser('${u.id}')">Freigeben</button>`
    : `<button onclick="toggleLock('${u.id}', ${!u.locked})">Sperren/Entsperren</button>`}
        <button onclick="resetPass('${u.id}')">Passwort setzen</button>
        <button onclick="delUser('${u.id}')">Löschen</button>
      </td>`;

    tbody.appendChild(tr);
  });
}

async function approveUser(id) {
  const response = await fetch('/listify/api/users/approve.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify({ id }),
  });
  const data = await response.json();
  if (!data.ok) return alert(data.error || 'Fehler');
  await loadUsers();
}

async function createUser() {
  const body = {
    first_name: val('first_name').trim(),
    last_name: val('last_name').trim(),
    userid: val('userid').trim(),
    email: val('email').trim(),
    role: val('role').trim(),
    password: val('password'),
    department: val('department').trim(),
  };

  const response = await fetch('/listify/api/users/create.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) return alert(data.error || 'Fehler');

  clearInputs('first_name', 'last_name', 'userid', 'email', 'password');
  await loadUsers();
}

async function toggleLock(id, lock) {
  const response = await fetch('/listify/api/users/update.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify({ id, locked: !!lock }),
  });
  const data = await response.json();
  if (!data.ok) return alert(data.error || 'Fehler');
  await loadUsers();
}

async function resetPass(id) {
  const pw = prompt('Neues Passwort:');
  if (!pw) return;

  const response = await fetch('/listify/api/users/set_password.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify({ id, password: pw }),
  });

  const data = await response.json();
  if (!data.ok) return alert(data.error || 'Fehler');
  alert('Passwort aktualisiert');
}

async function delUser(id) {
  if (!confirm('User wirklich löschen?')) return;

  const response = await fetch('/listify/api/users/delete.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify({ id }),
  });

  const data = await response.json();
  if (!data.ok) return alert(data.error || 'Fehler');
  await loadUsers();
}

function fillDepartmentsSelect(departments, selected = '') {
  const select = document.getElementById('department');
  if (!select) return;
  select.innerHTML = '<option value="">-- Abteilung wählen --</option>';
  departments.forEach((department) => {
    const option = document.createElement('option');
    option.value = department;
    option.textContent = department;
    if (department === selected) option.selected = true;
    select.appendChild(option);
  });
}

async function loadSettings() {
  const response = await fetch('/listify/api/settings/get.php', { credentials: 'include' });
  const data = await response.json();
  if (!data.ok) {
    alert(data.error || 'Settings konnten nicht geladen werden');
    return;
  }

  const registration = data.data.registration || {};
  const listify = data.data.listify || {};

  document.getElementById('registration_mode').value = registration.registration_mode || 'approval';
  document.getElementById('registration_departments').value = (registration.departments || []).join('\n');
  fillDepartmentsSelect(registration.departments || []);

  document.getElementById('theme').value = listify.theme || 'light';
  setCheckbox('createdate_dateonly', listify.itemEditor_createdate_DateOnly);
  setCheckbox('deadline_dateonly', listify.itemEditor_deadline_DateOnly);
  document.getElementById('comment_limit').value = listify.commentLimit ?? 150;
  document.getElementById('comment_categories').value = (listify.commentCategories || []).join('\n');
  document.getElementById('lists_phase').value = objectToLines(listify.lists_phase || {});
}

async function saveSettings() {
  const registration = {
    registration_mode: val('registration_mode'),
    departments: linesToArray(val('registration_departments')),
  };

  const listify = {
    theme: val('theme').trim() || 'light',
    itemEditor_createdate_DateOnly: document.getElementById('createdate_dateonly')?.checked,
    itemEditor_deadline_DateOnly: document.getElementById('deadline_dateonly')?.checked,
    commentLimit: Number(val('comment_limit')),
    commentCategories: linesToArray(val('comment_categories')),
    lists_phase: linesToObject(val('lists_phase')),
  };

  const response = await fetch('/listify/api/settings/update.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
    body: JSON.stringify({ registration, listify }),
  });

  const data = await response.json();
  if (!data.ok) {
    alert(data.error || 'Settings konnten nicht gespeichert werden');
    return;
  }

  fillDepartmentsSelect(data.data.registration.departments || [], val('department'));
  alert('Settings gespeichert');
}

document.getElementById('btn-create')?.addEventListener('click', createUser);
document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);

window.approveUser = approveUser;
window.toggleLock = toggleLock;
window.resetPass = resetPass;
window.delUser = delUser;

(async function init() {
  await me();
  await loadSettings();
  await loadUsers();
}());
