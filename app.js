// ВСТАВЬ СЮДА СВОИ ДАННЫЕ ИЗ SUPABASE (Project Settings -> API)
const SUPABASE_URL = 'https://wpkftawvhikpzqhhuxic.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_cfIvLkbOaeDUoS2uqLaxgw_JqmA-tWM';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Проверка сессии при загрузке
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    toggleUI(session);
}

// Вход
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        document.getElementById('auth-error').innerText = error.message;
    } else {
        toggleUI(data.session);
    }
}

// Выход
async function logout() {
    await supabase.auth.signOut();
    toggleUI(null);
}

// Переключение интерфейса
async function toggleUI(session) {
    if (session) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('report-section').style.display = 'block';
        
        // Получаем роль пользователя
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        document.getElementById('user-role').innerText = profile ? profile.role : 'Нет роли';
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('report-section').style.display = 'none';
    }
}

// Отправка формы
document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('form-status');
    status.innerText = 'Отправка...';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return status.innerText = 'Ошибка: вы не авторизованы.';

    const reportData = {
        author_id: session.user.id,
        participant_name: document.getElementById('participant_name').value,
        participant_discord: document.getElementById('participant_discord').value,
        participant_static_id: document.getElementById('participant_static').value,
        reason: document.getElementById('reason').value,
        proof_url: document.getElementById('proof_url').value,
    };

    // 1. Сохраняем в Supabase
    const { error: dbError } = await supabase.from('reports').insert([reportData]);
    if (dbError) {
        status.innerText = 'Ошибка БД: ' + dbError.message;
        return;
    }

    // 2. Отправляем на наш скрытый API Vercel (который отправит в Discord)
    try {
        const response = await fetch('/send-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...reportData, author_email: session.user.email })
        });
        
        if (response.ok) {
            status.innerText = '✅ Отчет успешно создан и отправлен в Discord!';
            document.getElementById('report-form').reset();
        } else {
            status.innerText = '⚠️ Сохранено в БД, но не отправлено в Discord.';
        }
    } catch (err) {
        status.innerText = '⚠️ Ошибка соединения с сервером.';
    }
});

checkSession();