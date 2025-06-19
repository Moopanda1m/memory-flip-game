export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  const body = req.body;

  const telegramToken = "7942048169:AAEnNrMPJBKWFngn6EQVFQOfk7-bPmm3PfY";
  const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

  // Handle /start (with or without referral)
  if (body.message && body.message.text && body.message.chat) {
    const messageText = body.message.text;
    const chatId = body.message.chat.id;

    if (messageText.startsWith("/start")) {
      const parts = messageText.split(" ");
      const referralCode = parts.length > 1 ? parts[1] : null;

      let welcome = "🎉 Welcome to PANDA Mining Bot! 🐼\n\nGet ready to earn $PANDA Coins effortlessly! Play games, complete missions, and start collecting rewards today.\n\nThe more you engage, the more $PANDA you earn!\n\n🚀 Invite your friends and boost your rewards — your journey to valuable crypto starts here!";

      const payload = {
        chat_id: chatId,
        text: welcome,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open App",
                web_app: {
                  url: `https://memoryflip-game-app.vercel.app?start=${referralCode || ""}` // ✅ now a proper Telegram Mini App
                }
              }
            ],
            [
              {
                text: "Join Our Community",
                url: "https://t.me/moopanda1m"
              }
            ],
            [
              {
                text: "Follow Our Twitter",
                url: "https://x.com/FlipgameTon"
              }
            ]
          ]
        }
      };

      await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      return res.status(200).send("Handled /start with buttons");
    }
  }

  return res.status(200).send("No action taken");
}
