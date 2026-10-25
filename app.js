const SUPABASE_URL = 'https://wpkftawvhikpzqhhuxic.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cfIvLkbOaeDUoS2uqLaxgw_JqmA-tWM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COMMANDS = {
  hire: { label: '/принятие', title: 'Отчет о приеме', reason: 'Причина принятия' },
  promote: { label: '/повышение', title: 'Отчет о повышении', reason: 'Причина повышения' },
  demote: { label: '/понижение', title: 'Отчет о понижении', reason: 'Причина понижения' },
  fire: { label: '/увольнение', title: 'Отчет об увольнении', reason: 'Причина увольнения' },
  blacklist: { label: '/черный_список', title: 'Отчет о работе с ЧС', reason: 'Причина' },
  warning: { label: '/выговор', title: 'Отчет о выговоре', reason: 'Причина' },
};

let currentCommand = 'hire';
let currentUser = null;
let executorData = { name: 'Неизвестно', role: 'Рекрут', id: 'n/a' };

function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) { 
    currentUser = session.user; 
    await loadProfileAndShow(session.user); 
  }
}

async function login() {
  const loginInput = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;
  const fakeEmail = `${loginInput.toLowerCase().replace(/\s+/g, '_')}@kage.local`;
  
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email: fakeEmail, password });
  if (error) { document.getElementById('login-error').innerText = 'Неверный логин или пароль'; return; }
  
  currentUser = data.session.user;
  await loadProfileAndShow(currentUser);
}

async function loginWithDiscord() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: window.location.href }
  });
  if (error) showToast('Ошибка OAuth. Войди по логину.', true);
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function loadProfileAndShow(user) {
  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
  
  if (profile && profile.is_banned === true) {
    await supabaseClient.auth.signOut();
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('audit-screen').style.display = 'none';
    document.getElementById('login-error').innerText = '🚫 Ваш аккаунт заблокирован.';
    return;
  }

  if (profile) {
    executorData.name = profile.display_name || 'Без имени';
    executorData.role = profile.role || 'recruiter';
    executorData.id = profile.discord_id || 'n/a';
  }
  
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('audit-screen').style.display = 'flex';
  document.getElementById('executor-name').innerText = executorData.name;
  document.getElementById('preview-role').innerText = executorData.role;
  document.getElementById('user-avatar').innerText = executorData.name.charAt(0).toUpperCase();
  document.getElementById('preview-executor').innerText = executorData.name;
  
  renderCommands();
  setCommand('hire');
}

function renderCommands() {
  const grid = document.getElementById('command-grid');
  grid.innerHTML = '';
  for (const [key, meta] of Object.entries(COMMANDS)) {
    const div = document.createElement('div');
    div.className = `command-item ${key === currentCommand ? 'active' : ''}`;
    div.innerHTML = `<strong>${meta.label}</strong><span>${meta.title}</span>`;
    div.onclick = () => setCommand(key);
    grid.appendChild(div);
  }
}

function setCommand(key) {
  currentCommand = key;
  const meta = COMMANDS[key];
  document.getElementById('preview-title').innerText = meta.title;
  document.getElementById('reason-label').innerText = meta.reason;
  document.querySelectorAll('.command-item').forEach(el => {
    el.classList.toggle('active', el.querySelector('strong').innerText === meta.label);
  });
}

document.getElementById('audit-form').addEventListener('input', () => {
  const form = document.getElementById('audit-form');
  const data = new FormData(form);
  document.getElementById('preview-player').innerText = data.get('full_name') || '...';
  document.getElementById('preview-reason').innerText = data.get('reason') || '...';
});

document.getElementById('login-form').addEventListener('submit', (e) => { e.preventDefault(); login(); });

document.getElementById('audit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.command = currentCommand;
  data.executor_name = executorData.name;
  data.executor_role = executorData.role;
  data.executor_id = executorData.id;

  const { error: dbError } = await supabaseClient.from('reports').insert([{
    author_id: currentUser.id, command: currentCommand, payload: data,
  }]);

  if (dbError) return showToast('Ошибка базы данных', true);

  try {
    const res = await fetch('/api/send-report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast('Отчет успешно отправлен!');
      e.target.reset();
      setCommand(currentCommand);
    } else {
      showToast('Сохранено, но не отправлено в Discord', true);
    }
  } catch (err) {
    showToast('Ошибка соединения', true);
  }
});

checkSession();