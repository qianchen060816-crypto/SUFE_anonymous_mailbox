const {
  SUPABASE_TABLE,
  fromSupabaseQuestion,
  handleOptions,
  readJsonBody,
  sendJson,
  supabaseRequest,
  trimText,
} = require("./_shared");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  try {
    if (request.method === "GET") {
      const rows = await supabaseRequest(
        `/${SUPABASE_TABLE}?select=id,author,text,image,comments,created_at&order=created_at.desc`,
      );
      sendJson(response, 200, {
        questions: rows.map(fromSupabaseQuestion),
      });
      return;
    }

    if (request.method === "POST") {
      const body = await readJsonBody(request);
      const rows = await supabaseRequest(`/${SUPABASE_TABLE}`, {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: {
          author: trimText(body.author, 30) || "匿名同学",
          text: trimText(body.text, 240),
          image: typeof body.image === "string" ? body.image : "",
          comments: [],
        },
      });

      sendJson(response, 201, fromSupabaseQuestion(rows[0]));
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, 500, { error: "服务器暂时没连上云数据库。" });
  }
};
