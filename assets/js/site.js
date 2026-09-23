/* ============================================================
   Comportamentos compartilhados: menu do celular, entradas ao
   rolar, acordeões e utilitários de formatação.
   Exposto em window.Site para os scripts de cada página.
   ============================================================ */
(function () {
  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Entrada ao rolar: cada .reveal é observado uma vez ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }) : null;

  function observar(el) {
    if (io && !semMovimento.matches) io.observe(el);
    else el.classList.add('is-in');
  }

  /* ---------- Contagem numérica ([data-contar]) ----------
     <span data-contar="100" data-sufixo="%">100%</span>
     <span data-contar="12916.56" data-formato="brl">R$ 12.916,56</span>
     - o HTML já traz o valor final (sem JS e para buscadores)
     - leitores de tela leem só o valor final (cópia .sr-only)
     - roda uma vez, quando ~60% do número está visível
     - desacelera no fim (ease-out), largura estável (tabular-nums) */
  function formatar(el, v) {
    if (el.dataset.formato === 'brl') {
      return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return (el.dataset.prefixo || '') + Math.round(v).toLocaleString('pt-BR') + (el.dataset.sufixo || '');
  }
  function contar(el) {
    var alvo = parseFloat(el.dataset.contar);
    var dur = parseInt(el.dataset.duracao || '1200', 10);
    var atraso = parseInt(el.dataset.atraso || '0', 10);
    var final = el.dataset.final;
    setTimeout(function () {
      var inicio = performance.now();
      (function passo(agora) {
        var p = Math.min(1, (agora - inicio) / dur);
        var e = 1 - Math.pow(1 - p, 4);
        el.textContent = p < 1 ? formatar(el, alvo * e) : final;
        if (p < 1) requestAnimationFrame(passo);
      })(inicio);
      // garante o valor final mesmo com a aba em segundo plano (rAF pausado)
      setTimeout(function () { el.textContent = final; }, dur + 150);
    }, atraso);
  }
  var ioContar = 'IntersectionObserver' in window ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      ioContar.unobserve(e.target);
      contar(e.target);
    });
  }, { threshold: 0.6 }) : null;
  function prepararContagem(el) {
    var final = el.textContent.trim();
    el.dataset.final = final;
    var leitura = document.createElement('span');
    leitura.className = 'sr-only';
    leitura.textContent = final;
    el.setAttribute('aria-hidden', 'true');
    el.parentNode.insertBefore(leitura, el);
    if (!ioContar || semMovimento.matches) return;
    el.textContent = formatar(el, 0);
    ioContar.observe(el);
  }

  /* ---------- Menu do celular ---------- */
  function iniciarMenu() {
    var burger = document.querySelector('.burger');
    var menu = document.getElementById('m-menu');
    if (!burger || !menu) return;
    function setMenu(aberto) {
      document.body.classList.toggle('menu-open', aberto);
      burger.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      burger.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
      if (aberto) { menu.removeAttribute('inert'); menu.querySelector('a').focus({ preventScroll: true }); }
      else menu.setAttribute('inert', '');
    }
    burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- Acordeões (.acc__item > .acc__btn + .acc__painel) ---------- */
  function abrirItem(item, aberto) {
    var btn = item.querySelector('.acc__btn');
    item.classList.toggle('is-open', aberto);
    if (btn) btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  }
  function iniciarAcordeoes(raiz) {
    (raiz || document).querySelectorAll('.acc').forEach(function (acc) {
      var unico = acc.hasAttribute('data-unico');
      acc.querySelectorAll('.acc__item').forEach(function (item) {
        var btn = item.querySelector('.acc__btn');
        abrirItem(item, item.classList.contains('is-open'));
        btn.addEventListener('click', function () {
          var abrir = !item.classList.contains('is-open');
          if (unico && abrir) acc.querySelectorAll('.acc__item.is-open').forEach(function (o) { abrirItem(o, false); });
          abrirItem(item, abrir);
        });
      });
    });
  }

  /* ---------- Utilitários ---------- */
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function dataBR(iso) {
    var p = String(iso || '').split('-');
    if (p.length < 3) return '';
    return Number(p[2]) + ' de ' + MESES[Number(p[1]) - 1] + '. de ' + p[0];
  }
  // Primeira tag do post, sem marcações soltas ("**Tags:**") e com inicial maiúscula.
  function tema(tags) {
    var t = Array.isArray(tags) ? tags[0] : String(tags || '').split(',')[0];
    t = String(t || '').replace(/\*\*[^*]*\*\*/g, '').trim() || 'Direito do Trabalho';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function el(tag, cls, texto) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function resumir(texto, max) {
    texto = String(texto || '').trim();
    if (texto.length <= max) return texto;
    return texto.slice(0, max).replace(/\s+\S*$/, '') + '…';
  }
  // Card de artigo usado na home, no blog e em "continue lendo".
  function cardPost(p, opcoes) {
    opcoes = opcoes || {};
    var a = el('a', 'card' + (opcoes.compacto ? ' card--compacto' : ''));
    a.href = 'artigo.html?post=' + encodeURIComponent(p.slug);
    a.appendChild(el('span', 'card__tag', tema(p.tags)));
    a.appendChild(el('h3', 'card__titulo', p.titulo));
    if (opcoes.resumo && p.resumo) a.appendChild(el('p', 'card__resumo', resumir(p.resumo, 150)));
    if (!opcoes.compacto) {
      var rod = el('span', 'card__rodape');
      rod.appendChild(el('span', null, dataBR(p.data)));
      var ler = el('span', null, 'Ler ');
      ler.appendChild(el('span', 'chev', '›')).setAttribute('aria-hidden', 'true');
      rod.appendChild(ler);
      a.appendChild(rod);
    }
    return a;
  }

  window.Site = {
    semMovimento: semMovimento,
    observar: observar,
    iniciarAcordeoes: iniciarAcordeoes,
    abrirItem: abrirItem,
    dataBR: dataBR,
    tema: tema,
    el: el,
    resumir: resumir,
    cardPost: cardPost
  };

  function iniciar() {
    iniciarMenu();
    document.querySelectorAll('.reveal').forEach(observar);
    document.querySelectorAll('[data-contar]').forEach(prepararContagem);
    iniciarAcordeoes();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
