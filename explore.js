(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  const state = { vehicles: [] };
  const el = (id) => document.getElementById(id);
  const safe = (value, fallback = "—") => value ?? fallback;
  const api = async (path) => {
    const response = await fetch(`${config.url}/rest/v1/${path}`, { headers: { apikey: config.anonKey } });
    if (!response.ok) throw new Error(`Data is not published yet (${response.status}).`);
    return response.json();
  };
  const vehicleCard = (item) => {
    const card = document.createElement("article"); card.className = "vehicle";
    const art = document.createElement("div"); art.className = "vehicle-art"; art.textContent = item.emoji || "🚒";
    const body = document.createElement("div"); body.className = "vehicle-body";
    const title = document.createElement("h2"); title.textContent = safe(item.name, "Emergency vehicle");
    const detail = document.createElement("p"); detail.textContent = [item.country, item.vehicle_type].filter(Boolean).join(" · ") || "Responder Royale collection";
    const rarity = document.createElement("span"); rarity.className = `pill ${String(item.rarity || "common").toLowerCase()}`; rarity.textContent = safe(item.rarity, "Common");
    body.append(title, detail, rarity); card.append(art, body); return card;
  };
  const renderVehicles = () => {
    const query = el("vehicle-search").value.trim().toLowerCase(); const rarity = el("rarity-filter").value;
    const rows = state.vehicles.filter((item) => (!query || `${item.name} ${item.country} ${item.vehicle_type}`.toLowerCase().includes(query)) && (!rarity || String(item.rarity).toLowerCase() === rarity));
    const grid = el("vehicle-grid");
    if (!rows.length) { grid.innerHTML = '<div class="empty"><b>No matching vehicles</b>Try another search or rarity.</div>'; return; }
    grid.replaceChildren(...rows.map(vehicleCard));
  };
  const renderRanks = (id, rows, valueKey, suffix) => {
    const list = el(id); if (!rows?.length) { list.innerHTML = '<div class="empty"><b>Waiting for synced rankings</b>Use the leaderboard commands in Discord while web sync is being prepared.</div>'; return; }
    list.replaceChildren(...rows.map((row, index) => { const item = document.createElement("div"); item.className = "rank"; const rank = document.createElement("i"); rank.textContent = index + 1; const name = document.createElement("b"); name.textContent = safe(row.display_name, "Discord player"); const score = document.createElement("span"); score.textContent = `${safe(row[valueKey], 0)} ${suffix}`; item.append(rank, name, score); return item; }));
  };
  async function load() {
    if (!config?.url || !config?.anonKey) return;
    try { state.vehicles = await api("public_vehicles?select=name,country,vehicle_type,rarity,emoji&order=name&limit=300"); renderVehicles(); el("vehicle-count").textContent = state.vehicles.length; } catch { el("vehicle-grid").innerHTML = '<div class="empty"><b>The web gallery is ready for bot sync</b>Vehicles remain available in Discord. Once the bot publishes the public_vehicles view, they appear here automatically.</div>'; }
    try { const rows = await api("public_leaderboard?select=display_name,points,streak,level&order=points.desc&limit=10"); renderRanks("points-list", rows, "points", "points"); renderRanks("streak-list", [...rows].sort((a,b)=>(b.streak||0)-(a.streak||0)), "streak", "streak"); el("player-count").textContent = rows.length ? "Live" : "—"; } catch { renderRanks("points-list", [], "points", "points"); renderRanks("streak-list", [], "streak", "streak"); }
  }
  el("vehicle-search")?.addEventListener("input", renderVehicles); el("rarity-filter")?.addEventListener("change", renderVehicles); load();
})();
