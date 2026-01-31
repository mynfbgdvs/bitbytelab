document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('contactForm');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Sending...';

  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    message: document.getElementById('message').value.trim(),
  };

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = 'Message sent — thanks!';
      form.reset();
    } else {
      statusEl.textContent = data.error || 'Failed to send message';
    }
  } catch (err) {
    statusEl.textContent = 'Network error — try again';
  }

  setTimeout(() => { statusEl.textContent = ''; }, 4000);
});