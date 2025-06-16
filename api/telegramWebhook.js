export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  const body = req.body;

  // Check if it's a message
  if (body.message && body.message.text === "/start") {
    const chatId = body.message.chat.id;

    // Send welcome message back
    const telegramToken = "7942048169:AAEnNrMPJBKWFngn6EQVFQOfk7-bPmm3PfY";
    const message = "👋 Welcome to FlipGame!\n\nTap the blue START button above to begin playing 🎮";

    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

    await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    return res.status(200).send("Start command handled");
  }

  return res.status(200).send("No action taken");
}
