let passwordPolicy = {
  min_length: 10,
  max_length: 128,
  require_uppercase: false,
  require_lowercase: false,
  require_number: false,
  require_special: false,
};

function renderPasswordRules() {
  const container = document.getElementById('password-rules');
  if (!container) return;

  const rules = [
    { key: 'lengthMin', label: `Mindestens ${passwordPolicy.min_length} Zeichen` },
    { key: 'lengthMax', label: `Maximal ${passwordPolicy.max_length} Zeichen` },
    { key: 'upper', label: 'Mindestens 1 Großbuchstabe (A-Z)', enabled: passwordPolicy.require_uppercase },
    { key: 'lower', label: 'Mindestens 1 Kleinbuchstabe (a-z)', enabled: passwordPolicy.require_lowercase },
    { key: 'number', label: 'Mindestens 1 Zahl (0-9)', enabled: passwordPolicy.require_number },
    { key: 'special', label: 'Mindestens 1 Sonderzeichen', enabled: passwordPolicy.require_special },
  ];

  container.innerHTML = '';
  rules.forEach((rule) => {
    if (rule.enabled === false && !['lengthMin', 'lengthMax'].includes(rule.key)) return;
    const row = document.createElement('div');
    row.className = 'pw-rule';
    row.dataset.rule = rule.key;
    row.innerHTML = `<span class="pw-rule-icon">○</span> <span>${rule.label}</span>`;
    container.appendChild(row);
  });

  updatePasswordRuleStates(document.getElementById('pass')?.value || '');
}

function setRuleState(ruleKey, valid) {
  const row = document.querySelector(`#password-rules [data-rule="${ruleKey}"]`);
  if (!row) return;
  row.classList.toggle('ok', !!valid);
  row.classList.toggle('fail', !valid);
  const icon = row.querySelector('.pw-rule-icon');
  if (icon) icon.textContent = valid ? '✓' : '✗';
}

function updatePasswordRuleStates(password) {
  const len = password.length;
  setRuleState('lengthMin', len >= passwordPolicy.min_length);
  setRuleState('lengthMax', len <= passwordPolicy.max_length);
  setRuleState('upper', !passwordPolicy.require_uppercase || /[A-Z]/.test(password));
  setRuleState('lower', !passwordPolicy.require_lowercase || /[a-z]/.test(password));
  setRuleState('number', !passwordPolicy.require_number || /[0-9]/.test(password));
  setRuleState('special', !passwordPolicy.require_special || /[^A-Za-z0-9]/.test(password));
}

function isPasswordPolicySatisfied(password) {
  if (password.length < passwordPolicy.min_length) return false;
  if (password.length > passwordPolicy.max_length) return false;
  if (passwordPolicy.require_uppercase && !/[A-Z]/.test(password)) return false;
  if (passwordPolicy.require_lowercase && !/[a-z]/.test(password)) return false;
  if (passwordPolicy.require_number && !/[0-9]/.test(password)) return false;
  if (passwordPolicy.require_special && !/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

async function loadDepartmentsAndPolicy() {
  try {
    const res = await fetch('/loptastic/api/public/settings/registration.php');
    const payload = await res.json();
    const departments = payload?.data?.departments || [];
    const policy = payload?.data?.password_policy;

    if (policy) {
      passwordPolicy = { ...passwordPolicy, ...policy };
    }

    const sel = document.getElementById('department');
    departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Abteilungen/Passwort-Policy konnten nicht geladen werden', e);
  }

  renderPasswordRules();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDepartmentsAndPolicy();

  const passInput = document.getElementById('pass');
  passInput?.addEventListener('input', (e) => {
    updatePasswordRuleStates(e.target.value || '');
  });
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');

  const body = {
    first_name: document.getElementById('first').value.trim(),
    last_name:  document.getElementById('last').value.trim(),
    userid:     document.getElementById('userid').value.trim(),
    email:      document.getElementById('email').value.trim(),
    password:   document.getElementById('pass').value,
    department: document.getElementById('department').value
  };

  const pass2 = document.getElementById('pass2').value;
  if (body.password !== pass2) {
    msg.textContent = 'Passwörter stimmen nicht überein.';
    msg.style.color = 'red';
    return;
  }
  if (!isPasswordPolicySatisfied(body.password)) {
    msg.textContent = 'Passwort erfüllt die aktuellen Richtlinien nicht.';
    msg.style.color = 'red';
    return;
  }

  try {
    const res = await fetch('/loptastic/api/auth/register.php', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
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
