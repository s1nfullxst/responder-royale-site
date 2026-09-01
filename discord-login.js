(() => {
  const config = window.RESPONDER_ROYALE_SUPABASE;
  if (!config?.url || !config?.anonKey) return;

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
      .rr-discord-login{appearance:none;border:1px solid #77b7df;background:#77b7df;color:#171d25;border-radius:5px;padding:10px 13px;font:700 13px Arial,sans-serif;cursor:pointer;white-space:nowrap}
      .rr-discord-login:hover{filter:brightness(1.08)}
      .rr-discord-login:focus-visible{outline:3px solid #fff;outline-offset:3px}
      .rr-discord-login[disabled]{opacity:.65;cursor:wait}
      @media(max-width:760px){.rr-discord-login{padding:9px 10px;font-size:12px}}
    `;
    document.head.append(style);

    const header = document.querySelector("header");
    const joinButton = header?.querySelector(".join");
    if (header && joinButton) header.insertBefore(button, joinButton);
    else if (header) header.append(button);

    const updateButton = async () => {
      const { data: { session } } = await client.auth.getSession();
      const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email;
      button.textContent = name ? `Logged in: ${name}` : "Login with Discord";
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
