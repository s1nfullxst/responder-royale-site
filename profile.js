(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  const id = new URLSearchParams(location.search).get("id");
  const set = (name, value) => { const element = document.querySelector(`[data-profile="${name}"]`); if (element) element.textContent = value ?? "—"; };
  const fail = (message) => { document.getElementById("profile-state").textContent = message; document.getElementById("profile-card").hidden = true; };
  async function load() {
    if (!id || !config?.url || !config?.anonKey) return fail("Choose a player from the public leaderboard.");
    try {
      const response = await fetch(`${config.url}/rest/v1/public_leaderboard?public_id=eq.${encodeURIComponent(id)}&select=display_name,points,streak,level,vehicles_collected,achievements&limit=1`, { headers: { apikey: config.anonKey } });
      if (!response.ok) throw new Error(); const [player] = await response.json(); if (!player) return fail("This public player profile was not found.");
      set("name", player.display_name); set("points", player.points); set("streak", player.streak); set("level", player.level); set("vehicles", player.vehicles_collected); set("achievements", player.achievements); document.getElementById("profile-state").textContent = "Public Responder Royale profile";
    } catch { fail("Player profiles are temporarily unavailable."); }
  }
  load();
})();
