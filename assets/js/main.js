/* Comportamentos compartilhados: menu mobile, animação de entrada,
   links de redes vindos da configuração e ano do rodapé. */

document.addEventListener("DOMContentLoaded", () => {
  // Menu mobile
  const toggle = document.querySelector(".nav__toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const aberto = nav.classList.toggle("aberto");
      toggle.setAttribute("aria-expanded", String(aberto));
    });
  }

  // Links de redes sociais definidos em config.js
  document.querySelectorAll("[data-link='instagram']").forEach(a => (a.href = SITE_CONFIG.instagramUrl));
  document.querySelectorAll("[data-link='linkedin']").forEach(a => (a.href = SITE_CONFIG.linkedinUrl));
  document.querySelectorAll("[data-texto='instagram-handle']").forEach(el => (el.textContent = SITE_CONFIG.instagramHandle));

  // Ano do rodapé
  document.querySelectorAll("[data-texto='ano']").forEach(el => (el.textContent = new Date().getFullYear()));

  // Animação de entrada (respeita prefers-reduced-motion via CSS)
  const observador = new IntersectionObserver(
    entradas => {
      entradas.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("visivel");
          observador.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach(el => observador.observe(el));

  // Widget do Instagram (se a home tiver o container e o widget estiver configurado)
  const containerInsta = document.querySelector("[data-instagram-widget]");
  if (containerInsta) {
    if (SITE_CONFIG.instagramWidgetSrc) {
      const iframe = document.createElement("iframe");
      iframe.src = SITE_CONFIG.instagramWidgetSrc;
      iframe.title = "Últimos posts do Instagram";
      iframe.loading = "lazy";
      iframe.style.height = SITE_CONFIG.instagramWidgetHeight + "px";
      containerInsta.innerHTML = "";
      containerInsta.appendChild(iframe);
    }
  }
});

/* Utilidades compartilhadas */

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${dia} de ${meses[mes - 1]}. de ${ano}`;
}

function montarCardPost(post) {
  const art = document.createElement("article");
  art.className = "card-post reveal";
  art.innerHTML = `
    <div class="card-post__meta">
      <span class="card-post__tag"></span>
      <time datetime="${post.data}">${formatarDataBR(post.data)}</time>
    </div>
    <h3><a href="post.html?post=${encodeURIComponent(post.slug)}"></a></h3>
    <p class="card-post__resumo"></p>
    <a class="card-post__ler" href="post.html?post=${encodeURIComponent(post.slug)}">Ler artigo →</a>
  `;
  art.querySelector(".card-post__tag").textContent = post.tags[0] || "Direito do Trabalho";
  art.querySelector("h3 a").textContent = post.titulo;
  art.querySelector(".card-post__resumo").textContent = post.resumo;
  return art;
}

async function carregarIndicePosts() {
  const resp = await fetch("posts/posts.json");
  if (!resp.ok) throw new Error("Não foi possível carregar o índice de posts");
  const posts = await resp.json();
  return posts.sort((a, b) => (a.data < b.data ? 1 : -1));
}
