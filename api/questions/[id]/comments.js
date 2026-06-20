const {
  SUPABASE_TABLE,
  crypto,
  fromSupabaseQuestion,
  handleOptions,
  readJsonBody,
  sendJson,
  supabaseRequest,
  trimText,
} = require("../../_shared");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  try {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const rows = await supabaseRequest(
      `/${SUPABASE_TABLE}?select=id,author,text,image,comments,created_at&id=eq.${encodeURIComponent(request.query.id)}&limit=1`,
    );
    const question = rows[0] ? fromSupabaseQuestion(rows[0]) : null;

    if (!question) {
      sendJson(response, 404, { error: "问题不存在。" });
      return;
    }

    const body = await readJsonBody(request);
    const comment = {
      id: crypto.randomUUID(),
      author: trimText(body.author, 30) || "匿名同学",
      text: trimText(body.text, 160),
      createdAt: Date.now(),
    };

    question.comments.push(comment);
    await supabaseRequest(`/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(question.id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: {
        comments: question.comments,
      },
    });

    sendJson(response, 201, comment);
  } catch (error) {
    sendJson(response, 500, { error: "评论失败，请稍后再试。" });
  }
};
