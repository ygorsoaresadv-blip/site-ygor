/* Página de post: busca o .md indicado em ?post=, converte para HTML
   e monta os botões de compartilhamento. */

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const slug = (params.get("post") || "").replace(/[\/\\]/g, "").replace(/\.\./g, "");
  const corpo = document.getElementById("post-conteudo");
  const cabecalho = document.getElementById("post-cabecalho");

  const falhar = msg => {
    cabecalho.querySelector("h1").textContent = "Artigo não encontrado";
    corpo.innerHTML = `<p>${msg}</p><p><a href="blog.html">← Voltar para o blog</a></p>`;
  };

  if (!slug) return falhar("O endereço não indica qual artigo abrir.");

  try {
    const resp = await fetch(`posts/${slug}.md`);
    if (!resp.ok) throw new Error();
    const { meta, corpo: md } = lerFrontmatter(await resp.text());

    const titulo = meta.titulo || slug;
    document.title = `${titulo} · Ygor Soares`;
    cabecalho.querySelector("h1").textContent = titulo;

    const tagEl = cabecalho.querySelector(".card-post__tag");
    tagEl.textContent = (meta.tags || "Direito do Trabalho").split(",")[0].trim();

    const timeEl = cabecalho.querySelector("time");
    if (meta.data) {
      timeEl.dateTime = meta.data;
      timeEl.textContent = formatarDataBR(meta.data);
    }

    corpo.innerHTML = markdownParaHtml(md);

    // Compartilhamento
    const url = location.href;
    const texto = `${titulo}\n${url}`;
    const btnWhats = document.getElementById("share-whatsapp");
    const btnLinkedin = document.getElementById("share-linkedin");
    const btnCopiar = document.getElementById("share-copiar");

    btnWhats.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    btnLinkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

    btnCopiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        btnCopiar.textContent = "Link copiado ✓";
        setTimeout(() => (btnCopiar.textContent = "Copiar link"), 2500);
      } catch (e) {
        prompt("Copie o link do artigo:", url);
      }
    });
  } catch (e) {
    falhar("Este artigo pode ter sido movido ou ainda não foi publicado.");
  }
});
