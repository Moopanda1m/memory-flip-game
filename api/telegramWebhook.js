export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  const body = req.body;

  const telegramToken = "7942048169:AAEnNrMPJBKWFngn6EQVFQOfk7-bPmm3PfY";
  const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

  // Handle regular message (e.g., /start or /start <ref>)
  if (body.message && body.message.text && body.message.chat) {
    const messageText = body.message.text;
    const chatId = body.message.chat.id;

    if (messageText.startsWith("/start")) {
      let welcome = "👋 Welcome to FlipGame!\n\nTap the blue START button above to begin playing 🎮";

      // If there's a referral code (like /start abc123), add info
      const parts = messageText.split(" ");
      if (parts.length > 1) {
        const referralCode = parts[1];
        welcome += `\n\nYour referral code: ${referralCode}`;
      }

      await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcome,
        }),
      });

      return res.status(200).send("Handled /start");
    }
  }

  // If none matched
  return res.status(200).send("No action taken");
}
