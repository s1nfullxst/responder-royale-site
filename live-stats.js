(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  if (!config || config.anonKey.startsWith("PASTE_")) return;

  const updateCard = (label, value) => {
    const labelNode = [...document.querySelectorAll(".card p")]
      .find((node) => node.textContent.trim() === label);
    const valueNode = labelNode?.parentElement?.querySelector("b");
    if (valueNode) valueNode.textContent = value;
  };

  const updateStatusCard = (label, value) => {
    const labelNode = [...document.querySelectorAll(".card small")]
      .find((node) => node.textContent.trim() === label);
    const valueNode = labelNode?.parentElement?.querySelector("b");
    if (valueNode) valueNode.textContent = value;
  };

  async function loadStats() {
    try {
      const response = await fetch(
        `${config.url}/rest/v1/dashboard_stats?id=eq.1&select=*`,
        { headers: { apikey: config.anonKey } },
      );
      if (!response.ok) throw new Error("Stats unavailable");
      const [stats] = await response.json();
      if (!stats) throw new Error("No stats yet");

      updateCard("ACTIVE SERVERS", stats.active_servers);
      updateCard("REGISTERED PLAYERS", stats.registered_players);
      updateCard("VEHICLES COLLECTED", stats.vehicles_collected);
      updateStatusCard("BOT CONNECTION", stats.bot_online ? "● Online" : "● Offline");
      updateStatusCard("ACTIVE SERVERS", `${stats.active_servers} Discord server${stats.active_servers === 1 ? "" : "s"}`);
      updateStatusCard("LAST WEBSITE UPDATE", new Date(stats.updated_at).toLocaleString());
    } catch {
      // Existing text remains visible if the public status service is unavailable.
    }
  }

  loadStats();
  setInterval(loadStats, 60000);
})();
