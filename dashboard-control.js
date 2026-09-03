(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  if (!config?.url || !config?.anonKey) return;

  const waitForSupabase = () => new Promise((resolve) => {
    const timer = setInterval(() => {
      if (window.RESPONDER_ROYALE_SUPABASE_CLIENT) {
        clearInterval(timer);
        resolve(window.RESPONDER_ROYALE_SUPABASE_CLIENT);
      }
    }, 100);
  });

  const byId = (id) => document.getElementById(id);
  const notice = (message, good = true) => {
    const element = byId("notice");
    element.textContent = message;
    element.style.color = good ? "#5fd7a1" : "#ee714e";
    element.style.display = "inline";
  };

  (async () => {
    const client = await waitForSupabase();
    const serverSelect = byId("server-select");
    const channelSelect = byId("game-channel");
    const logChannelSelect = byId("log-channel");
    const spawnInterval = byId("spawn-interval");
    const customSpawnMinutes = byId("custom-spawn-minutes");
    let selectedGuild = null;

    spawnInterval.addEventListener("change", () => {
      customSpawnMinutes.hidden = spawnInterval.value !== "custom";
      if (!customSpawnMinutes.hidden) customSpawnMinutes.focus();
    });

    const sessionResult = await client.auth.getSession();
    let session = sessionResult.data.session;
    if (!session) return;

    // Discord returns the server list only when the user signs in with the
    // guilds scope. The login button will request it on the next sign-in.
    if (!session.provider_token) {
      byId("server-help").textContent = "Please sign out and sign in again to choose a server.";
      return;
    }

    let guilds = [];
    try {
      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      if (!response.ok) throw new Error("Discord did not return your servers.");
      // The bot verifies ownership again before applying any request. Keep the
      // server list consistent so a Discord administrator is never shown
      // controls that the bot must reject.
      guilds = (await response.json()).filter((guild) => guild.owner);
    } catch (error) {
      byId("server-help").textContent = "Please sign out and sign in again to allow server access.";
      return;
    }

    serverSelect.replaceChildren(new Option("Choose your Discord server", ""));
    guilds.forEach((guild) => serverSelect.add(new Option(guild.name, guild.id)));
    serverSelect.disabled = false;
    byId("server-help").textContent = guilds.length ? "Choose a server you own." : "No Discord servers owned by this account were found.";

    async function loadChannels() {
      channelSelect.replaceChildren(new Option("Loading channels…", ""));
      logChannelSelect.replaceChildren(new Option("Loading channels…", ""));
      channelSelect.disabled = true;
      logChannelSelect.disabled = true;
      const { data, error } = await client
        .from("dashboard_channels")
        .select("channel_id, channel_name")
        .eq("guild_id", selectedGuild.id)
        .order("channel_name");
      if (error || !data?.length) {
        channelSelect.replaceChildren(new Option("Bot has not synced channels yet", ""));
        logChannelSelect.replaceChildren(new Option("Bot has not synced channels yet", ""));
        return;
      }
      channelSelect.replaceChildren(new Option("Choose a game channel", ""));
      logChannelSelect.replaceChildren(new Option("Choose a moderation log channel", ""));
      data.forEach((channel) => {
        channelSelect.add(new Option(`# ${channel.channel_name}`, channel.channel_id));
        logChannelSelect.add(new Option(`# ${channel.channel_name}`, channel.channel_id));
      });
      channelSelect.disabled = false;
      logChannelSelect.disabled = false;
    }

    serverSelect.addEventListener("change", async () => {
      selectedGuild = guilds.find((guild) => guild.id === serverSelect.value) || null;
      byId("server-name").textContent = selectedGuild ? selectedGuild.name : "Your Discord server";
      if (selectedGuild) await loadChannels();
    });

    const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

    async function waitForAction(actionId) {
      for (let attempt = 0; attempt < 35; attempt += 1) {
        const { data: action, error } = await client
          .from("dashboard_actions")
          .select("status, result")
          .eq("id", actionId)
          .single();
        if (error) throw error;
        if (action.status === "done") return action.result || "The bot applied the change.";
        if (action.status === "failed") throw new Error(action.result || "The bot rejected the change.");
        await delay(1000);
      }
      throw new Error("The bot did not respond in time. Please try again.");
    }

    async function queue(action, payload) {
      if (!selectedGuild) throw new Error("Choose a Discord server first.");
      const { data: queued, error } = await client
        .from("dashboard_actions")
        .insert({ guild_id: selectedGuild.id, action_type: action, payload })
        .select("id")
        .single();
      if (error) throw error;
      notice("Waiting for the bot…");
      return waitForAction(queued.id);
    }

    byId("save").addEventListener("click", async () => {
      try {
        if (!channelSelect.value) throw new Error("Choose the game channel first.");
        const spawnMinutes = spawnInterval.value === "custom"
          ? Number(customSpawnMinutes.value)
          : Number(spawnInterval.value);
        if (!Number.isInteger(spawnMinutes) || spawnMinutes < 2 || spawnMinutes > 720) {
          throw new Error("Enter a spawn interval from 2 minutes to 12 hours.");
        }
        const result = await queue("save_settings", {
          channel_id: channelSelect.value,
          spawn_minutes: spawnMinutes,
          auto_secrets: byId("auto-secrets").checked,
          moderation_enabled: byId("moderation-tools").checked,
          automod_enabled: byId("automod-enabled").checked,
          block_invites: byId("block-invites").checked,
          spam_limit: Number(byId("spam-limit").value),
          log_channel_id: logChannelSelect.value || null,
          tickets_enabled: byId("tickets-enabled").checked,
          ticket_category: byId("ticket-category").value.trim() || "Support Tickets"
        });
        notice(result);
      } catch (error) { notice(error.message || "Could not save settings.", false); }
    });

    byId("start-double").addEventListener("click", async () => {
      try {
        const result = await queue("double_points", { rounds: Number(byId("double-rounds").value) });
        notice(result);
      } catch (error) { notice(error.message || "Could not start the event.", false); }
    });

    byId("start-rapid").addEventListener("click", async () => {
      try {
        const result = await queue("rapid_spawn", {
          interval: Number(byId("rapid-interval").value),
          duration: Number(byId("rapid-duration").value)
        });
        notice(result);
      } catch (error) { notice(error.message || "Could not start Rapid Response.", false); }
    });

    byId("send-announcement").addEventListener("click", async () => {
      try {
        const message = byId("announcement").value.trim();
        if (!message) throw new Error("Write an announcement first.");
        const result = await queue("announcement", { message });
        byId("announcement").value = "";
        notice(result);
      } catch (error) { notice(error.message || "Could not send the announcement.", false); }
    });
  })();
})();
