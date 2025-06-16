export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  // Optional: log to confirm webhook is hit
  console.log("Telegram webhook received:", req.body);

  res.status(200).send("OK");
}
