# Blog — Ygor Soares

Blog estático (HTML + CSS + JavaScript puro) com artigos sobre Direito do Trabalho. O site tem uma única finalidade: publicar e ler artigos. Não há formulário, WhatsApp nem página de contato. A calculadora de rescisão continua disponível por um botão pequeno e fixo no canto da tela.

## Estrutura

```
index.html              Home: capa com a foto, artigo mais recente e todos os artigos (busca + filtro por tema)
artigos/<endereço>.html Uma página por artigo (gerada, não edite à mão)
calculadora.html        Calculadora de rescisão (roda só no navegador)
privacidade.html        Política de Privacidade
404.html                Página de endereço não encontrado
artigo.html, post.html  Só redirecionam links antigos (artigo.html?post=...) para artigos/
posts/                  Artigos em markdown + posts.json (índice gerado)
admin/                  Painel Decap CMS (publicação de artigos)
scripts/gerar-site.mjs  Gera artigos/, a lista da home, posts.json, sitemap.xml e feed.xml
scripts/partes/         Navegação, rodapé, atalho da calculadora, botões de rede e modelo do artigo
assets/css/site.css     Estilos compartilhados
assets/js/site.js       Animações de entrada e utilitários
assets/js/md.js         Conversor de markdown usado pelo gerador
assets/img/             Imagens (ygor-hero.jpg/.webp é a foto da capa)
```

## Como publicar um artigo

**Pelo painel (recomendado):** acesse `/admin/` no site publicado, entre com o GitHub e crie o artigo. Escolha um **Tema** (é ele que aparece no card e no filtro da home). Ao publicar, o GitHub Actions ("Gerar páginas do blog") cria a página do artigo e atualiza a home, o sitemap e o RSS sozinho.

**Manual:** crie `posts/meu-novo-artigo.md` com o cabeçalho:

```markdown
---
titulo: Título do artigo
data: 2026-12-01
tema: Rescisão
resumo: Uma frase que aparece no card, no topo do artigo e no Google.
tags: FGTS, multa de 40%
---

Texto do artigo em markdown...
```

Temas aceitos: Rescisão, Jornada, Vínculo, Salário, Saúde e segurança, Processo, Categorias, Além do trabalho. Para criar outro, acrescente o nome em `TEMAS` (`scripts/gerar-site.mjs`) e nas opções do campo "Tema" (`admin/config.yml`).

Ao dar push na branch `main`, o gerador roda automaticamente. Para rodar no seu computador: `node scripts/gerar-site.mjs`.

## Como mudar a navegação, o rodapé ou as redes

Edite os arquivos em `scripts/partes/` e rode o gerador (ou dê push): ele reaplica as partes em todas as páginas, entre os comentários `<!-- parte:... -->`. Os links de Instagram e LinkedIn ficam em `nav.html`, `rodape.html` e `redes-hero.html`.

## Como trocar a foto da capa

Substitua `assets/img/ygor-hero.jpg` e `assets/img/ygor-hero.webp` mantendo os nomes (retrato, proporção próxima de 4:5, pelo menos 1000 px de largura).

## Como visualizar localmente

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
# depois abra http://localhost:8321/
```

## Observações

- O site não coleta dados: não há formulário, cadastro nem envio de mensagens.
- A calculadora roda inteiramente no navegador: nenhum valor é enviado a servidor.
- O site não menciona qualificação profissional nem oferece atendimento, por decisão de escopo: é um blog.
