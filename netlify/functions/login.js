const {
  bcrypt,
  ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH,
  generateToken,
  jsonResponse,
} = require("./common");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const { username, password } = body;
  if (!username || !password) {
    return jsonResponse({ error: "username and password required" }, 400);
  }
  if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return jsonResponse({ token: generateToken(username), user: username });
  }
  return jsonResponse({ error: "Invalid credentials" }, 401);
};