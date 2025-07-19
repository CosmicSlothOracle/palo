// Common helpers for all Netlify Functions (Node runtime)
// Each function can `require("./common")` to access utilities.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getStore } = require("@netlify/blobs");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "$2b$12$ZCgWXzUdmVX.PnIfj4oeJOkX69Tu1rVZ51zGYe3kSloANnwMaTlBW";

// Require a real secret in production – fail fast if missing
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXP_SECONDS = 8 * 60 * 60; // 8h

function generateToken(username) {
  return jwt.sign({ sub: username }, JWT_SECRET, {
    expiresIn: JWT_EXP_SECONDS,
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
}

function authRequired(handler) {
  return async (event, context) => {
    const auth = event.headers["authorization"] || "";
    if (!auth.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Missing Authorization header" }),
      };
    }
    const token = auth.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }) };
    }
    context.user = payload.sub;
    return handler(event, context);
  };
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function jsonResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    },
    body: JSON.stringify(data),
  };
}

module.exports = {
  bcrypt,
  generateToken,
  verifyToken,
  authRequired,
  jsonResponse,
  getStore,
  ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH,
};