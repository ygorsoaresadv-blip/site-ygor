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

/* Separa o frontmatter (--- chave: valor ---) do conteúdo do .md.
   Não é um parser YAML completo, mas entende o suficiente do que o Decap CMS
   escreve: valores entre aspas, blocos de texto multi-linha (">", "|") e
   continuação de um valor simples em linhas seguintes indentadas. */
function lerFrontmatter(textoOriginal) {
  const texto = textoOriginal.replace(/\r\n/g, "\n");
  const meta = {};
  let corpo = texto;
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    corpo = texto.slice(m[0].length);
    preencherMetaDoFrontmatter(m[1].split("\n"), meta);
  }
  return { meta, corpo };
}

function preencherMetaDoFrontmatter(linhas, meta) {
  const pareceChave = l => /^[A-Za-z0-9_]+:(\s|$)/.test(l.trim());

  let i = 0;
  while (i < linhas.length) {
    const par = linhas[i].match(/^([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (!par) { i++; continue; }
    const nome = par[1];
    let valor = par[2].trim();
    i++;

    const bloco = valor.match(/^([>|])[+-]?$/);
    if (bloco) {
      const dobrar = bloco[1] === ">";
      const linhasBloco = [];
      while (i < linhas.length && (linhas[i].trim() === "" || /^\s/.test(linhas[i]))) {
        linhasBloco.push(linhas[i].replace(/^\s{1,2}/, ""));
        i++;
      }
      while (linhasBloco.length && linhasBloco[linhasBloco.length - 1].trim() === "") linhasBloco.pop();
      meta[nome] = (dobrar ? linhasBloco.join(" ") : linhasBloco.join("\n")).trim();
      continue;
    }

    while (i < linhas.length && linhas[i].trim() !== "" && /^\s/.test(linhas[i]) && !pareceChave(linhas[i])) {
      valor += " " + linhas[i].trim();
      i++;
    }

    valor = valor.trim();
    const aspasDuplas = valor.match(/^"([\s\S]*)"$/);
    const aspasSimples = valor.match(/^'([\s\S]*)'$/);
    if (aspasDuplas) valor = aspasDuplas[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    else if (aspasSimples) valor = aspasSimples[1].replace(/''/g, "'");

    meta[nome] = valor;
  }
}
