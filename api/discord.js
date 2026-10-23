import { verifyKey } from 'discord-interactions';

export default async function handler(req, res) {
  // 1. Проверяем метод
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = JSON.stringify(req.body);

  // 2. Проверка подписи
  try {
    const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
      console.error('Ошибка: Неверная подпись! Проверь DISCORD_PUBLIC_KEY');
      return res.status(401).send('Invalid request signature');
    }
  } catch (err) {
    console.error('Ошибка при проверке подписи:', err.message);
    return res.status(500).send('Signature verification error');
  }

  const interaction = req.body;

  // 3. Пинг
  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // 4. Просто отвечаем на любую команду
  if (interaction.type === 2) {
    return res.status(200).json({
      type: 4,
      data: { content: 'Бот работает! Привет от Vercel!' }
    });
  }
}