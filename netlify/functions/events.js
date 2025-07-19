const { getStore, authRequired, jsonResponse } = require("./common");
const { v4: uuidv4 } = require("uuid");
const store = getStore("events", { consistency: "strong" });

// Helpers
async function listEvents() {
  const events = [];
  for await (const page of store.list({ paginate: true })) {
    for (const blob of page.blobs) {
      const data = await store.get(blob.key, { type: "json", consistency: "strong" });
      if (data) events.push(data);
    }
  }
  // Sort by created_at desc
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return jsonResponse({ events });
}

async function createEvent(event) {
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const { title, banner_url } = payload;
  if (!title || !banner_url) return jsonResponse({ error: "title and banner_url required" }, 400);
  const id = uuidv4();
  const newEvent = { id, title, banner_url, created_at: new Date().toISOString(), participants: [] };
  await store.setJSON(id, newEvent);
  return jsonResponse({ event: newEvent }, 201);
}

async function getEventById(id) {
  return store.get(id, { type: "json", consistency: "strong" });
}

async function updateEvent(id, event) {
  const existing = await getEventById(id);
  if (!existing) return jsonResponse({ error: "Event not found" }, 404);
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const { title, banner_url } = payload;
  if (title) existing.title = title;
  if (banner_url) existing.banner_url = banner_url;
  existing.updated_at = new Date().toISOString();
  await store.setJSON(id, existing);
  return jsonResponse({ event: existing });
}

async function deleteEvent(id) {
  await store.delete(id);
  return jsonResponse({ success: true });
}

// Participant helpers
async function addParticipant(id, event) {
  const ev = await getEventById(id);
  if (!ev) return jsonResponse({ error: "Event not found" }, 404);
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const { name, email, message } = payload;
  if (!name || !email) return jsonResponse({ error: "name and email required" }, 400);
  const participant = { name, email, message, timestamp: new Date().toISOString() };
  ev.participants = ev.participants || [];
  ev.participants.push(participant);
  await store.setJSON(id, ev);
  return jsonResponse({ success: true, participant }, 201);
}

async function listParticipants(id) {
  const ev = await getEventById(id);
  if (!ev) return jsonResponse({ error: "Event not found" }, 404);
  return jsonResponse({ participants: ev.participants || [] });
}

async function exportEvent(id, fmt) {
  const ev = await getEventById(id);
  if (!ev) return { statusCode: 404, body: "Event not found" };
  const participants = ev.participants || [];
  if (fmt === "csv") {
    const header = "Event ID,Title,Name,Email,Message,Timestamp\n";
    const rows = participants
      .map((p) =>
        [id, ev.title, p.name, p.email, p.message || "", p.timestamp].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const csv = header + rows;
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=event_${id}.csv`,
      },
      body: csv,
    };
  }
  // JSON fallback
  return jsonResponse({ event_id: id, title: ev.title, participants });
}

exports.handler = async (event, context) => {
  const method = event.httpMethod;
  const pathParts = event.path.split("/").filter(Boolean); // e.g. ['.netlify','functions','events',':id', 'participants']

  // Find the index of the keyword 'events' (should always exist because of redirect)
  const eventsIdx = pathParts.indexOf("events");
  const hasId = eventsIdx !== -1 && pathParts.length > eventsIdx + 1 ? pathParts[eventsIdx + 1] : null;
  const id = hasId; // keep uuid string even if not numeric

  // Determine sub-resource (participants | export) if present
  const subResource = hasId && pathParts.length > eventsIdx + 2 ? pathParts[eventsIdx + 2] : null;

  // Handle /api/events/:id/participants & export first
  if (hasId && subResource) {
    if (subResource === "participants") {
      if (method === "POST") return addParticipant(id, event);
      if (method === "GET") return authRequired(() => listParticipants(id))(event, context);
    }
    if (subResource === "export") {
      const fmt = (event.queryStringParameters && event.queryStringParameters.fmt) || "json";
      return authRequired(() => exportEvent(id, fmt))(event, context);
    }
  }

  // Handle /api/events and /api/events/:id
  if (!hasId) {
    if (method === "GET") return listEvents();
    if (method === "POST") return authRequired(createEvent)(event, context);
  } else {
    if (method === "GET") {
      const ev = await getEventById(id);
      return ev ? jsonResponse(ev) : jsonResponse({ error: "Event not found" }, 404);
    }
    if (method === "PUT") return authRequired(() => updateEvent(id, event))(event, context);
    if (method === "DELETE") return authRequired(() => deleteEvent(id))(event, context);
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};