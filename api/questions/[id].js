const { ADMIN_KEY, SUPABASE_TABLE, handleOptions, sendJson, supabaseRequest } = require("../_shared");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  try {
    if (request.method !== "DELETE") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    if (request.headers["x-admin-key"] !== ADMIN_KEY) {
      sendJson(response, 403, { error: "密钥不正确。" });
      return;
    }

    await supabaseRequest(`/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(request.query.id)}`, {
      method: "DELETE",
    });

    response.status(204).end();
  } catch (error) {
    sendJson(response, 500, { error: "删除失败，请稍后再试。" });
  }
};
