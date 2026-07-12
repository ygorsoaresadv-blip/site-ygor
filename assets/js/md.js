/* Conversor leve de Markdown para HTML — cobre o necessário para os posts:
   títulos, parágrafos, listas, negrito/itálico, links, citações, código e linhas. */

function markdownParaHtml(md) {
  const escapar = s =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = s =>
    escapar(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, texto, url) => {
        const seguro = /^(javascript|data|vbscript):/i.test(url) ? "#" : url;
        const externo = /^https?:\/\//i.test(seguro) ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${seguro}"${externo}>${texto}</a>`;
      });

  const linhas = md.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragrafo = [];
  let lista = null; // "ul" | "ol"

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      html.push(`<p>${inline(paragrafo.join(" "))}</p>`);
      paragrafo = [];
    }
  };

  const fecharLista = () => {
    if (lista) {
      html.push(`</${lista}>`);
      lista = null;
    }
  };

  for (const linha of linhas) {
    const t = linha.trim();

    if (!t) { fecharParagrafo(); fecharLista(); continue; }

    const titulo = t.match(/^(#{1,3})\s+(.*)$/);
    if (titulo) {
      fecharParagrafo(); fecharLista();
      // "#" e "##" viram h2, "###" vira h3 (o h1 é o título da página)
      const nivel = Math.max(2, titulo[1].length);
      html.push(`<h${nivel}>${inline(titulo[2])}</h${nivel}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(t)) {
      fecharParagrafo(); fecharLista();
      html.push("<hr>");
      continue;
    }

    if (t.startsWith(">")) {
      fecharParagrafo(); fecharLista();
      html.push(`<blockquote><p>${inline(t.replace(/^>\s?/, ""))}</p></blockquote>`);
      continue;
    }

    const itemNaoOrdenado = t.match(/^[-*]\s+(.*)$/);
    const itemOrdenado = t.match(/^\d+[.)]\s+(.*)$/);
    if (itemNaoOrdenado || itemOrdenado) {
      fecharParagrafo();
      const tipo = itemNaoOrdenado ? "ul" : "ol";
      if (lista !== tipo) { fecharLista(); html.push(`<${tipo}>`); lista = tipo; }
      html.push(`<li>${inline((itemNaoOrdenado || itemOrdenado)[1])}</li>`);
      continue;
    }

    paragrafo.push(t);
  }

  fecharParagrafo();
  fecharLista();
  return html.join("\n");
}

/* Separa o frontmatter (--- chave: valor ---) do conteúdo do .md */
function lerFrontmatter(texto) {
  const meta = {};
  let corpo = texto;
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    corpo = texto.slice(m[0].length);
    m[1].split("\n").forEach(linha => {
      const par = linha.match(/^(\w+):\s*(.*)$/);
      if (par) meta[par[1]] = par[2].trim();
    });
  }
  return { meta, corpo };
}
