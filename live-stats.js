(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  if (!config || config.anonKey.startsWith("PASTE_")) return;
  const previewOffline = new URLSearchParams(window.location.search).get("preview") === "offline";

  const cardValue = (label) => {
    const heading = [...document.querySelectorAll(".card small")]
      .find((node) => node.textContent.trim() === label);
    return heading?.parentElement?.querySelector("b");
  };

  const showBotState = (online) => {
    const overview = document.getElementById("overall-status");
    const title = document.getElementById("overall-title");
    const copy = document.getElementById("overall-copy");
    const badge = document.getElementById("overall-badge");
    const service = document.getElementById("bot-service-status");
    const connection = cardValue("BOT CONNECTION");
    [overview, badge, service, connection].forEach((element) => element?.classList.toggle("is-down", !online));

    if (title) title.textContent = online ? "Responder Royale is operational" : "The Discord bot is currently down";
    if (copy) copy.textContent = online
      ? "No service interruptions are currently reported."
      : previewOffline
        ? "Preview only — this is how the page looks during a bot outage."
        : "Commands and vehicle rounds may be unavailable while the team investigates.";
    if (badge) badge.textContent = online ? "All systems operational" : "Service interruption";
    if (service) service.textContent = online ? "Operational" : "Down";
    if (connection) connection.textContent = online ? "● Online" : "● Offline";
  };

  async function loadStats() {
    try {
      const response = await fetch(`${config.url}/rest/v1/dashboard_stats?id=eq.1&select=*`, {
        headers: { apikey: config.anonKey },
      });
      if (!response.ok) throw new Error("Stats unavailable");
      const [stats] = await response.json();
      if (!stats) throw new Error("No stats yet");
      showBotState(previewOffline ? false : Boolean(stats.bot_online));
      const activeServers = cardValue("ACTIVE SERVERS");
      const registeredPlayers = cardValue("REGISTERED PLAYERS");
      const vehiclesCollected = cardValue("VEHICLES COLLECTED");
      const lastUpdate = cardValue("LAST WEBSITE UPDATE");
      if (activeServers) activeServers.textContent = `${stats.active_servers} Discord server${stats.active_servers === 1 ? "" : "s"}`;
      if (registeredPlayers) registeredPlayers.textContent = stats.registered_players;
      if (vehiclesCollected) vehiclesCollected.textContent = stats.vehicles_collected;
      if (lastUpdate) lastUpdate.textContent = new Date(stats.updated_at).toLocaleString();
    } catch {
      const connection = cardValue("BOT CONNECTION");
      if (connection) connection.textContent = "Status unavailable";
    }
  }

  loadStats();
  setInterval(loadStats, 60000);
})();
