(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  if (!config?.url || !config?.anonKey) return;

  const installUrl = "https://discord.com/oauth2/authorize?client_id=1537541901778030702&permissions=1099511753750&integration_type=0&scope=bot%20applications.commands";
  const installButton = document.createElement("a");
  installButton.className = "rr-add-bot";
  installButton.href = installUrl;
  installButton.textContent = "Add to Discord";
  installButton.setAttribute("aria-label", "Add Responder Royale to a Discord server");

  const installStyle = document.createElement("style");
  installStyle.textContent = `
    .rr-add-bot{display:inline-flex;align-items:center;border:1px solid #77b7df;color:#dfeaf0;border-radius:5px;padding:10px 13px;font:700 13px Arial,sans-serif;white-space:nowrap}
    .rr-add-bot:hover{background:#263640}.rr-add-bot:focus-visible{outline:3px solid #fff;outline-offset:3px}
    @media(max-width:760px){.rr-add-bot{padding:9px 10px;font-size:12px}}
  `;
  document.head.append(installStyle);

  const header = document.querySelector("header");
  const joinButton = header?.querySelector(".join");
  if (header && joinButton) header.insertBefore(installButton, joinButton);

  const sdk = document.createElement("script");
  sdk.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  sdk.onload = () => {
    const client = window.supabase.createClient(config.url, config.anonKey);
    const button = document.createElement("button");
    button.className = "rr-discord-login";
    button.type = "button";
    button.textContent = "Login with Discord";
    button.setAttribute("aria-label", "Login to Responder Royale with Discord");

    const style = document.createElement("style");
    style.textContent = `
      .rr-discord-login{appearance:none;border:1px solid #77b7df;background:#77b7df;color:#171d25;border-radius:5px;padding:8px 12px;font:700 13px Arial,sans-serif;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:8px}
      .rr-discord-login:hover{filter:brightness(1.08)}
      .rr-discord-login:focus-visible{outline:3px solid #fff;outline-offset:3px}
      .rr-discord-login[disabled]{opacity:.65;cursor:wait}
      .rr-discord-login__avatar{width:24px;height:24px;border-radius:50%;object-fit:cover;background:#263640;border:1px solid rgba(23,29,37,.35)}
      .rr-discord-login__name{max-width:120px;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:760px){.rr-discord-login{padding:9px 10px;font-size:12px}}
    `;
    document.head.append(style);

    if (header && joinButton) header.insertBefore(button, joinButton);
    else if (header) header.append(button);

    const updateButton = async () => {
      const { data: { session } } = await client.auth.getSession();
      const metadata = session?.user?.user_metadata || {};
      const name = metadata.full_name || metadata.name || metadata.preferred_username || session?.user?.email;
      const avatarUrl = metadata.avatar_url || metadata.picture || metadata.avatar;
      button.replaceChildren();
      if (name) {
        if (avatarUrl) {
          const avatar = document.createElement("img");
          avatar.className = "rr-discord-login__avatar";
          avatar.src = avatarUrl;
          avatar.alt = "";
          button.append(avatar);
        }
        const label = document.createElement("span");
        label.className = "rr-discord-login__name";
        label.textContent = name;
        button.append(label);
        button.setAttribute("aria-label", `Logged in to Responder Royale as ${name}`);
      } else {
        button.textContent = "Login with Discord";
        button.setAttribute("aria-label", "Login to Responder Royale with Discord");
      }
      button.dataset.loggedIn = name ? "true" : "false";
    };

    button.addEventListener("click", async () => {
      if (button.dataset.loggedIn === "true") return;
      button.disabled = true;
      button.textContent = "Opening Discord…";
      const { error } = await client.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${window.location.origin}${window.location.pathname}` }
      });
      if (error) {
        button.disabled = false;
        button.textContent = "Discord login unavailable";
        console.error("Discord login could not start:", error.message);
      }
    });

    client.auth.onAuthStateChange(() => { updateButton(); });
    updateButton();
  };
  document.head.append(sdk);
})();
