export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // СЮДА ВСТАВЬ ССЫЛКУ НА СВОЙ ВЕБХУК DISCORD
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL; 

    const data = req.body;

    // Формируем красивый Embed как на твоем скриншоте
    const embed = {
        title: "Отчет о работе с ЧС по ID",
        color: 0x2ecc71, // Зеленый цвет полоски
        fields: [
            { name: "👤 Участник", value: `**Имя:** ${data.participant_name}\n**Discord ID:** ${data.participant_discord || 'n/a'}\n**Статик ID:** ${data.participant_static_id || 'n/a'}`, inline: true },
            { name: "🛡️ Проводит", value: `**Автор:** ${data.author_email}\n**Роль:** Рекрут\n**Отдел:** Кадровый аудит`, inline: true },
            { name: "📝 Причина", value: data.reason || 'Не указана' },
            { name: "🔗 Доказательство", value: data.proof_url || 'Нет ссылки' },
            { name: "⏱️ Дата оформления", value: new Date().toLocaleString('ru-RU'), inline: true }
        ],
        footer: { text: "Kage Family • Аудит" },
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });

        if (response.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(500).json({ error: 'Discord API error' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
}