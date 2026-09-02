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
    let selectedGuild = null;

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
      guilds = (await response.json()).filter((guild) => guild.owner || (BigInt(guild.permissions || "0") & 0x20n));
    } catch (error) {
      byId("server-help").textContent = "Please sign out and sign in again to allow server access.";
      return;
    }

    serverSelect.replaceChildren(new Option("Choose your Discord server", ""));
    guilds.forEach((guild) => serverSelect.add(new Option(guild.name, guild.id)));
    serverSelect.disabled = false;
    byId("server-help").textContent = guilds.length ? "Choose the server you want to manage." : "No servers you own were found.";

    async function loadChannels() {
      channelSelect.replaceChildren(new Option("Loading channels…", ""));
      channelSelect.disabled = true;
      const { data, error } = await client
        .from("dashboard_channels")
        .select("channel_id, channel_name")
        .eq("guild_id", selectedGuild.id)
        .order("channel_name");
      if (error || !data?.length) {
        channelSelect.replaceChildren(new Option("Bot has not synced channels yet", ""));
        return;
      }
      channelSelect.replaceChildren(new Option("Choose a game channel", ""));
      data.forEach((channel) => channelSelect.add(new Option(`# ${channel.channel_name}`, channel.channel_id)));
      channelSelect.disabled = false;
    }

    serverSelect.addEventListener("change", async () => {
      selectedGuild = guilds.find((guild) => guild.id === serverSelect.value) || null;
      byId("server-name").textContent = selectedGuild ? selectedGuild.name : "Your Discord server";
      if (selectedGuild) await loadChannels();
    });

    async function queue(action, payload) {
      if (!selectedGuild) throw new Error("Choose a Discord server first.");
      const { error } = await client.from("dashboard_actions").insert({
        guild_id: selectedGuild.id,
        action_type: action,
        payload
      });
      if (error) throw error;
    }

    byId("save").addEventListener("click", async () => {
      try {
        if (!channelSelect.value) throw new Error("Choose the game channel first.");
        await queue("save_settings", {
          channel_id: channelSelect.value,
          spawn_minutes: Number(byId("spawn-interval").value),
          auto_secrets: byId("auto-secrets").checked,
          moderation_enabled: byId("moderation-tools").checked
        });
        notice("Settings sent to the bot. It will apply them shortly.");
      } catch (error) { notice(error.message || "Could not save settings.", false); }
    });

    byId("start-double").addEventListener("click", async () => {
      try {
        await queue("double_points", { rounds: Number(byId("double-rounds").value) });
        notice("Double points has been sent to the bot.");
      } catch (error) { notice(error.message || "Could not start the event.", false); }
    });

    byId("send-announcement").addEventListener("click", async () => {
      try {
        const message = byId("announcement").value.trim();
        if (!message) throw new Error("Write an announcement first.");
        await queue("announcement", { message });
        byId("announcement").value = "";
        notice("Announcement sent to the bot.");
      } catch (error) { notice(error.message || "Could not send the announcement.", false); }
    });
  })();
})();
