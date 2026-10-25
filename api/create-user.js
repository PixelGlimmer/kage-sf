import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Используем секретный ключ, который есть только на сервере
  const supabaseAdmin = createClient(
    'https://wpkftawvhikpzqhhuxic.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE
  );

  const { email, password, display_name, role, discord_id } = req.body;

  try {
    // 1. Создаем пользователя в Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) throw authError;

    // 2. Создаем профиль
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        display_name: display_name,
        role: role,
        discord_id: discord_id
      }]);

    if (profileError) throw profileError;

    return res.status(200).json({ success: true, user: authData.user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}