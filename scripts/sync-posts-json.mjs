// Regenera posts/posts.json a partir do frontmatter de cada posts/*.md.
// Executado pela GitHub Action em .github/workflows/sync-posts-json.yml
// sempre que um artigo é criado ou editado pelo painel do Decap CMS.
import { readdir, readFile, writeFile } from "node:fs/promises";

const postsDir = new URL("../posts/", import.meta.url);

// Não é um parser YAML completo, mas entende o suficiente do que o Decap CMS
// escreve: valores entre aspas, blocos de texto multi-linha (">", "|") e
// continuação de um valor simples em linhas seguintes indentadas.
function parseFrontmatter(textoOriginal) {
  const texto = textoOriginal.replace(/\r\n/g, "\n");
  const meta = {};
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) preencherMetaDoFrontmatter(m[1].split("\n"), meta);
  return meta;
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

const arquivos = (await readdir(postsDir)).filter(f => f.endsWith(".md"));

const posts = [];
for (const arquivo of arquivos) {
  const conteudo = await readFile(new URL(arquivo, postsDir), "utf8");
  const meta = parseFrontmatter(conteudo);
  if (!meta.titulo || !meta.data) continue;
  posts.push({
    slug: arquivo.replace(/\.md$/, ""),
    titulo: meta.titulo,
    data: meta.data,
    resumo: meta.resumo || "",
    tags: (meta.tags || "").split(",").map(t => t.trim()).filter(Boolean)
  });
}

posts.sort((a, b) => (a.data < b.data ? 1 : -1));

await writeFile(new URL("posts.json", postsDir), JSON.stringify(posts, null, 2) + "\n");
console.log(`posts.json atualizado com ${posts.length} artigo(s).`);
