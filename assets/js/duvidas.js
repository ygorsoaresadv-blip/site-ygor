/* Formulário de dúvidas: monta a mensagem e abre o WhatsApp
   com o texto pré-preenchido. Nenhum dado é armazenado pelo site. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-duvidas");
  if (!form) return;

  form.addEventListener("submit", ev => {
    ev.preventDefault();

    const nome = form.nome.value.trim();
    const email = form.email.value.trim();
    const duvida = form.duvida.value.trim();

    if (!nome || !duvida) return;

    const partes = [
      `Olá, Ygor! Vim pelo site.`,
      `Meu nome é ${nome}.`,
      email ? `E-mail para contato: ${email}.` : null,
      ``,
      `Minha dúvida: ${duvida}`
    ].filter(p => p !== null);

    const url = `https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent(partes.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  });
});
