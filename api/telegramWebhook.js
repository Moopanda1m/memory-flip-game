export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const body = req.body;
  console.log("📩 Telegram sent update:", JSON.stringify(body));

  const token = "7942048169:AAEnNrMPJBKWFngn6EQVFQOfk7-bPmm3PfY";
  const telegramApi = `https://api.telegram.org/bot${token}/sendMessage`;   

  if (body.message?.text?.trim().toLowerCase() === "/start") {
    const chat_id = body.message.chat.id;
    const from_id = body.message.from.id;

    const referralUrl = `https://t.me/flipgame30bot/flipgame?startapp=rngs_${from_id}`;

    const message = {
      chat_id,
      text: `👋 Welcome to FlipGame!\n\nTap the button below to start playing & earn coins.`,
      parse_mode: "Markdown",
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

    try {
      const response = await fetch(telegramApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
      });

      const result = await response.json();
      console.log("✅ Telegram API Response:", result);

      if (!result.ok) {
        console.error("❌ Telegram API Error:", result);
      }

    } catch (error) {
      console.error("❌ Failed to send message:", error);
    }
  }

  res.status(200).send("OK");
}