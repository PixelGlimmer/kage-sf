export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
  if (!WEBHOOK) return res.status(500).json({ error: 'Webhook not configured' });

  const d = req.body;
  
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

  const meta = COMMANDS[d.command] || COMMANDS.hire;
  const playerMention = (d.discord_id || '').replace(/\D/g, '');
  const playerLine = playerMention ? `<@${playerMention}>` : `\`${d.player || 'N/A'}\``;

  const fields = [
    { name: '👤 Участник', value: `${playerLine}\n╭ Имя: ${d.full_name || 'N/A'}\n├ Discord ID: ${d.discord_id || 'N/A'}\n╰ Статик ID: ${d.static_id || 'N/A'}`, inline: true },
    { name: '🛡️ Проводит', value: `\`${d.executor_name || 'Админ'}\`\n╰ Отдел: Кадровый аудит`, inline: true },
  ];

  if (d.from_rank) fields.push({ name: '📈 Изменение ранга', value: `\`${d.from_rank}\` → \`${d.to_rank}\`` });
  if (d.action) fields.push({ name: '⚙️ Действие', value: `\`${d.action}\`` });
  if (d.amount) fields.push({ name: '💸 Сумма', value: `\`${d.amount}\`` });
  if (d.reason) fields.push({ name: `📝 ${meta.reason}`, value: `>>> ${d.reason}` });
  
  fields.push({ name: '🕒 Дата оформления', value: `\`${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\`` });

  const embed = {
    title: meta.title,
    color: 0x57f287,
    fields,
    footer: { text: 'Kage Family' },
    timestamp: new Date().toISOString()
  };

  try {
    const r = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Kage Audit', embeds: [embed] })
    });
    return res.status(r.ok ? 200 : 500).json({ success: r.ok });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}