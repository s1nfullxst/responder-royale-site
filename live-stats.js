(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  if (!config || config.anonKey.startsWith("PASTE_")) return;

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

    title.textContent = online ? "Responder Royale is operational" : "The Discord bot is currently down";
    copy.textContent = online
      ? "No service interruptions are currently reported."
      : "Commands and vehicle rounds may be unavailable while the team investigates.";
    badge.textContent = online ? "All systems operational" : "Service interruption";
    service.textContent = online ? "Operational" : "Down";
    connection.textContent = online ? "● Online" : "● Offline";
  };

  async function loadStats() {
    try {
      const response = await fetch(`${config.url}/rest/v1/dashboard_stats?id=eq.1&select=*`, {
        headers: { apikey: config.anonKey },
      });
      if (!response.ok) throw new Error("Stats unavailable");
      const [stats] = await response.json();
      if (!stats) throw new Error("No stats yet");
      showBotState(Boolean(stats.bot_online));
      cardValue("ACTIVE SERVERS").textContent = `${stats.active_servers} Discord server${stats.active_servers === 1 ? "" : "s"}`;
      cardValue("LAST WEBSITE UPDATE").textContent = new Date(stats.updated_at).toLocaleString();
    } catch {
      cardValue("BOT CONNECTION").textContent = "Status unavailable";
    }
  }

  loadStats();
  setInterval(loadStats, 60000);
})();
