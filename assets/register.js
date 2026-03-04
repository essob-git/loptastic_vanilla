async function loadRegistrationSettings() {
  try {
    const res = await fetch('/listify/api/settings/public.php', { cache: 'no-cache' });
    const payload = await res.json();
    if (!payload.ok) throw new Error(payload.error || 'Settings konnten nicht geladen werden');

    const settings = payload.data || {};
    const departments = settings.departments || [];
    const mode = settings.registration_mode || 'approval';

    const sel = document.getElementById('department');
    sel.innerHTML = '';
    departments.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });

    const msg = document.getElementById('msg');
    const submitBtn = document.getElementById('btn-register');
    if (mode === 'closed') {
      msg.textContent = 'Registrierung ist derzeit deaktiviert.';
      msg.style.color = 'red';
      submitBtn.disabled = true;
    } else {
      submitBtn.disabled = false;
      msg.textContent = '';
    }
  } catch (e) {
    console.error('Registrierungseinstellungen konnten nicht geladen werden', e);
  }
}

document.addEventListener('DOMContentLoaded', loadRegistrationSettings);

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');

  const body = {
    first_name: document.getElementById('first').value.trim(),
    last_name: document.getElementById('last').value.trim(),
    userid: document.getElementById('userid').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('pass').value,
    department: document.getElementById('department').value,
  };

  const pass2 = document.getElementById('pass2').value;
  if (body.password !== pass2) {
    msg.textContent = 'Passwörter stimmen nicht überein.';
    return;
  }

  try {
    const res = await fetch('/listify/api/auth/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Fehler bei Registrierung');

    msg.textContent = j.data.pending
      ? 'Registrierung erfolgreich! Dein Account muss vom Admin freigegeben werden.'
      : 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.';
    msg.style.color = 'green';
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = 'red';
  }
});
