const state = {
  personas: [],
  activePersonaId: null,
  messages: []
};

const ui = {
  tabs: document.getElementById("personaTabs"),
  activePersona: document.getElementById("activePersona"),
  suggestions: document.getElementById("suggestions"),
  chatWindow: document.getElementById("chatWindow"),
  typing: document.getElementById("typingIndicator"),
  form: document.getElementById("chatForm"),
  input: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  error: document.getElementById("errorMsg")
};

function showError(message) {
  ui.error.textContent = message;
  ui.error.classList.remove("hidden");
}

function clearError() {
  ui.error.textContent = "";
  ui.error.classList.add("hidden");
}

function renderMessage(role, content) {
  const bubble = document.createElement("article");
  bubble.className = `msg ${role}`;
  bubble.textContent = content;
  ui.chatWindow.appendChild(bubble);
  ui.chatWindow.scrollTop = ui.chatWindow.scrollHeight;
}

function resetConversation() {
  state.messages = [];
  ui.chatWindow.innerHTML = "";
  clearError();
  const persona = state.personas.find((p) => p.id === state.activePersonaId);
  if (persona) {
    renderMessage(
      "assistant",
      `Hi, I am ${persona.name}. Ask me anything related to learning, interviews, or career growth.`
    );
  }
}

function renderSuggestions() {
  const persona = state.personas.find((p) => p.id === state.activePersonaId);
  ui.suggestions.innerHTML = "";
  (persona?.suggestions || []).forEach((text) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = text;
    chip.type = "button";
    chip.addEventListener("click", () => {
      ui.input.value = text;
      ui.form.requestSubmit();
    });
    ui.suggestions.appendChild(chip);
  });
}

function renderPersonaTabs() {
  ui.tabs.innerHTML = "";
  state.personas.forEach((persona) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `persona-btn ${persona.id === state.activePersonaId ? "active" : ""}`;
    button.textContent = persona.name;
    button.addEventListener("click", () => {
      if (persona.id === state.activePersonaId) return;
      state.activePersonaId = persona.id;
      renderPersonaTabs();
      renderSuggestions();
      ui.activePersona.textContent = `Active persona: ${persona.name} (${persona.title})`;
      resetConversation();
    });
    ui.tabs.appendChild(button);
  });
}

async function loadPersonas() {
  const response = await fetch("/api/personas");
  if (!response.ok) throw new Error("Failed to load personas.");
  const data = await response.json();
  state.personas = data.personas || [];
  if (!state.personas.length) throw new Error("No personas configured.");
  state.activePersonaId = state.personas[0].id;
  ui.activePersona.textContent = `Active persona: ${state.personas[0].name} (${state.personas[0].title})`;
  renderPersonaTabs();
  renderSuggestions();
  resetConversation();
}

async function sendMessage(content) {
  state.messages.push({ role: "user", content });
  renderMessage("user", content);

  ui.typing.classList.remove("hidden");
  ui.sendBtn.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId: state.activePersonaId,
        messages: state.messages
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed.");

    state.messages.push({ role: "assistant", content: payload.reply });
    renderMessage("assistant", payload.reply);
    clearError();
  } catch (error) {
    showError(error.message || "Something went wrong while generating the response.");
  } finally {
    ui.typing.classList.add("hidden");
    ui.sendBtn.disabled = false;
    ui.input.focus();
  }
}

ui.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = ui.input.value.trim();
  if (!text) return;
  ui.input.value = "";
  await sendMessage(text);
});

loadPersonas().catch((error) => {
  showError(error.message || "Unable to initialize app.");
});
