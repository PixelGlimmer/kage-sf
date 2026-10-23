import { verifyKey } from 'discord-interactions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpkftawvhikpzqhhuxic.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = JSON.stringify(req.body);

  // Проверка, что запрос реально от Discord
  const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) return res.status(401).send('Invalid request signature');

  const interaction = req.body;

  // 1. Проверка пинга (нужно для Discord)
  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // 2. Обработка команды /аудит
  if (interaction.type === 2 && interaction.data.name === 'аудит') {
    // Собираем данные из формы Discord
    const options = interaction.data.options;
    const getVal = (name) => options.find(o => o.name === name)?.value || 'n/a';
    
    const command = getVal('команда');
    const player = getVal('участник');
    const discordId = getVal('discord_id');
    const reason = getVal('причина');
    const staticId = getVal('статик_id');

    // Имя того, кто нажал кнопку
    const authorName = interaction.member.user.global_name || interaction.member.user.username;
    const authorId = interaction.member.user.id;

    // Отправляем эмбед в Discord (через вебхук)
    const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
    
    const embed = {
      title: `Отчет: ${command}`,
      color: 0x57f287,
      fields: [
        { name: '👤 Участник', value: `<@${discordId}>\nИмя: ${player}\nСтатик ID: ${staticId}`, inline: true },
        { name: '🛡️ Проводит', value: `\`${authorName}\`\nDiscord ID: ${authorId}`, inline: true },
        { name: '📝 Причина', value: reason }
      ],
      footer: { text: 'Kage Family • Из Discord' },
      timestamp: new Date().toISOString()
    };

    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Kage Audit', embeds: [embed] })
    });

    // Сохраняем в Supabase (чтобы было на сайте в истории)
    await supabase.from('reports').insert([{
      author_id: null, // В идеале нужно привязать бота к профилю по Discord ID
      command: command,
      payload: { player, discordId, reason, staticId, authorName, source: 'discord' }
    }]);

    // Отвечаем пользователю в Discord
    return res.status(200).json({
      type: 4, // Ответ с сообщением
      data: { content: `✅ Аудит для <@${discordId}> успешно отправлен!` }
    });
  }

  return res.status(400).json({ error: 'Unknown interaction' });
}