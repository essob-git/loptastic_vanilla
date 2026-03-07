// /loptastic/assets/login.js
(() => {
  const form = document.getElementById('login-form');
  const msg  = document.getElementById('msg');
  const btn  = document.getElementById('btn-login');

  let botProtection = {
    enabled: false,
    honeypot_field: 'company_website',
  };
  let botToken = null;

  function setMsg(t) { msg.textContent = t || ''; }

  function ensureHoneypotField() {
    if (!form) return;

    const existing = document.getElementById('login-bot-honeypot-field');
    if (existing) existing.remove();

    if (!botProtection?.enabled) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'login-bot-honeypot-field';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.width = '1px';
    wrapper.style.height = '1px';
    wrapper.style.overflow = 'hidden';

    const label = document.createElement('label');
    label.setAttribute('for', 'login-hp-input');
    label.textContent = 'Dieses Feld leer lassen';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'login-hp-input';
    input.name = botProtection.honeypot_field || 'company_website';
    input.autocomplete = 'off';
    input.tabIndex = -1;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    form.appendChild(wrapper);
  }

  async function loadLoginSettings() {
    try {
      const res = await fetch('/loptastic/api/public/settings/login.php', { credentials: 'include' });
      const payload = await res.json();
      const data = payload?.data || {};
      botProtection = data.bot_protection || botProtection;
      botToken = data.bot_token || null;
      ensureHoneypotField();
    } catch (err) {
      console.error('Login-Settings konnten nicht geladen werden', err);
    }
  }

  document.addEventListener('DOMContentLoaded', loadLoginSettings);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('');
    btn.disabled = true;
    try {
      const login = document.getElementById('login').value.trim();
      const password = document.getElementById('password').value;
      const honeypot = document.getElementById('login-hp-input')?.value || '';
      const res = await fetch('/loptastic/api/auth/login.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          login,
          password,
          bot_protection: {
            token: botToken,
            honeypot,
          },
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Login fehlgeschlagen');
      location.href = '/loptastic/';
    } catch (err) {
      setMsg(err.message);
    } finally {
      btn.disabled = false;
    }
  });
})();
