/* ============================================================
   Linha do tempo processual — "roda" das fases (home)

   Adaptação em JS puro do componente WorksWheel (21st.dev):
   as fases começam num anel em volta do título; ao rolar, o anel
   abre num tambor vertical: a fase da frente fica plana e grande,
   as vizinhas giram em perspectiva para cima e para baixo.

   Tudo depende de um número, `turn`:
     0 = anel · 1 = tambor com a fase 1 na frente · N = última fase
   Diferença do original: `turn` vem da ROLAGEM DA PÁGINA (palco
   fixo com position: sticky), não de capturar a roda do mouse.
   Assim a página nunca fica "presa", funciona igual no toque, no
   touchpad e no teclado, e cada fase "segura" um pouco na frente.

   Movimento reduzido ou sem suporte: fica o modo estático (lista).
   ============================================================ */
(function () {
  var sec = document.getElementById('jornada');
  if (!sec) return;
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduz.matches || !('IntersectionObserver' in window)) return;

  var trilho = sec.querySelector('.jornada__trilho');
  var palco = sec.querySelector('.jornada__palco');
  var roda = sec.querySelector('.roda');
  var eixo = sec.querySelector('.roda__eixo');
  var rotulo = sec.querySelector('.jornada__rotulo');
  var fases = [].slice.call(sec.querySelectorAll('.fase'));
  var botoes = [].slice.call(sec.querySelectorAll('.jornada__indice button'));
  var N = fases.length;
  if (!N) return;

  /* Geometria (mesmos parâmetros do original, medidos pela carta) */
  var CARD_H = 0.38;     // altura da carta, em fração do palco
  var CARD_MAX_W = 0.34; // ...sem passar desta fração da largura
  var RATIO = 1.45;      // largura / altura (ilustrações 580×400)
  var STEP = 40;         // graus entre cartas no tambor
  var DRUM = 2.22;       // raio do tambor, em alturas de carta
  var LENS = 2.7;        // distância da perspectiva
  var RING_R = 1.14;     // raio do anel
  var BOW = 1.82;        // arco que puxa as vizinhas para a esquerda
  var CULL = 1.6;        // além disso a carta está de perfil: some
  var EASE = 0.12;       // fração da distância fechada por quadro
  var SEGURA = 0.22;     // fração de cada trecho em que a fase fica parada

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rad(g) { return g * Math.PI / 180; }

  /* Cartas: clonam a ilustração de cada fase (o texto continua no HTML,
     acessível e legível para buscadores; a roda é só visual) */
  var cartas = fases.map(function (f) {
    var carta = document.createElement('div');
    carta.className = 'roda__carta';
    var face = document.createElement('span');
    face.className = 'roda__face';
    var svg = f.querySelector('.fase__arte svg').cloneNode(true);
    svg.removeAttribute('role');
    svg.removeAttribute('aria-label');
    face.appendChild(svg);
    carta.appendChild(face);
    eixo.appendChild(carta);
    return carta;
  });

  sec.classList.add('is-roda');

  var G = {};
  function medir() {
    var w = palco.clientWidth, h = palco.clientHeight;
    var movel = w <= 900;
    var cardW = movel ? Math.min(w * 0.84, h * 0.3 * RATIO) : Math.min(h * CARD_H * RATIO, w * CARD_MAX_W);
    var cardH = cardW / RATIO;
    // no desktop o anel fica à direita, ao lado do título: um pouco menor para não invadir a coluna de texto
    var ringR = movel ? Math.min(cardH * RING_R, w * 0.3) : cardH * 0.8;
    G = {
      w: w, h: h, movel: movel, cardW: cardW, cardH: cardH, ringR: ringR,
      drumR: cardH * DRUM, bow: cardH * BOW, depth: cardH * LENS,
      // encolhe as cartas no anel até o círculo parecer fechado
      // (com poucas fases o limite de 0.56 evita que o anel encoste nas bordas)
      ringScale: clamp(((2 * Math.PI * ringR) / N) * 0.82 / cardW, 0.16, 0.44)
    };
    roda.style.perspective = G.depth + 'px';
    cartas.forEach(function (c) {
      c.style.width = cardW + 'px';
      c.style.height = cardH + 'px';
      c.style.marginLeft = (-cardW / 2) + 'px';
      c.style.marginTop = (-cardH / 2) + 'px';
    });
  }

  /* Posição de cada carta: termos do anel somem conforme m → 1 */
  function posicionar(ringDeg, drumDeg, m) {
    var arco = -G.bow * (1 - Math.cos(rad(drumDeg)));
    return 'translateX(' + (m * arco) + 'px)' +
      ' rotateZ(' + ((1 - m) * ringDeg) + 'deg) translateY(' + (-(1 - m) * G.ringR) + 'px)' +
      ' rotateX(' + (m * drumDeg) + 'deg) translateZ(' + (m * G.drumR) + 'px)';
  }

  /* Rolagem → turn, com "pausa" em cada fase */
  function navH() { return parseFloat(getComputedStyle(palco).top) || 0; }
  function vao() { return Math.max(1, trilho.offsetHeight - palco.offsetHeight); }
  function turnDaRolagem() {
    var p = clamp((navH() - trilho.getBoundingClientRect().top) / vao(), 0, 1);
    var raw = clamp(p * (N + 0.4) - 0.2, 0, N);
    var k = Math.floor(raw);
    if (k >= N) return N;
    var g = clamp(((raw - k) - SEGURA) / (1 - 2 * SEGURA), 0, 1);
    return k + g * g * (3 - 2 * g);
  }
  function rolarPara(fase) {
    var raw = fase + 1;
    var p = (raw + 0.2) / (N + 0.4);
    var topo = trilho.getBoundingClientRect().top + window.pageYOffset - navH();
    window.scrollTo({ top: topo + p * vao(), behavior: 'smooth' });
  }

  var turn = 0, alvo = 0, quadro = 0, ativa = -2;

  function aplicar() {
    var m = clamp(turn, 0, 1);
    var pos = Math.max(0, turn - 1);
    // o anel fica mais à direita, longe do título da coluna esquerda; ao abrir, volta ao centro do tambor
    var cx = G.movel ? G.w * 0.5 : lerp(G.w * 0.68, G.w * 0.64, m);
    var cy = G.movel ? G.h * 0.26 : G.h * 0.5;

    roda.style.perspectiveOrigin = cx + 'px ' + cy + 'px';
    eixo.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translateZ(' + (-m * G.drumR) + 'px)';

    for (var i = 0; i < N; i++) {
      var d = i - pos;
      var c = cartas[i];
      c.style.transform = posicionar(d * (360 / N), d * STEP, m);
      var op = 1;
      if (m > 0.5) {
        if (Math.abs(d) > CULL) op = 0;
        else if (G.movel) op = clamp(1.4 - Math.abs(d), 0, 1); // no celular o texto fica embaixo
      }
      c.style.opacity = op;
      c.firstChild.style.transform = 'scale(' + lerp(G.ringScale, 1, m) + ')';
    }

    rotulo.style.opacity = clamp(1 - m * 2, 0, 1);
    rotulo.style.visibility = m > 0.5 ? 'hidden' : 'visible';

    var perto = m > 0.5 ? clamp(Math.round(pos), 0, N - 1) : -1;
    if (perto !== ativa) {
      ativa = perto;
      fases.forEach(function (f, j) { f.classList.toggle('is-ativa', j === perto); });
      botoes.forEach(function (b, j) {
        if (j === perto) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    }
  }

  function desenhar() {
    quadro = 0;
    var gap = alvo - turn;
    if (Math.abs(gap) < 0.0005) turn = alvo;
    else turn += gap * EASE;
    aplicar();
    if (turn !== alvo) quadro = requestAnimationFrame(desenhar);
  }
  function agendar() {
    alvo = turnDaRolagem();
    if (!quadro) quadro = requestAnimationFrame(desenhar);
  }

  /* Só escuta a rolagem enquanto a seção está perto da tela */
  var ouvindo = false;
  new IntersectionObserver(function (e) {
    if (e[0].isIntersecting && !ouvindo) { ouvindo = true; window.addEventListener('scroll', agendar, { passive: true }); agendar(); }
    else if (!e[0].isIntersecting && ouvindo) { ouvindo = false; window.removeEventListener('scroll', agendar); }
  }, { rootMargin: '25% 0px 25% 0px' }).observe(trilho);

  botoes.forEach(function (b) {
    b.addEventListener('click', function () { rolarPara(Number(b.getAttribute('data-fase'))); });
  });

  var tResize = 0;
  window.addEventListener('resize', function () {
    clearTimeout(tResize);
    tResize = setTimeout(function () { medir(); agendar(); }, 120);
  }, { passive: true });

  // Se o usuário ligar "reduzir movimento" com a página aberta, volta à lista.
  reduz.addEventListener('change', function (e) {
    if (!e.matches) return;
    window.removeEventListener('scroll', agendar);
    sec.classList.remove('is-roda');
    cartas.forEach(function (c) { c.remove(); });
    rotulo.style.opacity = rotulo.style.visibility = '';
  });

  medir();
  turn = alvo = turnDaRolagem();
  aplicar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { medir(); agendar(); });
})();
