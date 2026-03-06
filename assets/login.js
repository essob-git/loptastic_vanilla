// /loptastic/assets/login.js
(() => {
  const form = document.getElementById('login-form');
  const msg  = document.getElementById('msg');
  const btn  = document.getElementById('btn-login');

  function setMsg(t) { msg.textContent = t || ''; }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('');
    btn.disabled = true;
    try {
      const login = document.getElementById('login').value.trim();
      const password = document.getElementById('password').value;
      const res = await fetch('/loptastic/api/auth/login.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ login, password }),
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
