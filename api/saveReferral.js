export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { referral_code, telegram_id } = req.body;

  const response = await fetch("https://vwvmjzapwmruihtyqfkl.supabase.co/rest/v1/referrals", {
    method: "POST",
    headers: {
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ",
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ",
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      referral_code,
      telegram_id
    }),
  });

  if (response.ok) {
    res.status(200).json({ success: true });
  } else {
    const error = await response.text();
    res.status(500).json({ success: false, error });
  }
}
