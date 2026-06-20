const crypto = require("node:crypto");

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "mailbox_questions";
const ADMIN_KEY = process.env.ADMIN_KEY || "102938";

function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-key");
}

function requireSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }
}

async function supabaseRequest(pathname, options = {}) {
  requireSupabase();

  const response = await fetch(`${SUPABASE_URL}/rest/v1${pathname}`, {
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase request failed: ${error}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return request.body ? JSON.parse(request.body) : {};
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_500_000) {
        reject(new Error("Request body is too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function fromSupabaseQuestion(row) {
  return {
    id: row.id,
    author: row.author,
    text: row.text || "",
    image: row.image || "",
    comments: Array.isArray(row.comments) ? row.comments : [],
    createdAt: new Date(row.created_at).getTime(),
  };
}

function trimText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sendJson(response, statusCode, payload) {
  setCors(response);
  response.status(statusCode).json(payload);
}

function handleOptions(request, response) {
  if (request.method === "OPTIONS") {
    setCors(response);
    response.status(204).end();
    return true;
  }

  return false;
}

module.exports = {
  ADMIN_KEY,
  SUPABASE_TABLE,
  crypto,
  fromSupabaseQuestion,
  handleOptions,
  readJsonBody,
  sendJson,
  setCors,
  supabaseRequest,
  trimText,
};
