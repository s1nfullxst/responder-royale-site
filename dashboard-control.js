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
    element.classList.toggle("rr-error", !good); element.classList.remove("rr-show"); requestAnimationFrame(() => element.classList.add("rr-show")); clearTimeout(notice.timer); notice.timer = setTimeout(() => element.classList.remove("rr-show"), good ? 4500 : 8000);
    element.setAttribute("role", "status"); element.setAttribute("aria-live", good ? "polite" : "assertive");
  };

  document.querySelectorAll('.side a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll('.side a[href^="#"]').forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });
  byId("mobile-menu")?.addEventListener("change", (event) => {
    document.querySelector(event.target.value)?.scrollIntoView({ behavior: "smooth" });
  });

  (async () => {
    const client = await waitForSupabase();
    const serverSelect = byId("server-select");
    const channelSelect = byId("game-channel");
    const logChannelSelect = byId("log-channel");
    const spawnInterval = byId("spawn-interval");
    const customSpawnMinutes = byId("custom-spawn-minutes");
    const serverList = byId("server-list");
    let selectedServerAvatar = byId("selected-server-avatar");
    let selectedGuild = null;

    const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "RR";
    const iconUrl = (guild) => guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`
      : "";

    const setAvatar = (element, guild) => {
      const url = guild ? iconUrl(guild) : "";
      if (url) {
        const image = document.createElement("img");
        image.className = element.className;
        image.id = element.id;
        image.alt = "";
        image.src = url;
        element.replaceWith(image);
        if (element === selectedServerAvatar) selectedServerAvatar = image;
      } else {
        element.textContent = guild ? initials(guild.name) : "RR";
      }
    };

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
      // Show servers the user owns or can manage. The bot and database policies
      // still verify every action before it is applied.
      guilds = (await response.json()).filter((guild) => {
        const permissions = BigInt(guild.permissions || "0");
        return guild.owner || Boolean(permissions & 8n) || Boolean(permissions & 32n);
      });
    } catch (error) {
      byId("server-help").textContent = "Please sign out and sign in again to allow server access.";
      return;
    }

    serverSelect.replaceChildren(new Option("Choose your Discord server", ""));
    guilds.forEach((guild) => serverSelect.add(new Option(guild.name, guild.id)));
    serverSelect.disabled = false;
    byId("server-help").textContent = guilds.length ? "Choose a server you own." : "No Discord servers owned by this account were found.";

    serverList.replaceChildren();
    if (!guilds.length) {
      const empty = document.createElement("div");
      empty.className = "server-empty";
      empty.textContent = "No owned servers were found.";
      serverList.append(empty);
    }
    guilds.forEach((guild) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "server-choice";
      button.dataset.guildId = guild.id;
      button.title = guild.name;
      const avatar = document.createElement(iconUrl(guild) ? "img" : "span");
      avatar.className = "server-avatar";
      avatar.alt = "";
      if (iconUrl(guild)) avatar.src = iconUrl(guild);
      else avatar.textContent = initials(guild.name);
      const name = document.createElement("span");
      name.className = "server-choice-name";
      name.textContent = guild.name;
      button.append(avatar, name);
      button.addEventListener("click", () => {
        serverSelect.value = guild.id;
        serverSelect.dispatchEvent(new Event("change"));
      });
      serverList.append(button);
    });

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
      document.querySelectorAll(".server-choice").forEach((button) => button.classList.toggle("active", button.dataset.guildId === serverSelect.value));
      setAvatar(selectedServerAvatar, selectedGuild);
      byId("step-server")?.classList.toggle("done", Boolean(selectedGuild));
      byId("step-channel")?.classList.remove("done");
      window.dispatchEvent(new CustomEvent("rr:server-selected", { detail: { guild: selectedGuild, client } }));
      if (selectedGuild) await loadChannels();
    });

    channelSelect.addEventListener("change", () => {
      byId("step-channel")?.classList.toggle("done", Boolean(channelSelect.value));
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
      const result = await waitForAction(queued.id);
      window.dispatchEvent(new CustomEvent("rr:dashboard-action", { detail: { guild: selectedGuild, client } }));
      return result;
    }

    byId("save").addEventListener("click", async () => {
      try {
        byId("save").disabled = true;
        byId("save").textContent = "Saving…";
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
          ticket_category: byId("ticket-category").value.trim() || "Support Tickets",
          ticket_title: byId("ticket-title")?.value.trim() || "Need help?",
          ticket_button: byId("ticket-button")?.value.trim() || "Open a ticket",
          ticket_welcome: byId("ticket-welcome")?.value.trim() || "",
          ticket_transcripts: byId("ticket-transcripts")?.checked ?? true,
          blocked_words: byId("blocked-words")?.value.split(/\r?\n/).map((word) => word.trim()).filter(Boolean).slice(0, 100) || [],
          automod_action: byId("automod-action")?.value || "delete"
        });
        notice(result);
      } catch (error) { notice(error.message || "Could not save settings.", false); }
      finally {
        byId("save").disabled = false;
        byId("save").textContent = "Save server settings";
      }
    });

    byId("start-double").addEventListener("click", async () => {
      try {
        if (window.rrConfirm && !(await window.rrConfirm("Start double points?", "This immediately changes scoring in the selected Discord server."))) return;
        const result = await queue("double_points", { rounds: Number(byId("double-rounds").value) });
        notice(result);
      } catch (error) { notice(error.message || "Could not start the event.", false); }
    });

    byId("start-rapid").addEventListener("click", async () => {
      try {
        if (window.rrConfirm && !(await window.rrConfirm("Start Rapid Response?", "This immediately changes the spawn rate in the selected Discord server."))) return;
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
        if (window.rrConfirm && !(await window.rrConfirm("Send this announcement?", "The bot will post this message publicly in the selected game channel."))) return;
        const result = await queue("announcement", { message });
        byId("announcement").value = "";
        notice(result);
      } catch (error) { notice(error.message || "Could not send the announcement.", false); }
    });
  })();
})();
