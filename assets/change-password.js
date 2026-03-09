(() => {
  const form = document.getElementById('change-password-form');
  const msg = document.getElementById('msg');
  const hint = document.getElementById('hint');
  const btn = document.getElementById('btn-change');
  const newPasswordInput = document.getElementById('new_password');
  const rulesContainer = document.getElementById('password-rules');

  let csrf = '';
  let policy = {
    min_length: 10,
    max_length: 128,
    require_uppercase: false,
    require_lowercase: false,
    require_number: false,
    require_special: false,
  };

  function setMsg(text, isError = true) {
    msg.textContent = text || '';
    msg.style.color = isError ? '#b91c1c' : '#15803d';
  }

  function buildRules() {
    const list = [
      { key: 'lengthMin', label: `Mindestens ${policy.min_length} Zeichen` },
      { key: 'lengthMax', label: `Maximal ${policy.max_length} Zeichen` },
      { key: 'upper', label: 'Mindestens 1 Großbuchstabe (A-Z)', enabled: policy.require_uppercase },
      { key: 'lower', label: 'Mindestens 1 Kleinbuchstabe (a-z)', enabled: policy.require_lowercase },
      { key: 'number', label: 'Mindestens 1 Zahl (0-9)', enabled: policy.require_number },
      { key: 'special', label: 'Mindestens 1 Sonderzeichen', enabled: policy.require_special },
    ];

    rulesContainer.innerHTML = '';
    list.forEach((rule) => {
      if (rule.enabled === false && !['lengthMin', 'lengthMax'].includes(rule.key)) return;
      const row = document.createElement('div');
      row.className = 'pw-rule';
      row.dataset.rule = rule.key;
      row.innerHTML = `<span class="pw-rule-icon">○</span> <span>${rule.label}</span>`;
      rulesContainer.appendChild(row);
    });
  }

  function setRuleState(ruleKey, valid) {
    const row = rulesContainer.querySelector(`[data-rule="${ruleKey}"]`);
    if (!row) return;
    row.classList.toggle('ok', !!valid);
    row.classList.toggle('fail', !valid);
    const icon = row.querySelector('.pw-rule-icon');
    if (icon) icon.textContent = valid ? '✓' : '✗';
  }

  function validateLive(password) {
    const len = password.length;
    setRuleState('lengthMin', len >= policy.min_length);
    setRuleState('lengthMax', len <= policy.max_length);
    setRuleState('upper', !policy.require_uppercase || /[A-Z]/.test(password));
    setRuleState('lower', !policy.require_lowercase || /[a-z]/.test(password));
    setRuleState('number', !policy.require_number || /[0-9]/.test(password));
    setRuleState('special', !policy.require_special || /[^A-Za-z0-9]/.test(password));
  }

  async function loadPolicy() {
    try {
      const res = await fetch('/loptastic/api/public/settings/password_policy.php', { cache: 'no-cache' });
      const data = await res.json();
      if (data?.ok && data?.data?.password_policy) {
        policy = { ...policy, ...data.data.password_policy };
      }
    } catch (err) {
      console.warn('Passwort-Policy konnte nicht geladen werden, nutze Defaults', err);
    }

    buildRules();
    validateLive('');
  }

  async function loadMe() {
    const res = await fetch('/loptastic/api/auth/me.php', { credentials: 'include' });
    const data = await res.json();
    if (!data.ok || !data?.data?.authenticated) {
      location.href = '/loptastic/login.php';
      return;
    }

    csrf = data.data.csrf || '';
    if (data?.data?.user?.force_password_change) {
      hint.textContent = 'Du musst dein vom Admin gesetztes Initial-Passwort jetzt ändern.';
      return;
    }
    hint.textContent = 'Hier kannst du dein Passwort freiwillig ändern.';
    hint.style.color = '#475569';
  }

  newPasswordInput?.addEventListener('input', () => validateLive(newPasswordInput.value || ''));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('');

    const oldPassword = document.getElementById('old_password').value;
    const newPassword = document.getElementById('new_password').value;
    const newPassword2 = document.getElementById('new_password2').value;

    if (!oldPassword || !newPassword) {
      setMsg('Bitte alle Felder ausfüllen.');
      return;
    }
    if (newPassword !== newPassword2) {
      setMsg('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    btn.disabled = true;
    try {
      const res = await fetch('/loptastic/api/auth/change_password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        credentials: 'include'
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Passwort konnte nicht geändert werden');

      setMsg('Passwort erfolgreich geändert. Du wirst zur App weitergeleitet.', false);
      setTimeout(() => {
        location.href = '/loptastic/';
      }, 1000);
    } catch (err) {
      setMsg(err.message || 'Fehler beim Ändern des Passworts');
    } finally {
      btn.disabled = false;
    }
  });

  Promise.all([loadPolicy(), loadMe()]).catch(() => {
    location.href = '/loptastic/login.php';
  });
})();
