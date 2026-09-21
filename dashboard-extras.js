(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  const activityNames = {
    save_settings: "Server settings updated",
    double_points: "Double-points event requested",
    rapid_spawn: "Rapid Response requested",
    announcement: "Announcement requested",
  };

  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }));
  });
  document.querySelectorAll("[data-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.focus);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target?.focus(), 450);
    });
  });

  const loadOverview = async () => {
    if (!config?.url || !config?.anonKey) return;
    try {
      const response = await fetch(`${config.url}/rest/v1/dashboard_stats?id=eq.1&select=active_servers,registered_players,vehicles_collected`, {
        headers: { apikey: config.anonKey },
      });
      if (!response.ok) return;
      const [stats] = await response.json();
      if (!stats) return;
      document.getElementById("overview-servers").textContent = stats.active_servers ?? "—";
      document.getElementById("overview-players").textContent = stats.registered_players ?? "—";
      document.getElementById("overview-vehicles").textContent = stats.vehicles_collected ?? "—";
    } catch {}
  };

  const renderActivity = (rows) => {
    const list = document.getElementById("activity-list");
    if (!list) return;
    if (!rows?.length) {
      list.innerHTML = '<div class="empty-panel">No dashboard activity has been recorded for this server yet.</div>';
      return;
    }
    list.replaceChildren(...rows.map((row) => {
      const item = document.createElement("article");
      item.className = `activity-item ${row.status || "pending"}`;
      const dot = document.createElement("span");
      dot.className = "activity-dot";
      const copy = document.createElement("div");
      copy.className = "activity-copy";
      const title = document.createElement("b");
      title.textContent = activityNames[row.action_type] || "Dashboard action";
      const result = document.createElement("span");
      result.textContent = row.result || (row.status === "pending" ? "Waiting for the bot…" : "Completed");
      copy.append(title, result);
      const time = document.createElement("time");
      time.className = "activity-time";
      time.textContent = row.created_at ? new Date(row.created_at).toLocaleString() : "";
      item.append(dot, copy, time);
      return item;
    }));
  };

  const loadActivity = async (guild, client) => {
    if (!guild || !client) return renderActivity([]);
    const list = document.getElementById("activity-list");
    if (list) list.innerHTML = '<div class="empty-panel">Loading recent activity…</div>';
    const { data, error } = await client
      .from("dashboard_actions")
      .select("action_type,status,result,created_at")
      .eq("guild_id", guild.id)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) {
      if (list) list.innerHTML = '<div class="empty-panel">Activity is unavailable right now. Your controls still work normally.</div>';
      return;
    }
    renderActivity(data);
  };

  window.addEventListener("rr:server-selected", (event) => loadActivity(event.detail.guild, event.detail.client));
  window.addEventListener("rr:dashboard-action", (event) => loadActivity(event.detail.guild, event.detail.client));
  loadOverview();
})();
