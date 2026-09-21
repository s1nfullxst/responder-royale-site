(() => {
  const byId = (id) => document.getElementById(id);
  window.setTimeout(() => {
    const loginButton = document.querySelector("[data-discord-login]") || document.querySelector(".discord-login");
    const signedIn = Boolean(loginButton?.textContent?.toLowerCase().includes("logged in"));
    document.querySelector(".wizard-step")?.classList.toggle("done", signedIn);
  }, 900);
  const moderationGrid = document.querySelector("#moderation .settings");
  const ticketGrid = document.querySelector("#tickets .settings");
  const field = (html) => { const wrapper = document.createElement("article"); wrapper.className = "setting"; wrapper.innerHTML = html; return wrapper; };
  moderationGrid?.append(
    field('<h3>Blocked words</h3><p>One word or phrase per line. Staff members are exempt.</p><textarea id="blocked-words" class="tag-input" maxlength="1200" placeholder="word or phrase"></textarea>'),
    field('<h3>Automod response</h3><p>Choose what happens after a blocked message.</p><select id="automod-action"><option value="delete">Delete message</option><option value="warn">Delete and warn</option><option value="timeout">Delete and timeout</option></select>')
  );
  ticketGrid?.append(
    field('<h3>Panel title</h3><p>The heading members see above the ticket button.</p><input id="ticket-title" maxlength="100" value="Need help?">'),
    field('<h3>Button label</h3><p>Short action text for the Discord button.</p><input id="ticket-button" maxlength="40" value="Open a ticket">'),
    field('<h3>Welcome message</h3><p>Sent inside every newly created ticket.</p><textarea id="ticket-welcome" class="tag-input" maxlength="1000" placeholder="Tell us how we can help."></textarea>'),
    field('<h3>Transcripts</h3><p>Save closed-ticket transcripts in the moderation log channel.</p><div class="row"><span>Save transcripts</span><input id="ticket-transcripts" class="switch" type="checkbox" checked></div>')
  );
  const collectionIntro = document.querySelector("#collection > p");
  if (collectionIntro) { const link = document.createElement("a"); link.className = "data-link"; link.href = "collection.html"; link.textContent = "Open public collection & rankings →"; collectionIntro.after(link); }
  const overlay = byId("action-confirm");
  let pendingResolve = null;
  window.rrConfirm = (title, message) => new Promise((resolve) => { pendingResolve = resolve; byId("confirm-title").textContent = title; byId("confirm-message").textContent = message; overlay.classList.add("open"); byId("confirm-yes").focus(); });
  const finish = (answer) => { overlay.classList.remove("open"); pendingResolve?.(answer); pendingResolve = null; };
  byId("confirm-no")?.addEventListener("click", () => finish(false)); byId("confirm-yes")?.addEventListener("click", () => finish(true)); overlay?.addEventListener("click", (event) => { if (event.target === overlay) finish(false); }); document.addEventListener("keydown", (event) => { if (event.key === "Escape" && overlay?.classList.contains("open")) finish(false); });
  window.addEventListener("rr:server-selected", (event) => { const ready = Boolean(event.detail.guild); byId("wizard-server")?.classList.toggle("done", ready); byId("wizard-permissions")?.classList.toggle("done", ready); });
  byId("game-channel")?.addEventListener("change", (event) => byId("wizard-channel")?.classList.toggle("done", Boolean(event.target.value)));
  window.addEventListener("rr:dashboard-action", () => byId("wizard-save")?.classList.add("done"));
})();
