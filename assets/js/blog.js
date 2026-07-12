/* Listagem do blog: carrega posts/posts.json e monta os cards. */

document.addEventListener("DOMContentLoaded", async () => {
  const lista = document.getElementById("lista-blog");
  if (!lista) return;

  try {
    const posts = await carregarIndicePosts();
    lista.innerHTML = "";
    posts.forEach(post => lista.appendChild(montarCardPost(post)));
    lista.querySelectorAll(".reveal").forEach(el => el.classList.add("visivel"));
  } catch (e) {
    lista.innerHTML = "<p>Não foi possível carregar os artigos agora. Tente novamente em instantes.</p>";
  }
});
