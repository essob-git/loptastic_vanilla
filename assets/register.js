async function loadDepartments() {
  try {
    const res = await fetch('/loptastic/api/public/settings/registration.php'); // öffentlich lesbar?
    const payload = await res.json();
    const departments = payload?.data?.departments || [];
    const sel = document.getElementById('department');
    departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Abteilungen konnten nicht geladen werden", e);
  }
}

document.addEventListener('DOMContentLoaded', loadDepartments);

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');

  const body = {
    first_name: document.getElementById('first').value.trim(),
    last_name:  document.getElementById('last').value.trim(),
    userid:     document.getElementById('userid').value.trim(),
    email:      document.getElementById('email').value.trim(),
    password:   document.getElementById('pass').value,
    department: document.getElementById('department').value  // NEU
  };

  const pass2 = document.getElementById('pass2').value;
  if (body.password !== pass2) {
    msg.textContent = "Passwörter stimmen nicht überein.";
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
      msg.textContent = "Registrierung erfolgreich! Dein Account muss vom Admin freigegeben werden.";
    } else {
      msg.textContent = "Registrierung erfolgreich! Du kannst dich jetzt einloggen.";
    }
    msg.style.color = "green";
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = "red";
  }
});
