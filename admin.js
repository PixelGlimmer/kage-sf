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
  loadMembers();
  loadHistory();
  loadWarnings();
  loadVacations();
  loadBans();
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).style.display = 'block';
  if (btn) btn.classList.add('active');
}

// === СОСТАВ ===
async function loadTeam() {
  const { data: profiles, error } = await supabaseClient.from('profiles').select('*');
  if (error) return showToast('Ошибка загрузки состава', true);
  const tbody = document.getElementById('team-list');
  tbody.innerHTML = '';
  
  profiles.forEach(p => {
    const isVacation = p.vacation_start && p.vacation_end && new Date(p.vacation_end) >= new Date();
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
      <td><span class="status-badge ${isVacation ? 'vacation' : 'active'}">${isVacation ? '🌴 В отпуске' : '🟢 В сети'}</span></td>
      <td style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn-save" onclick="saveRole('${p.id}')">💾 Роль</button>
        <button class="btn-save" style="background: var(--warning); color: #000;" onclick="openWarningModal('${p.id}')">⚠️ Выговор</button>
        <button class="btn-save" style="background: var(--success); color: #000;" onclick="openVacationModal('${p.id}')">🌴 Отпуск</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveRole(userId) {
  const newRole = document.getElementById(`role-${userId}`).value;
  const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) showToast('Ошибка: ' + error.message, true);
  else showToast('Роль обновлена!');
}

// === УЧАСТНИКИ ===
async function loadMembers() {
  const { data: members, error } = await supabaseClient.from('members').select('*').order('created_at', { ascending: false });
  if (error) return;
  const tbody = document.getElementById('members-list');
  tbody.innerHTML = '';
  members.forEach(m => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${m.nickname}</strong></td>
        <td>${m.static_id}</td>
        <td>${m.rp_name || '—'}</td>
        <td><span class="tag">${m.rank || '—'}</span></td>
      </tr>`;
  });
}

function openMemberModal() { document.getElementById('member-modal').style.display = 'flex'; }
function closeMemberModal() { document.getElementById('member-modal').style.display = 'none'; }

document.getElementById('member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const { error } = await supabaseClient.from('members').insert([{
    nickname: data.nickname, static_id: data.static_id, rp_name: data.rp_name || null, rank: data.rank || null
  }]);
  if (error) showToast('Ошибка добавления', true);
  else { showToast('Участник добавлен!'); closeMemberModal(); loadMembers(); }
});

// === ИСТОРИЯ ===
async function loadHistory() {
  const { data: reports } = await supabaseClient.from('reports').select('*').order('created_at', { ascending: false }).limit(50);
  const tbody = document.getElementById('history-list');
  tbody.innerHTML = '';
  if(reports) reports.forEach(r => {
    const p = r.payload || {};
    tbody.innerHTML += `
      <tr>
        <td>${new Date(r.created_at).toLocaleString('ru-RU')}</td>
        <td><span class="tag">${p.command || '—'}</span></td>
        <td>${p.executor_name || '—'}</td>
        <td>${p.full_name || p.player || '—'}</td>
        <td>${p.reason || '—'}</td>
      </tr>`;
  });
}

// === ВЫГОВОРЫ ===
async function loadWarnings() {
  const { data: warnings } = await supabaseClient.from('warnings').select('*, profiles:user_id(display_name)').order('created_at', { ascending: false });
  const tbody = document.getElementById('warnings-list');
  tbody.innerHTML = '';
  if(warnings) warnings.forEach(w => {
    tbody.innerHTML += `
      <tr>
        <td>${w.profiles?.display_name || 'Неизвестно'}</td>
        <td>${w.reason}</td>
        <td>${new Date(w.created_at).toLocaleDateString('ru-RU')}</td>
        <td>${w.issued_by || '—'}</td>
      </tr>`;
  });
}

function openWarningModal(userId) {
  document.getElementById('warning-user-id').value = userId;
  document.getElementById('warning-modal').style.display = 'flex';
}
function closeWarningModal() { document.getElementById('warning-modal').style.display = 'none'; }

document.getElementById('warning-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const userId = formData.get('user_id');
  const reason = formData.get('reason');
  
  const { error } = await supabaseClient.from('warnings').insert([{
    user_id: userId, issued_by: currentUser.display_name, reason: reason
  }]);

  if (error) showToast('Ошибка выдачи', true);
  else {
    showToast('Выговор выдан!');
    closeWarningModal();
    loadWarnings();
  }
});

// === ОТПУСКА ===
async function loadVacations() {
  const { data: vacations } = await supabaseClient.from('profiles').select('*');
  const tbody = document.getElementById('vacations-list');
  tbody.innerHTML = '';
  if(vacations) vacations.forEach(p => {
    const start = p.vacation_start ? new Date(p.vacation_start).toLocaleDateString('ru-RU') : 'n/a';
    const end = p.vacation_end ? new Date(p.vacation_end).toLocaleDateString('ru-RU') : 'n/a';
    const isActive = p.vacation_start && p.vacation_end && new Date(p.vacation_end) >= new Date();
    tbody.innerHTML += `
      <tr>
        <td><strong>${p.display_name}</strong></td>
        <td>${start}</td>
        <td>${end}</td>
        <td>${isActive ? '<span class="status-badge vacation">В отпуске</span>' : '<span class="status-badge active">Работает</span>'}</td>
      </tr>`;
  });
}

function openVacationModal(userId) {
  document.getElementById('vacation-user-id').value = userId;
  document.getElementById('vacation-modal').style.display = 'flex';
}
function closeVacationModal() { document.getElementById('vacation-modal').style.display = 'none'; }

document.getElementById('vacation-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const userId = formData.get('user_id');
  const start = formData.get('start_date');
  const end = formData.get('end_date');

  const { error } = await supabaseClient
    .from('profiles')
    .update({ vacation_start: start, vacation_end: end })
    .eq('id', userId);

  if (error) showToast('Ошибка отпуска', true);
  else {
    showToast('Отпуск оформлен!');
    closeVacationModal();
    loadTeam();
    loadVacations();
  }
});

// === БАНЫ ===
async function loadBans() {
  const { data: profiles } = await supabaseClient.from('profiles').select('*');
  const tbody = document.getElementById('bans-list');
  tbody.innerHTML = '';
  if(profiles) profiles.forEach(p => {
    const isBanned = p.is_banned === true;
    tbody.innerHTML += `
      <tr>
        <td><strong>${p.display_name}</strong></td>
        <td>${p.discord_id || '—'}</td>
        <td>${p.role}</td>
        <td>
          <button class="btn-save" style="background: ${isBanned ? 'var(--success)' : 'var(--danger)'};" 
                  onclick="toggleBan('${p.id}', ${isBanned})">
            ${isBanned ? 'Разбанить' : 'Забанить'}
          </button>
        </td>
      </tr>`;
  });
}

async function toggleBan(userId, currentStatus) {
  const { error } = await supabaseClient.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
  if (error) showToast('Ошибка бана: ' + error.message, true);
  else {
    showToast(currentStatus ? 'Разбанен' : 'Забанен');
    loadBans();
    loadTeam();
  }
}

// === СОЗДАНИЕ СОТРУДНИКА ===
function openCreateModal() { document.getElementById('create-modal').style.display = 'flex'; }
function closeCreateModal() { document.getElementById('create-modal').style.display = 'none'; }

document.getElementById('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.email = `${data.login.toLowerCase().replace(/\s+/g, '_')}@kage.local`;
  data.password = '123456';

  try {
    const res = await fetch('/api/create-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    showToast('Сотрудник создан!');
    closeCreateModal();
    loadTeam();
  } catch (err) { showToast(err.message, true); }
});

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

checkAccess();