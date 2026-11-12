export default {
  async fetch(request, env) {
    const ua = (request.headers.get("user-agent") || "").toLowerCase();
    if ((ua.includes("curl") || ua.includes("wget") || ua.includes("httpie")) && new URL(request.url).pathname === "/") {
      const url = new URL(request.url);
      const enc = url.searchParams.get("e") || url.searchParams.get("encode");
      const dec = url.searchParams.get("d") || url.searchParams.get("decode");
      if (enc !== null) {
        return new Response(btoa(enc) + "\n", {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
        });
      }
      if (dec !== null) {
        try {
          return new Response(atob(dec) + "\n", {
            headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
          });
        } catch(e) {
          return new Response("Error: invalid Base64 string\n", { status: 400, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
        }
      }
      return new Response("Usage:\n  curl https://base64.othrys.be?e=hello\n  curl https://base64.othrys.be?d=aGVsbG8=\n", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
      });
    }
    return env.ASSETS.fetch(request);
  }
};