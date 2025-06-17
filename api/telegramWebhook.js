export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  const body = req.body;

  const telegramToken = "7942048169:AAEnNrMPJBKWFngn6EQVFQOfk7-bPmm3PfY";
  const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;

  if (body.message && body.message.text && body.message.chat) {
    const messageText = body.message.text;
    const chatId = body.message.chat.id;

    if (messageText.startsWith("/start")) {
      const welcomeMessage = `🎉 *Welcome to $PANDA Mining Bot!* 🐼

Get ready to earn $PANDA Coins effortlessly! Play games, complete missions, and start collecting rewards today.

The more you engage, the more $PANDA you earn!

🚀 Invite your friends and boost your rewards — your journey to valuable crypto starts here!`;

      // 🖼️ Just change this filename only
      const imageFileName = "tonpandaimage.jpg";

      const payload = {
        chat_id: chatId,
        photo: `https://memoryflip-game-app.vercel.app/${imageFileName}`, // full URL is auto-constructed
        caption: welcomeMessage,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open App",
                url: "https://memoryflip-game-app.vercel.app",
              },
            ],
            [
              {
                text: "Join Our Community",
                url: "https://t.me/moopanda1m",
              },
            ],
            [
              {
                text: "Follow Our X",
                url: "https://x.com/FlipgameTon",
              },
            ],
          ],
        },
      };

      await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return res.status(200).send("Sent welcome image and message with buttons");
    }
  }

  return res.status(200).send("No action taken");
}
