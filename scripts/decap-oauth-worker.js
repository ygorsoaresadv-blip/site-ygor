// Proxy de autenticação OAuth do GitHub para o Decap CMS.
// Cole este código no editor do Cloudflare Worker (Workers & Pages → seu worker → Edit code).
// Não precisa alterar nada aqui — as credenciais vêm das variáveis de ambiente
// GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET, configuradas no painel do Cloudflare.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") return handleAuth(url, env);
    if (url.pathname === "/callback") return handleCallback(request, url, env);

    return new Response("Not found", { status: 404 });
  }
};

async function handleAuth(url, env) {
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo,user");
  authorizeUrl.searchParams.set("state", state);

  const headers = new Headers({ Location: authorizeUrl.toString() });
  headers.append(
    "Set-Cookie",
    `oauth_state=${state}; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Lax`
  );
  return new Response(null, { status: 302, headers });
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

async function handleCallback(request, url, env) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getCookie(request, "oauth_state");

  if (!code || !state || state !== cookieState) {
    return new Response("Requisição inválida ou expirada. Feche esta janela e tente novamente no painel.", { status: 400 });
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`
    })
  });

  const data = await tokenResponse.json();

  if (!data.access_token) {
    return new Response("Não foi possível concluir a autorização com o GitHub.", { status: 400 });
  }

  const message = `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: "github" })}`;

  const html = `<!DOCTYPE html><html><body>
<script>
(function() {
  var message = ${JSON.stringify(message)};
  function receiveMessage(e) {
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
