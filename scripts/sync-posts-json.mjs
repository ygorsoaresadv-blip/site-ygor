// Regenera posts/posts.json a partir do frontmatter de cada posts/*.md.
// Executado pela GitHub Action em .github/workflows/sync-posts-json.yml
// sempre que um artigo é criado ou editado pelo painel do Sveltia CMS.
import { readdir, readFile, writeFile } from "node:fs/promises";

const postsDir = new URL("../posts/", import.meta.url);

function parseFrontmatter(texto) {
  const meta = {};
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    m[1].split("\n").forEach(linha => {
      const par = linha.match(/^(\w+):\s*(.*)$/);
      if (par) meta[par[1]] = par[2].trim();
    });
  }
  return meta;
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
