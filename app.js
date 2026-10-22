const SUPABASE_URL = 'https://wpkftawvhikpzqhhuxic.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_cfIvLkbOaeDUoS2uqLaxgw_JqmA-tWM';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COMMANDS = {
  hire: { label: '/принятие', title: 'Отчет о приеме участника', reason: 'Причина принятия' },
  promote: { label: '/повышение', title: 'Отчет о повышении участника', reason: 'Причина повышения' },
  demote: { label: '/понижение', title: 'Отчет о понижении участника', reason: 'Причина понижения' },
  fire: { label: '/увольнение', title: 'Отчет об увольнении участника', reason: 'Причина увольнения' },
  fire_blacklist: { label: '/увольнениесчс', title: 'Отчет об увольнении с ЧС', reason: 'Причина увольнения' },
  blacklist: { label: '/черный_список', title: 'Отчет о работе с ЧС', reason: 'Причина' },
  blacklist_id: { label: '/черный_списокid', title: 'Отчет о работе с ЧС по ID', reason: 'Причина' },
  vacation: { label: '/отпуск', title: 'Отчет об отпуске участника', reason: 'Причина отпуска' },
  return: { label: '/возвращение*с*отпуска', title: 'Отчет о возвращении из отпуска', reason: 'Причина возвращения' },
  warning: { label: '/выговор', title: 'Отчет о выговоре', reason: 'Причина' },
  bonus_id: { label: '/премияid', title: 'Отчет о выдаче премии', reason: 'Причина' },
};

let currentCommand = 'hire';
let currentUser = null;

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    showAuditScreen(session.user);
  } else {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('audit-screen').style.display = 'none';
  }
}

async function login() {
  const loginInput = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  
  const fakeEmail = `${loginInput.toLowerCase().replace(/\s+/g, '_')}@kage.local`;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email: fakeEmail, password });
  
  if (error) { errorEl.innerText = 'Неверный логин или пароль'; return; }
  
  currentUser = data.session.user;
  showAuditScreen(currentUser);
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function showAuditScreen(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('audit-screen').style.display = 'block';

  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
  const displayName = profile?.display_name || user.email.split('@')[0];
  const roleLabel = profile?.role || 'Рекрут';
  const discordId = profile?.discord_id || 'не привязан';

  document.getElementById('executor-name').innerText = displayName;
  document.getElementById('executor-id').innerText = `ID: ${discordId}`;
  document.getElementById('preview-executor').innerText = displayName;
  document.getElementById('preview-role').innerText = roleLabel;

  renderCommands();
  setCommand('hire');
  setupPreview();
}

function renderCommands() {
  const grid = document.getElementById('command-grid');
  grid.innerHTML = '';
  for (const [key, meta] of Object.entries(COMMANDS)) {
    const a = document.createElement('a');
    a.href = '#';
    a.className = `audit-command-pill ${key === currentCommand ? 'is-active' : ''}`;
    a.innerHTML = `<span class="audit-command-pill-label">${meta.label}</span><span class="audit-command-pill-title">${meta.title}</span>`;
    a.onclick = (e) => { e.preventDefault(); setCommand(key); };
    grid.appendChild(a);
  }
}

function setCommand(key) {
  currentCommand = key;
  const meta = COMMANDS[key];
  
  document.getElementById('current-command-label').innerText = meta.label;
  document.getElementById('form-title').innerText = meta.title;
  document.getElementById('form-reason-label').innerText = meta.reason;
  document.getElementById('reason-label').innerText = meta.reason;
  document.getElementById('preview-title').innerText = meta.title;
  document.getElementById('preview-command').innerText = meta.label;
  document.getElementById('preview-reason-label').innerText = meta.reason;

  const extra = document.getElementById('extra-fields');
  extra.innerHTML = '';
  if (key === 'promote' || key === 'demote') {
    extra.innerHTML = `
      <label class="audit-field"><span>С ранга</span><input type="text" name="from_rank" required></label>
      <label class="audit-field"><span>На ранг</span><input type="text" name="to_rank" required></label>`;
  } else if (key === 'blacklist' || key === 'warning') {
    extra.innerHTML = `
      <label class="audit-field audit-field-full"><span>Действие</span><input type="text" name="action" placeholder="Выдать / Снять" required></label>`;
  } else if (key === 'bonus_id') {
    extra.innerHTML = `
      <label class="audit-field"><span>Сумма</span><input type="text" name="amount" required></label>`;
  }

  document.querySelectorAll('.audit-command-pill').forEach(el => {
    el.classList.toggle('is-active', el.innerText.includes(meta.label));
  });

  setupPreview();
}

function setupPreview() {
  const form = document.getElementById('audit-form');
  const fields = form.querySelectorAll('input, textarea');
  
  const sync = () => {
    const data = new FormData(form);
    document.getElementById('preview-player').innerText = data.get('player') || '@Не указан';
    document.getElementById('preview-full_name').innerText = data.get('full_name') || 'Не указано';
    document.getElementById('preview-discord_id').innerText = data.get('discord_id') || 'Не указан';
    document.getElementById('preview-reason').innerText = data.get('reason') || 'Причина появится после заполнения.';
    document.getElementById('preview-date').innerText = new Date().toLocaleString('ru-RU');
  };

  fields.forEach(f => f.removeEventListener('input', sync));
  fields.forEach(f => f.addEventListener('input', sync));
  sync();
}

document.getElementById('login-form').addEventListener('submit', (e) => { e.preventDefault(); login(); });

document.getElementById('audit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('audit-status');
  status.innerText = 'Отправка...';
  status.className = 'form-status';

  if (!currentUser) return status.innerText = 'Ошибка: нет сессии.';

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.command = currentCommand;
  
  data.executor_name = document.getElementById('executor-name').innerText;
  data.executor_role = document.getElementById('preview-role').innerText;
  data.executor_id = document.getElementById('executor-id').innerText.replace('ID: ', '');

  const { error: dbError } = await supabaseClient.from('reports').insert([{
    author_id: currentUser.id,
    command: currentCommand,
    payload: data,
  }]);

  if (dbError) {
    status.innerText = 'Ошибка БД: ' + dbError.message;
    status.classList.add('is-error');
    return;
  }

  try {
    const res = await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      status.innerText = '✅ Отчет отправлен в Discord!';
      status.classList.add('is-success');
      e.target.reset();
      setCommand(currentCommand);
    } else {
      status.innerText = '⚠️ Сохранено, но не отправлено в Discord.';
      status.classList.add('is-error');
    }
  } catch (err) {
    status.innerText = '⚠️ Ошибка соединения.';
    status.classList.add('is-error');
  }
});

checkSession();