(() => {
  const form = document.getElementById('change-password-form');
  const msg = document.getElementById('msg');
  const hint = document.getElementById('hint');
  const btn = document.getElementById('btn-change');
  let csrf = '';

  function setMsg(text, isError = true) {
    msg.textContent = text || '';
    msg.style.color = isError ? '#b91c1c' : '#15803d';
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

  loadMe().catch(() => {
    location.href = '/loptastic/login.php';
  });
})();
