export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Only POST allowed");

  const { referral_code, telegram_id } = req.body;

  console.log("Incoming request to saveReferral:", req.body);

  if (!referral_code || !telegram_id) {
    console.log("Missing referral_code or telegram_id");
    return res.status(400).json({ error: "Missing referral_code or telegram_id" });
  }

  const apiUrl = "https://vwvmjzapwmruihtyqfkl.supabase.co/rest/v1/referrals";
  const headers = {
    apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ",
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ",
    "Content-Type": "application/json",
    Prefer: "return=minimal"
  };

  try {
    // ✅ Ensure User A (inviter) exists
    const userATelegramId = referral_code.replace("rngs_", "");
    const checkUserA = await fetch(`${apiUrl}?telegram_id=eq.${userATelegramId}`, {
      headers
    });
    const userA = await checkUserA.json();

    if (userA.length === 0) {
      console.log("🟡 User A not found, inserting...");
      await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          telegram_id: userATelegramId,
          referral_code: `rngs_${userATelegramId}`, // optional tag
          coins: 0,
          rewarded: false
        })
      });
    } else {
      console.log("✅ User A already exists");
    }

    // ✅ Ensure User B (joiner) is inserted
    const checkUserB = await fetch(`${apiUrl}?telegram_id=eq.${telegram_id}`, {
      headers
    });
    const userB = await checkUserB.json();

    if (userB.length === 0) {
      console.log("✅ Inserting User B...");
      await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          telegram_id,
          referral_code
        })
      });
    } else {
      console.log("⚠️ User B already exists, skipping insert");
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Supabase request failed:", err.message);
    res.status(500).json({ error: err.message });
  }
}
