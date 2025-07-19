// Admin dashboard JS

(function () {
  // Determine API base. When docs are served on port 5000 (local dev), point to backend on 10000.
  const API_BASE = (window.location.port === "5000") ? "http://localhost:10000" : "";

  const loginPanel = document.getElementById("login-panel");
  const dashboard = document.getElementById("dashboard");
  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");

  const bannerFileInput = document.getElementById("banner-file");
  const createEventBtn = document.getElementById("create-event-btn");
  const eventTitleInput = document.getElementById("event-title");
  const eventsList = document.getElementById("events-list");

  const participantsTbody = document.getElementById("participants-tbody");
  const exportCsvBtn = document.getElementById("export-csv-btn");

  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabs = document.querySelectorAll(".tab-content");

  const eventSelect = document.getElementById("participants-event-select");

  let token = sessionStorage.getItem("jwt_token") || null;

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function setActiveTab(name) {
    tabs.forEach((tab) => {
      if (tab.id === `tab-${name}`) show(tab); else hide(tab);
    });
    tabButtons.forEach((btn) => {
      if (btn.dataset.tab === name) {
        btn.classList.remove("bg-gray-300","text-gray-800");
        btn.classList.add("bg-blue-600","text-white");
      } else {
        btn.classList.add("bg-gray-300","text-gray-800");
        btn.classList.remove("bg-blue-600","text-white");
      }
    });
  }

  async function api(path, options = {}) {
    const headers = options.headers || {};
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  async function handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const { token: tkn } = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      token = tkn;
      sessionStorage.setItem("jwt_token", token);
      loginPanel.remove();
      show(dashboard);
      await loadEvents();
      await loadParticipants();
    } catch (err) {
      loginError.textContent = err.message;
      show(loginError);
    }
  }

  async function loadEvents() {
    eventsList.innerHTML = "Loading...";
    try {
      const { events } = await api("/api/events");
      eventsList.innerHTML = "";
      events.forEach((ev) => {
        const card = document.createElement("div");
        card.className = "bg-white shadow rounded overflow-hidden flex flex-col";
        const img = document.createElement("img");
        img.src = ev.banner_url;
        img.className = "w-full h-32 object-cover";
        card.appendChild(img);
        const body = document.createElement("div");
        body.className = "p-4 flex-1 flex flex-col";
        body.innerHTML = `<h3 class="text-lg font-semibold mb-2">${ev.title}</h3><p class="text-sm text-gray-500 mb-2">${(ev.participants||[]).length} Teilnehmer</p>`;
        const btnRow = document.createElement("div");
        btnRow.className = "mt-auto flex gap-2";
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "bg-red-600 text-white px-2 py-1 rounded text-sm";
        delBtn.onclick = async () => {
          if (!confirm("Delete this event?")) return;
          await api(`/api/events/${ev.id}`, { method: "DELETE" });
          await loadEvents();
        };
        const exportBtn = document.createElement("button");
        exportBtn.textContent = "Export";
        exportBtn.className = "bg-blue-600 text-white px-2 py-1 rounded text-sm";
        exportBtn.onclick = () => {
          const url = `/api/events/${ev.id}/export?fmt=csv`;
          window.open(url, "_blank");
        };
        btnRow.appendChild(exportBtn);
        btnRow.appendChild(delBtn);
        body.appendChild(btnRow);
        card.appendChild(body);
        eventsList.appendChild(card);
      });
    } catch (err) {
      eventsList.textContent = err.message;
    }
  }

  async function createEvent() {
    const file = bannerFileInput.files[0];
    if (!file) return alert("Choose an image first.");
    const title = eventTitleInput.value.trim();
    if (!title) return alert("Enter an event title.");
    createEventBtn.disabled = true;

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64 = reader.result.split(",")[1];
        // 1. upload banner
        const { url: banner_url } = await api("/api/banners", {
          method: "POST",
          body: JSON.stringify({ filename: file.name, dataBase64: base64 }),
        });
        // 2. create event
        await api("/api/events", {
          method: "POST",
          body: JSON.stringify({ title, banner_url }),
        });
        bannerFileInput.value = "";
        eventTitleInput.value = "";
        await loadEvents();
      } catch (err) {
        alert(err.message);
      } finally {
        createEventBtn.disabled = false;
      }
    };

    reader.onerror = () => {
      alert("Failed to read file.");
      createEventBtn.disabled = false;
    };

    reader.readAsDataURL(file);
  }

  async function loadParticipants() {
    participantsTbody.innerHTML = "Loading...";
    try {
      const { participants } = await api("/api/participants");
      participantsTbody.innerHTML = "";
      participants.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td class="border px-4 py-2">${p.name}</td><td class="border px-4 py-2">${p.email||""}</td><td class="border px-4 py-2">${p.message||""}</td><td class="border px-4 py-2">${new Date(p.timestamp).toLocaleString()}</td>`;
        participantsTbody.appendChild(tr);
      });
    } catch (err) {
      participantsTbody.innerHTML = `<tr><td colspan="4" class="p-4 text-red-500">${err.message}</td></tr>`;
    }
  }

  function exportCSV() {
    const rows = Array.from(participantsTbody.children).map((tr) =>
      Array.from(tr.children).map((td) => td.textContent.replace(/"/g, '""'))
    );
    const header = ["Name", "Email", "Message", "Timestamp"];
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function logout() {
    sessionStorage.removeItem("jwt_token");
    location.reload();
  }

  // Load events into dropdown for participants tab
  async function populateEventSelect() {
    if (!eventSelect) return;
    eventSelect.innerHTML = "<option value=\"\">-- Select Event --</option>";
    try {
      const { events } = await api("/api/events");
      events.forEach((ev) => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.textContent = ev.title;
        eventSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Failed to load events for select", err);
    }
  }

  async function loadParticipantsByEvent(eventId) {
    participantsTbody.innerHTML = "Loading...";
    try {
      let endpoint = "/api/participants"; // fallback global
      if (eventId) endpoint = `/api/events/${eventId}/participants`;
      const { participants } = await api(endpoint);
      participantsTbody.innerHTML = "";
      participants.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td class="border px-4 py-2">${p.name}</td><td class="border px-4 py-2">${p.email||""}</td><td class="border px-4 py-2">${p.message||""}</td><td class="border px-4 py-2">${new Date(p.timestamp).toLocaleString()}</td>`;
        participantsTbody.appendChild(tr);
      });
    } catch (err) {
      participantsTbody.innerHTML = `<tr><td colspan="4" class="p-4 text-red-500">${err.message}</td></tr>`;
    }
  }

  function exportCSVSelected() {
    const selectedId = eventSelect.value;
    let url;
    if (selectedId) {
      url = `/api/events/${selectedId}/export?fmt=csv`;
    } else {
      // Global participants export not implemented; fallback to client-side export
      exportCSV();
      return;
    }
    window.open(url, "_blank");
  }

  // Event bindings
  loginBtn?.addEventListener("click", handleLogin);
  createEventBtn?.addEventListener("click", createEvent);
  exportCsvBtn?.addEventListener("click", exportCSVSelected);
  logoutBtn?.addEventListener("click", logout);
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // Auto-login if token exists
  if (token) {
    hide(loginPanel);
    show(dashboard);
    setActiveTab("events");
    loadEvents();
    loadParticipants();
    populateEventSelect();
    loadParticipantsByEvent(null);
  }
})();