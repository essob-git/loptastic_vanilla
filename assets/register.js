let registrationSettings = {
  departments: [],
  botProtection: {
    enabled: false,
    honeypot_field: 'company_website',
  },
  botToken: null,
};

function renderDepartments(departments) {
  const sel = document.getElementById('department');
  if (!sel) return;
  sel.innerHTML = '';
  departments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
}

function ensureHoneypotField(botProtection) {
  const form = document.getElementById('register-form');
  if (!form) return;

  const existing = document.getElementById('bot-honeypot-field');
  if (existing) existing.remove();

  if (!botProtection?.enabled) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'bot-honeypot-field';
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.style.width = '1px';
  wrapper.style.height = '1px';
  wrapper.style.overflow = 'hidden';

  const label = document.createElement('label');
  label.setAttribute('for', 'hp-input');
  label.textContent = 'Dieses Feld leer lassen';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'hp-input';
  input.name = botProtection.honeypot_field || 'company_website';
  input.autocomplete = 'off';
  input.tabIndex = -1;

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  form.appendChild(wrapper);
}

async function loadRegistrationSettings() {
  try {
    const res = await fetch('/loptastic/api/public/settings/registration.php');
    const payload = await res.json();

    const data = payload?.data || {};
    registrationSettings.departments = data.departments || [];
    registrationSettings.botProtection = data.bot_protection || registrationSettings.botProtection;
    registrationSettings.botToken = data.bot_token || null;

    renderDepartments(registrationSettings.departments);
    ensureHoneypotField(registrationSettings.botProtection);
  } catch (e) {
    console.error('Registrierungs-Settings konnten nicht geladen werden', e);
  }
}

document.addEventListener('DOMContentLoaded', loadRegistrationSettings);

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');

  const honeypotValue = document.getElementById('hp-input')?.value || '';

  const body = {
    first_name: document.getElementById('first').value.trim(),
    last_name: document.getElementById('last').value.trim(),
    userid: document.getElementById('userid').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('pass').value,
    department: document.getElementById('department').value,
    bot_protection: {
      token: registrationSettings.botToken,
      honeypot: honeypotValue,
    },
  };

  const pass2 = document.getElementById('pass2').value;
  if (body.password !== pass2) {
    msg.textContent = 'Passwörter stimmen nicht überein.';
    return;
  }

  try {
    const res = await fetch('/loptastic/api/auth/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Fehler bei Registrierung');

    if (j.data.pending) {
      msg.textContent = 'Registrierung erfolgreich! Dein Account muss vom Admin freigegeben werden.';
    } else {
      msg.textContent = 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.';
    }
    msg.style.color = 'green';
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = 'red';
  }
});
