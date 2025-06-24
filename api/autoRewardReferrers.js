// ✅ Auto reward referrers every 5 minutes using Vercel cron job (api/autoRewardReferrers.js)
// Place this file inside /api/autoRewardReferrers.js in your Vercel project
// Then schedule it using Vercel's Cron UI or vercel.json

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Only GET allowed");

  const SUPABASE_URL = "https://vwvmjzapwmruihtyqfkl.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ";

  try {
    // 1. Fetch all distinct referral_code values with rewarded = false
    const fetchReferrals = await fetch(
      `${SUPABASE_URL}/rest/v1/referrals?rewarded=eq.false&select=referral_code,telegram_id,id,coins`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const referrals = await fetchReferrals.json();
    if (!Array.isArray(referrals) || referrals.length === 0) {
      return res.status(200).json({ message: "✅ No unrewarded referrals" });
    }

    const grouped = {};
    referrals.forEach((r) => {
      if (!grouped[r.referral_code]) grouped[r.referral_code] = [];
      grouped[r.referral_code].push(r);
    });

    // 2. For each referral_code, reward User A
    const allUpdates = [];
    for (const referralCode in grouped) {
      const userAId = referralCode.replace("rngs_", "");

      // Fetch User A record
      const fetchUserA = await fetch(
        `${SUPABASE_URL}/rest/v1/referrals?telegram_id=eq.${userAId}&select=coins,id`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const userAData = await fetchUserA.json();
      const userA = userAData[0];
      if (!userA) continue;

      const totalBonus = grouped[referralCode].length * 2000;
      const updatedCoins = (parseInt(userA.coins || "0", 10)) + totalBonus;

      // Update User A coins
      allUpdates.push(
        fetch(`${SUPABASE_URL}/rest/v1/referrals?id=eq.${userA.id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ coins: updatedCoins }),
        })
      );

      // Mark all related referrals as rewarded
      grouped[referralCode].forEach((ref) => {
        allUpdates.push(
          fetch(`${SUPABASE_URL}/rest/v1/referrals?id=eq.${ref.id}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ rewarded: true }),
          })
        );
      });
    }

    await Promise.all(allUpdates);
    return res.status(200).json({ message: `✅ Auto-reward completed for ${Object.keys(grouped).length} referrers` });
  } catch (err) {
    console.error("❌ Auto-reward failed:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
