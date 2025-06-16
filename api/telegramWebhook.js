export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const body = req.body;
  console.log("📩 Telegram sent:", JSON.stringify(body));

  const token = "7942048169:AAEnNrMPJBKWFngn6EQVFQOfk7-bPmm3PfY";
  const telegramApi = `https://api.telegram.org/bot${token}/sendMessage`;

  if (body.message && body.message.text === "/start") {
    const chat_id = body.message.chat.id;
    const from_id = body.message.from.id;

    const referralUrl = `https://t.me/flipgame30bot/flipgame?startapp=rngs_${from_id}`;

    const message = {
      chat_id,
      text: `👋 Welcome to FlipGame!\nTap the button below to start playing & earn coins.`,
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🎮 Start Game",
            web_app: {
              url: referralUrl
            }
          }
        ]]
      }
    };

    await fetch(telegramApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });
  }

  res.status(200).send("OK");
}
