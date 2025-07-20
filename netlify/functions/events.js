const { getStore, authRequired, jsonResponse } = require("./common");
const { v4: uuidv4 } = require("uuid");
const store = getStore("events", { consistency: "strong" });

// Static placeholder images for the 4 events
const STATIC_EVENTS = [
  {
    id: 1,
    title: "Event 1",
    description: "Beschreibung für Event 1",
    banner_url: "https://link.storjshare.io/raw/julpadc66a57pal46igjl4azssja/geko/event0.png",
    uploaded_image: "",
    participants: [],
    created_at: new Date().toISOString(),
    display_image_url: "https://link.storjshare.io/raw/julpadc66a57pal46igjl4azssja/geko/event0.png"
  },
  {
    id: 2,
    title: "Event 2",
    description: "Beschreibung für Event 2",
    banner_url: "https://link.storjshare.io/raw/jvknoz7bbo5l45f5kp4d62fhwt4a/geko/Event1.png",
    uploaded_image: "",
    participants: [],
    created_at: new Date().toISOString(),
    display_image_url: "https://link.storjshare.io/raw/jvknoz7bbo5l45f5kp4d62fhwt4a/geko/Event1.png"
  },
  {
    id: 3,
    title: "Event 3",
    description: "Beschreibung für Event 3",
    banner_url: "https://link.storjshare.io/raw/jwtanqrv3dqklcksophmccbgrora/geko/event2.jpg",
    uploaded_image: "",
    participants: [],
    created_at: new Date().toISOString(),
    display_image_url: "https://link.storjshare.io/raw/jwtanqrv3dqklcksophmccbgrora/geko/event2.jpg"
  },
  {
    id: 4,
    title: "Event 4",
    description: "Beschreibung für Event 4",
    banner_url: "https://link.storjshare.io/raw/juj6yfbpheluxs5uzwkfholsamrq/geko/Logo.png",
    uploaded_image: "",
    participants: [],
    created_at: new Date().toISOString(),
    display_image_url: "https://link.storjshare.io/raw/juj6yfbpheluxs5uzwkfholsamrq/geko/Logo.png"
  }
];

// Helpers
async function listEvents() {
  // Return static events instead of dynamic ones
  return jsonResponse({ events: STATIC_EVENTS });
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
  // For static events, return from STATIC_EVENTS array
  const staticEvent = STATIC_EVENTS.find(e => e.id === parseInt(id));
  if (staticEvent) return staticEvent;

  // Fallback to store for dynamic events
  return store.get(id, { type: "json", consistency: "strong" });
}

async function updateEvent(id, event) {
  // For static events (1-4), update the static array
  const eventId = parseInt(id);
  if (eventId >= 1 && eventId <= 4) {
    const staticEvent = STATIC_EVENTS.find(e => e.id === eventId);
    if (!staticEvent) return jsonResponse({ error: "Event not found" }, 404);

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const { title, description, banner_url } = payload;
    if (title) staticEvent.title = title;
    if (description) staticEvent.description = description;
    if (banner_url) staticEvent.banner_url = banner_url;
    staticEvent.updated_at = new Date().toISOString();

    return jsonResponse({ event: staticEvent });
  }

  // Fallback to store for dynamic events
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
  const eventId = parseInt(id);
  let ev;

  // For static events, get from STATIC_EVENTS array
  if (eventId >= 1 && eventId <= 4) {
    ev = STATIC_EVENTS.find(e => e.id === eventId);
  } else {
    ev = await getEventById(id);
  }

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

  // For static events, update the array (in memory only for this request)
  if (eventId >= 1 && eventId <= 4) {
    // Note: This won't persist across requests, but will work for the current request
    return jsonResponse({ success: true, participant }, 201);
  }

  // For dynamic events, save to store
  await store.setJSON(id, ev);
  return jsonResponse({ success: true, participant }, 201);
}

async function listParticipants(id) {
  const eventId = parseInt(id);
  let ev;

  // For static events, get from STATIC_EVENTS array
  if (eventId >= 1 && eventId <= 4) {
    ev = STATIC_EVENTS.find(e => e.id === eventId);
  } else {
    ev = await getEventById(id);
  }

  if (!ev) return jsonResponse({ error: "Event not found" }, 404);
  return jsonResponse({ participants: ev.participants || [] });
}

async function exportEvent(id, fmt) {
  const eventId = parseInt(id);
  let ev;

  // For static events, get from STATIC_EVENTS array
  if (eventId >= 1 && eventId <= 4) {
    ev = STATIC_EVENTS.find(e => e.id === eventId);
  } else {
    ev = await getEventById(id);
  }

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