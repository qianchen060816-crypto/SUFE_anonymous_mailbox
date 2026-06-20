const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY || "102938";
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "questions.json");
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "mailbox_questions";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: "服务器开小差了，请稍后再试。" });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Anonymous mailbox is running at http://localhost:${PORT}`);
  });
}

module.exports = server;

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/questions") {
    sendJson(response, 200, await readData());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/questions") {
    const body = await readBody(request);
    const question = {
      author: trimText(body.author, 30) || "匿名同学",
      text: trimText(body.text, 240),
      image: typeof body.image === "string" ? body.image : "",
      comments: [],
      createdAt: Date.now(),
    };
    const created = await createQuestion(question);
    sendJson(response, 201, created);
    return;
  }

  if (
    request.method === "POST" &&
    parts.length === 4 &&
    parts[0] === "api" &&
    parts[1] === "questions" &&
    parts[3] === "comments"
  ) {
    const body = await readBody(request);
    const question = await findQuestion(parts[2]);
    if (!question) {
      sendJson(response, 404, { error: "问题不存在。" });
      return;
    }

    const comment = {
      id: crypto.randomUUID(),
      author: trimText(body.author, 30) || "匿名同学",
      text: trimText(body.text, 160),
      createdAt: Date.now(),
    };

    question.comments.push(comment);
    await updateQuestionComments(question.id, question.comments);
    sendJson(response, 201, comment);
    return;
  }

  if (request.method === "DELETE" && parts.length === 3 && parts[0] === "api" && parts[1] === "questions") {
    if (request.headers["x-admin-key"] !== ADMIN_KEY) {
      sendJson(response, 403, { error: "密钥不正确。" });
      return;
    }

    await deleteQuestion(parts[2]);
    response.writeHead(204).end();
    return;
  }

  sendJson(response, 404, { error: "没有找到这个接口。" });
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestedPath));
  const relativePath = path.relative(ROOT, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404).end("Not found");
  }
}

async function readData() {
  if (USE_SUPABASE) {
    const rows = await supabaseRequest(
      `/${SUPABASE_TABLE}?select=id,author,text,image,comments,created_at&order=created_at.desc`,
    );
    return {
      questions: rows.map(fromSupabaseQuestion),
    };
  }

  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {
    return { questions: [] };
  }
}

async function writeData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function createQuestion(question) {
  if (USE_SUPABASE) {
    const rows = await supabaseRequest(`/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: {
        author: question.author,
        text: question.text,
        image: question.image,
        comments: question.comments,
      },
    });
    return fromSupabaseQuestion(rows[0]);
  }

  const data = await readData();
  const created = {
    id: crypto.randomUUID(),
    ...question,
  };
  data.questions.unshift(created);
  await writeData(data);
  return created;
}

async function findQuestion(id) {
  if (USE_SUPABASE) {
    const rows = await supabaseRequest(
      `/${SUPABASE_TABLE}?select=id,author,text,image,comments,created_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ? fromSupabaseQuestion(rows[0]) : null;
  }

  const data = await readData();
  return data.questions.find((item) => item.id === id) || null;
}

async function updateQuestionComments(id, comments) {
  if (USE_SUPABASE) {
    await supabaseRequest(`/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: {
        comments,
      },
    });
    return;
  }

  const data = await readData();
  const question = data.questions.find((item) => item.id === id);
  if (question) {
    question.comments = comments;
    await writeData(data);
  }
}

async function deleteQuestion(id) {
  if (USE_SUPABASE) {
    await supabaseRequest(`/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return;
  }

  const data = await readData();
  data.questions = data.questions.filter((item) => item.id !== id);
  await writeData(data);
}

async function supabaseRequest(pathname, options = {}) {
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

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_500_000) {
      throw new Error("Request body is too large");
    }
  }

  return raw ? JSON.parse(raw) : {};
}

function trimText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}
