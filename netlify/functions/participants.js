const { getStore, authRequired, jsonResponse } = require("./common");
const { v4: uuidv4 } = require("uuid");

const store = getStore("participants", { consistency: "strong" });

async function addParticipant(event) {
  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const { name, email, message, banner } = data;
  if (!name) return jsonResponse({ error: "Name is required" }, 400);
  const id = uuidv4();
  const participant = { id, name, email, message, banner, timestamp: new Date().toISOString() };
  await store.setJSON(id, participant);
  return jsonResponse({ success: true, participant }, 201);
}

async function listParticipants() {
  const all = [];
  for await (const page of store.list({ paginate: true })) {
    for (const blob of page.blobs) {
      const data = await store.get(blob.key, { type: "json", consistency: "strong" });
      if (data) all.push(data);
    }
  }
  // Sort newest first
  all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return jsonResponse({ participants: all });
}

exports.handler = async (event, context) => {
  if (event.httpMethod === "POST") {
    return addParticipant(event);
  }
  if (event.httpMethod === "GET") {
    // protect GET with auth
    return authRequired(() => listParticipants())(event, context);
  }
  return { statusCode: 405, body: "Method Not Allowed" };
};