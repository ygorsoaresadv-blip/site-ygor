# Site — Ygor Soares

Site estático (HTML + CSS + JavaScript puro, sem build) com conteúdo sobre Direito do Trabalho: home, calculadora de rescisão, blog em markdown, área de dúvidas via WhatsApp e política de privacidade (LGPD).

## Estrutura

```
index.html            Home (hero, sobre, Instagram, destaque da calculadora, últimos posts)
calculadora.html      Calculadora de rescisão trabalhista (tempo real)
blog.html             Listagem de artigos
post.html             Página de artigo (carrega posts/<slug>.md)
duvidas.html          Formulário de dúvidas → abre o WhatsApp com a mensagem pronta
privacidade.html      Política de Privacidade (LGPD)
posts/                Artigos em markdown + posts.json (índice)
assets/css/style.css  Estilos do site inteiro
assets/js/config.js   ⚙️ Configuração: WhatsApp, redes, widget do Instagram
assets/img/           Imagens (coloque aqui a foto ygor.jpg)
serve.ps1             Servidor local para visualizar (opcional)
_antigo/              Backup da versão anterior do site
```

## Como visualizar localmente

O blog carrega arquivos via `fetch`, então é preciso um servidor local (abrir o arquivo direto não funciona para o blog):

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
# depois abra http://localhost:8321/
```

## Como publicar (Netlify)

O site é 100% estático — basta arrastar a pasta inteira em https://app.netlify.com/drop (ou conectar um repositório Git). Nenhum build é necessário.

## Como adicionar um post no blog

1. Crie um arquivo `posts/meu-novo-post.md` com o cabeçalho (frontmatter):

   ```markdown
   ---
   titulo: Título do artigo
   data: 2026-08-01
   resumo: Uma frase que aparece no card da listagem.
   tags: Rescisão
   ---

   Texto do artigo em markdown...
   ```

2. Adicione uma entrada correspondente em `posts/posts.json` (slug = nome do arquivo sem `.md`). A listagem, a home e a página do post se atualizam sozinhas.

## Como colocar a foto do "Sobre"

Salve a foto como `assets/img/ygor.jpg` (retrato, proporção 4:5 — por exemplo 800×1000px). Enquanto ela não existir, a home mostra um placeholder elegante.

## Como ativar o embed do Instagram

1. Crie um widget gratuito no [SnapWidget](https://snapwidget.com) (ou Elfsight) para o perfil `@ygorsoares_bjj`.
2. Copie a URL do iframe gerado (ex.: `https://snapwidget.com/embed/123456`).
3. Cole em `assets/js/config.js`, no campo `instagramWidgetSrc`.

Enquanto o widget não estiver configurado, a home mostra um cartão com link direto para o perfil.

## Como trocar o número do WhatsApp

Edite `assets/js/config.js` → campo `whatsapp` (formato internacional, ex.: `5511991680688`).

## Observações

- A calculadora roda inteiramente no navegador: nenhum dado é enviado a servidor.
- O site não menciona qualificação profissional em nenhuma página, por decisão de escopo — é um canal de conteúdo e divulgação.
