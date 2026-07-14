# Site — Ygor Soares

Site estático (HTML + CSS + JavaScript puro, sem build) com conteúdo sobre Direito do Trabalho: home, calculadora de rescisão, blog em markdown, área de dúvidas via WhatsApp e política de privacidade (LGPD).

## Estrutura

```
index.html            Home (hero, sobre, destaque da calculadora, últimos posts)
calculadora.html      Calculadora de rescisão trabalhista (tempo real)
blog.html             Listagem de artigos (lê posts/posts.json)
artigo.html           Página de artigo (carrega posts/<slug>.md via ?post=)
post.html             Redireciona links antigos para artigo.html
duvidas.html          Formulário de dúvidas → abre o WhatsApp com a mensagem pronta
privacidade.html      Política de Privacidade (LGPD)
posts/                Artigos em markdown + posts.json (índice)
admin/                Painel Decap CMS (publicação de artigos)
assets/css/fonts.css  Fontes locais (Archivo + Fraunces)
assets/fonts/         Arquivos .woff2 das fontes
assets/js/config.js   ⚙️ Configuração: WhatsApp, redes, widget do Instagram
assets/js/md.js       Conversor de markdown usado pela página de artigo
assets/img/           Imagens (foto ygor.jpg)
scripts/              Sync do índice do blog + worker OAuth do Decap
serve.ps1             Servidor local para visualizar (opcional)
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

**Pelo painel (recomendado):** acesse `/admin/` no site publicado, faça login com o GitHub e crie o artigo. Ao publicar, o Decap CMS grava o `.md` em `posts/` e o GitHub Actions atualiza `posts/posts.json` sozinho (workflow "Atualizar índice do blog"). A home, a listagem e a página do artigo se atualizam automaticamente.

**Manual:** crie um arquivo `posts/meu-novo-post.md` com o cabeçalho (frontmatter):

   ```markdown
   ---
   titulo: Título do artigo
   data: 2026-08-01
   resumo: Uma frase que aparece no card da listagem.
   tags: Rescisão
   ---

   Texto do artigo em markdown...
   ```

   Ao dar push na branch `main`, o índice `posts/posts.json` é regenerado automaticamente pelo GitHub Actions.

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
