let csrfToken = null;
let sections = [];
let activeSection = null;

const sectionListEl = document.getElementById('section-list');
const sectionTitleEl = document.getElementById('section-title');
const sectionDescriptionEl = document.getElementById('section-description');
const editorEl = document.getElementById('settings-json');

async function loadMe() {
  const r = await fetch('/listify/api/auth/me.php', { credentials: 'include' });
  const j = await r.json();
  if (!j.ok || !j.data?.authenticated || j.data?.user?.role !== 'admin') {
    alert('Adminrechte erforderlich');
    location.href = '/listify/login.php';
    return false;
  }
  csrfToken = j.data.csrf;
  return true;
}

async function loadSections() {
  const r = await fetch('/listify/api/admin/settings/get.php', { credentials: 'include' });
  const j = await r.json();
  if (!j.ok) {
    alert(j.error || 'Settings konnten nicht geladen werden');
    return;
  }
  sections = j.data.sections || [];
  renderSections();
  if (sections.length > 0) {
    selectSection(sections[0].key);
  }
}

function renderSections() {
  sectionListEl.innerHTML = '';
  sections.forEach((section) => {
    const btn = document.createElement('button');
    btn.className = `section-item${activeSection === section.key ? ' active' : ''}`;
    btn.type = 'button';
    btn.textContent = section.title;
    btn.addEventListener('click', () => selectSection(section.key));
    sectionListEl.appendChild(btn);
  });
}

function selectSection(key) {
  const section = sections.find((s) => s.key === key);
  if (!section) return;
  activeSection = key;
  sectionTitleEl.textContent = section.title;
  sectionDescriptionEl.textContent = section.description || '';
  editorEl.value = JSON.stringify(section.data ?? {}, null, 2);
  renderSections();
}

async function reloadActiveSection() {
  if (!activeSection) return;
  const r = await fetch(`/listify/api/admin/settings/get.php?section=${encodeURIComponent(activeSection)}`, { credentials: 'include' });
  const j = await r.json();
  if (!j.ok) {
    alert(j.error || 'Bereich konnte nicht neu geladen werden');
    return;
  }

  const idx = sections.findIndex((s) => s.key === activeSection);
  if (idx >= 0) {
    sections[idx] = j.data.section;
  }
  selectSection(activeSection);
}

async function saveActiveSection() {
  if (!activeSection) return;

  let parsed;
  try {
    parsed = JSON.parse(editorEl.value);
  } catch (error) {
    alert(`JSON ungültig: ${error.message}`);
    return;
  }

  const r = await fetch('/listify/api/admin/settings/save.php', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ section: activeSection, data: parsed }),
  });

  const j = await r.json();
  if (!j.ok) {
    alert(j.error || 'Speichern fehlgeschlagen');
    return;
  }

  const idx = sections.findIndex((s) => s.key === activeSection);
  if (idx >= 0) {
    sections[idx] = j.data.section;
  }

  selectSection(activeSection);
  alert('Settings gespeichert');
}

document.getElementById('btn-reload')?.addEventListener('click', reloadActiveSection);
document.getElementById('btn-save')?.addEventListener('click', saveActiveSection);

(async function init() {
  const ok = await loadMe();
  if (!ok) return;
  await loadSections();
})();
