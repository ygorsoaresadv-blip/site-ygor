// Gera tudo o que depende dos artigos em posts/*.md:
//   - posts/posts.json            índice (usado pelo painel e por integrações)
//   - artigos/<slug>.html         uma página HTML real por artigo (boa para o Google)
//   - index.html                  destaque, filtros e cards entre os marcadores "gerado:"
//   - navegação, rodapé e atalho  entre os marcadores "parte:" de cada página
//   - sitemap.xml e feed.xml
// Executado pela GitHub Action em .github/workflows/gerar-site.yml a cada
// artigo criado ou editado. Para rodar à mão: node scripts/gerar-site.mjs
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";

const SITE = "https://ygor.blog";
const VERSAO = "20261114";
const TEMAS = ["Rescisão", "Jornada", "Vínculo", "Salário", "Saúde e segurança", "Processo", "Categorias", "Além do trabalho"];
const TEMA_PADRAO = "Direito do Trabalho";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");
const gravar = (caminho, texto) => writeFile(new URL(caminho, raiz), texto);

// O conversor de markdown é o mesmo arquivo usado antes no navegador.
const { markdownParaHtml, lerFrontmatter } = new Function(
  (await ler("assets/js/md.js")) + "\nreturn { markdownParaHtml, lerFrontmatter };"
)();

/* ---------- utilitários ---------- */
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const semAcento = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
// Endereço do artigo: sem acentos nem símbolos (a mesma regra está em artigo.html).
const slugUrl = s => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const partesData = iso => String(iso).slice(0, 10).split("-").map(Number);
const dataCurta = iso => { const [a, m, d] = partesData(iso); return `${d} de ${MESES[m - 1].slice(0, 3)}. de ${a}`; };
const dataExtenso = iso => { const [a, m, d] = partesData(iso); return `${d} de ${MESES[m - 1]} de ${a}`; };
const resumir = (t, max) => { t = String(t || "").trim(); return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, "") + "…"; };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function trocar(html, marcador, conteudo) {
  const re = new RegExp(`(<!-- ${marcador} -->)[\\s\\S]*?(<!-- /${marcador} -->)`);
  if (!re.test(html)) throw new Error(`Marcador "${marcador}" não encontrado.`);
  return html.replace(re, (_, abre, fecha) => `${abre}\n${conteudo.trim()}\n${fecha}`);
}

/* ---------- artigos ---------- */
const arquivos = (await readdir(new URL("posts/", raiz))).filter(f => f.endsWith(".md"));
const posts = [];
for (const arquivo of arquivos) {
  const { meta, corpo } = lerFrontmatter(await ler("posts/" + arquivo));
  if (!meta.titulo || !meta.data) continue;
  const original = arquivo.replace(/\.md$/, "");
  // O título já aparece no topo da página: um "# título" na primeira linha seria repetição.
  const md = corpo.replace(/^\s*# [^\n]*\n/, "");
  const data = String(meta.data).slice(0, 10);
  posts.push({
    slug: original,
    url: `artigos/${slugUrl(original)}.html`,
    titulo: meta.titulo,
    data,
    resumo: meta.resumo || "",
    tema: TEMAS.includes(meta.tema) ? meta.tema : TEMA_PADRAO,
    tags: String(meta.tags || "").split(",").map(t => t.trim()).filter(Boolean),
    minutos: Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200)),
    md
  });
}
posts.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.titulo.localeCompare(b.titulo, "pt-BR")));

const repetidos = posts.map(p => p.url).filter((u, i, lista) => lista.indexOf(u) !== i);
if (repetidos.length) throw new Error("Dois artigos geram o mesmo endereço: " + repetidos.join(", "));

await gravar("posts/posts.json", JSON.stringify(posts.map(({ md, ...p }) => p), null, 2) + "\n");

/* ---------- partes compartilhadas ---------- */
const ano = new Date().getFullYear();
const partes = {};
for (const nome of ["nav", "rodape", "atalho", "redes-hero"]) partes[nome] = (await ler(`scripts/partes/${nome}.html`)).trim();
const parte = (nome, prefixo) => partes[nome].replaceAll("{{raiz}}", prefixo).replaceAll("{{ano}}", ano);

function cardHtml(p, { prefixo = "", compacto = false, extra = "" } = {}) {
  const resumo = !compacto && p.resumo ? `\n  <p class="card__resumo">${esc(resumir(p.resumo, 150))}</p>` : "";
  const rodape = compacto ? "" : `\n  <span class="card__rodape"><span>${dataCurta(p.data)} · ${p.minutos} min</span><span>Ler <span class="chev" aria-hidden="true">›</span></span></span>`;
  return `<a class="card${compacto ? " card--compacto" : ""}${extra}" href="${prefixo}${p.url}">
  <span class="card__tag">${esc(p.tema)}</span>
  <h3 class="card__titulo">${esc(p.titulo)}</h3>${resumo}${rodape}
</a>`;
}

/* ---------- uma página por artigo ---------- */
const modelo = await ler("scripts/partes/artigo.html");
await rm(new URL("artigos/", raiz), { recursive: true, force: true });
await mkdir(new URL("artigos/", raiz), { recursive: true });

for (const p of posts) {
  // Links relativos escritos no artigo (ex.: calculadora.html) partem da raiz do site.
  const corpo = markdownParaHtml(p.md).replace(/href="(?!https?:|mailto:|tel:|#|\/|\.\.\/)([^"]+)"/g, 'href="../$1"');
  const outros = posts.filter(o => o !== p);
  const relacionados = [...outros.filter(o => o.tema === p.tema), ...outros.filter(o => o.tema !== p.tema)].slice(0, 2);
  const canonica = `${SITE}/${p.url}`;
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.titulo,
    description: p.resumo,
    datePublished: p.data,
    articleSection: p.tema,
    inLanguage: "pt-BR",
    mainEntityOfPage: canonica,
    author: { "@type": "Person", name: "Ygor Soares", url: SITE },
    publisher: { "@type": "Person", name: "Ygor Soares", url: SITE }
  }).replace(/</g, "\\u003c");

  const valores = {
    titulo: esc(p.titulo),
    descricao: esc(resumir(p.resumo || p.titulo, 160)),
    canonica,
    site: SITE,
    data: p.data,
    dataExtenso: dataExtenso(p.data),
    tema: esc(p.tema),
    minutos: p.minutos,
    versao: VERSAO,
    jsonld,
    intro: p.resumo ? `<p class="artigo__intro justificado">${esc(p.resumo)}</p>` : "",
    corpo,
    relacionados: relacionados.length
      ? `<section class="relacionados" aria-labelledby="rel-titulo">
      <h2 id="rel-titulo" class="h3">Continue lendo</h2>
      <div class="cards cards--2">
${relacionados.map(o => cardHtml(o, { prefixo: "../", compacto: true })).join("\n")}
      </div>
    </section>`
      : "",
    nav: parte("nav", "../"),
    rodape: parte("rodape", "../"),
    atalho: parte("atalho", "../")
  };
  await gravar(p.url, modelo.replace(/\{\{(\w+)\}\}/g, (m, chave) => (chave in valores ? valores[chave] : m)));
}

/* ---------- home ---------- */
const normalizar = t => semAcento(t).toLowerCase();
const destaque = posts[0];
const temasUsados = TEMAS.filter(t => posts.some(p => p.tema === t));

let home = await ler("index.html");
home = trocar(home, "gerado:meta", `<p class="capa__meta">${plural(posts.length, "artigo", "artigos")} · o mais recente em ${dataCurta(destaque.data)}</p>`);
home = trocar(home, "gerado:destaque", `<a class="tile tile--branco destaque reveal" href="${destaque.url}">
  <div class="destaque__texto">
    <p class="eyebrow">Mais recente · ${esc(destaque.tema)}</p>
    <h2 class="h2 h2--sm">${esc(destaque.titulo)}</h2>
    ${destaque.resumo ? `<p class="lead">${esc(resumir(destaque.resumo, 200))}</p>` : ""}
    <span class="destaque__rodape"><span>${dataCurta(destaque.data)} · ${destaque.minutos} min de leitura</span><span class="mais">Ler artigo <span class="chev" aria-hidden="true">›</span></span></span>
  </div>
  <div class="destaque__arte" aria-hidden="true"><span>§</span></div>
</a>`);
home = trocar(home, "gerado:chips", [`<button type="button" class="chip" data-tema="" aria-pressed="true">Todos</button>`,
  ...temasUsados.map(t => `<button type="button" class="chip" data-tema="${esc(t)}" aria-pressed="false">${esc(t)}</button>`)].join("\n"));
home = trocar(home, "gerado:cards", posts.map((p, i) => cardHtml(p, { extra: " reveal" })
  .replace("<a ", `<a data-tema="${esc(p.tema)}" data-busca="${esc(normalizar([p.titulo, p.resumo, p.tema, p.tags.join(" ")].join(" ")))}"${i === 0 ? " data-destaque" : ""} style="--d:${(i % 3) * 80}ms" `)).join("\n"));
home = trocar(home, "parte:redes-hero", parte("redes-hero", ""));
await gravar("index.html", home);

/* ---------- navegação, rodapé e atalho nas páginas fixas ---------- */
for (const pagina of ["index.html", "calculadora.html", "privacidade.html", "404.html"]) {
  let html = await ler(pagina);
  // No 404 o endereço pode ter qualquer profundidade: os links partem da raiz do domínio.
  const prefixo = pagina === "404.html" ? "/" : "";
  for (const nome of ["nav", "rodape", "atalho"]) {
    if (html.includes(`<!-- parte:${nome} -->`)) html = trocar(html, `parte:${nome}`, parte(nome, prefixo));
  }
  await gravar(pagina, html);
}

/* ---------- sitemap e RSS ---------- */
const urls = [
  { loc: `${SITE}/`, lastmod: destaque.data },
  ...posts.map(p => ({ loc: `${SITE}/${p.url}`, lastmod: p.data })),
  { loc: `${SITE}/calculadora.html` },
  { loc: `${SITE}/privacidade.html` }
];
await gravar("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`);

await gravar("feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Ygor Soares · Artigos</title>
  <link>${SITE}/</link>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Artigos sobre Direito do Trabalho, sem juridiquês.</description>
  <language>pt-BR</language>
${posts.slice(0, 30).map(p => `  <item>
    <title>${esc(p.titulo)}</title>
    <link>${SITE}/${p.url}</link>
    <guid>${SITE}/${p.url}</guid>
    <pubDate>${new Date(p.data + "T12:00:00Z").toUTCString()}</pubDate>
    <category>${esc(p.tema)}</category>
    <description>${esc(p.resumo)}</description>
  </item>`).join("\n")}
</channel>
</rss>
`);

console.log(`${plural(posts.length, "artigo gerado", "artigos gerados")}; temas: ${temasUsados.join(", ")}.`);
