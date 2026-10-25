const SUPABASE_URL = 'https://wpkftawvhikpzqhhuxic.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cfIvLkbOaeDUoS2uqLaxgw_JqmA-tWM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

async function checkAccess() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
  const allowedRoles = ['owner', 'co-owner', 'deputy', 'tech'];

  if (!profile || !allowedRoles.includes(profile.role)) {
    document.getElementById('access-error').innerText = 'У вас нет прав для просмотра этой страницы.';
    return;
  }

  currentUser = profile;
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'flex';
  
  document.getElementById('admin-name').innerText = profile.display_name;
  document.getElementById('admin-role').innerText = profile.role;
  document.getElementById('user-avatar').innerText = profile.display_name.charAt(0).toUpperCase();

  loadTeam();
  loadHistory();
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`tab-${tab}`).style.display = 'block';
  if (btn) btn.classList.add('active');
}

async function loadTeam() {
  const { data: profiles, error } = await supabaseClient.from('profiles').select('*');
  if (error) return showToast('Ошибка загрузки состава', true);
  const tbody = document.getElementById('team-list');
  tbody.innerHTML = '';
  profiles.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.display_name || 'Без имени'}</strong></td>
      <td>${p.discord_id || '—'}</td>
      <td>
        <select class="select-role" id="role-${p.id}">
          <option value="owner" ${p.role === 'owner' ? 'selected' : ''}>Владелец</option>
          <option value="co-owner" ${p.role === 'co-owner' ? 'selected' : ''}>Совладелец</option>
          <option value="deputy" ${p.role === 'deputy' ? 'selected' : ''}>Заместитель</option>
          <option value="tech" ${p.role === 'tech' ? 'selected' : ''}>Тех. Админ</option>
          <option value="recruiter" ${p.role === 'recruiter' ? 'selected' : ''}>Рекрут</option>
        </select>
      </td>
      <td><button class="btn-save" onclick="saveRole('${p.id}')">Сохранить</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveRole(userId) {
  const newRole = document.getElementById(`role-${userId}`).value;
  const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) showToast('Ошибка при смене роли', true);
  else showToast('Роль успешно обновлена!');
}

async function loadHistory() {
  const { data: reports, error } = await supabaseClient.from('reports').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return showToast('Ошибка загрузки истории', true);
  const tbody = document.getElementById('history-list');
  tbody.innerHTML = '';
  reports.forEach(r => {
    const date = new Date(r.created_at).toLocaleString('ru-RU');
    const p = r.payload || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td><span class="tag">${p.command || '—'}</span></td>
      <td>${p.executor_name || '—'}</td>
      <td>${p.full_name || p.player || '—'}</td>
      <td>${p.reason || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

checkAccess();