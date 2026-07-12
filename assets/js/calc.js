/* ============================================================
   Calculadora de rescisão trabalhista — estimativa
   Regras aplicadas (visão geral):
   - Saldo de salário: dias corridos no mês do término (base 30 dias)
   - Aviso prévio: 30 dias + 3 por ano completo, limite de 90 (Lei 12.506/2011)
     · sem justa causa: indenizado (pago) ou trabalhado (já incluso no saldo)
     · acordo (art. 484-A CLT): aviso indenizado pela metade
     · pedido de demissão: trabalhado, ou desconto de 30 dias se não cumprido
   - Aviso indenizado projeta a data de término para 13º e férias
   - 13º e férias proporcionais: 1/12 por mês, fração ≥ 15 dias conta
   - Justa causa: perde aviso, 13º proporcional e férias proporcionais
   - FGTS: referência de 8% por mês de contrato; multa de 40% (ou 20% no acordo)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-calc");
  if (!form) return;

  const el = id => document.getElementById(id);
  const campos = {
    inicio: el("inicio"),
    fim: el("fim"),
    salario: el("salario"),
    tipo: el("tipo"),
    campoAviso: el("campo-aviso"),
    labelAviso: el("label-aviso"),
    opcoesAviso: el("opcoes-aviso"),
    feriasVencidas: el("ferias-vencidas"),
    recibo: el("recibo-corpo"),
    nota: el("recibo-nota")
  };

  const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = d =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const DIA_MS = 24 * 60 * 60 * 1000;

  function lerData(input) {
    if (!input.value) return null;
    const [a, m, d] = input.value.split("-").map(Number);
    return new Date(a, m - 1, d);
  }

  function lerSalario(str) {
    let s = str.replace(/[R$\s]/g, "");
    if (!s) return 0;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function somarDias(data, dias) {
    const d = new Date(data);
    d.setDate(d.getDate() + dias);
    return d;
  }

  function anosCompletos(inicio, fim) {
    let anos = fim.getFullYear() - inicio.getFullYear();
    const aniversario = new Date(fim.getFullYear(), inicio.getMonth(), inicio.getDate());
    if (fim < aniversario) anos--;
    return Math.max(0, anos);
  }

  /* Meses de serviço entre duas datas, contando fração ≥ 15 dias como mês cheio */
  function mesesComFracao(inicio, fim, limite) {
    if (fim < inicio) return 0;
    let meses = 0;
    let cursor = new Date(inicio);
    while (true) {
      const proximo = new Date(cursor);
      proximo.setMonth(proximo.getMonth() + 1);
      if (proximo <= fim) {
        meses++;
        cursor = proximo;
        if (limite && meses >= limite) return limite;
      } else {
        const diasRestantes = Math.round((fim - cursor) / DIA_MS) + 1;
        if (diasRestantes >= 15) meses++;
        break;
      }
    }
    return limite ? Math.min(meses, limite) : meses;
  }

  function diasAvisoPrevio(inicio, fim) {
    return Math.min(30 + 3 * anosCompletos(inicio, fim), 90);
  }

  function tempoVinculoTexto(inicio, fim) {
    const anos = anosCompletos(inicio, fim);
    const aposAnos = new Date(inicio);
    aposAnos.setFullYear(aposAnos.getFullYear() + anos);
    let meses = 0;
    const cursor = new Date(aposAnos);
    while (true) {
      cursor.setMonth(cursor.getMonth() + 1);
      if (cursor <= fim) meses++;
      else break;
    }
    const partes = [];
    if (anos) partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
    if (meses) partes.push(`${meses} ${meses > 1 ? "meses" : "mês"}`);
    return partes.length ? partes.join(" e ") : "menos de 1 mês";
  }

  /* ---------- Opções de aviso prévio por tipo de desligamento ---------- */

  const OPCOES_AVISO = {
    "sem-justa-causa": {
      rotulo: "Aviso prévio",
      opcoes: [
        { valor: "indenizado", texto: "Indenizado (pago sem trabalhar)" },
        { valor: "trabalhado", texto: "Trabalhado até o fim" }
      ]
    },
    "acordo": {
      rotulo: "Aviso prévio (no acordo, o indenizado vale metade)",
      opcoes: [
        { valor: "indenizado", texto: "Indenizado pela metade" },
        { valor: "trabalhado", texto: "Trabalhado" }
      ]
    },
    "pedido": {
      rotulo: "Aviso prévio (quem pede demissão deve cumprir 30 dias)",
      opcoes: [
        { valor: "trabalhado", texto: "Cumpri o aviso" },
        { valor: "nao-cumprido", texto: "Não cumpri (desconto de 30 dias)" }
      ]
    }
  };

  function atualizarOpcoesAviso() {
    const cfg = OPCOES_AVISO[campos.tipo.value];
    if (!cfg) {
      campos.campoAviso.hidden = true;
      return;
    }
    campos.campoAviso.hidden = false;
    campos.labelAviso.textContent = cfg.rotulo;
    campos.opcoesAviso.innerHTML = cfg.opcoes
      .map(
        (o, i) => `
        <label><input type="radio" name="aviso" value="${o.valor}" ${i === 0 ? "checked" : ""}> ${o.texto}</label>`
      )
      .join("");
  }

  /* ---------- Cálculo principal ---------- */

  function calcular() {
    const inicio = lerData(campos.inicio);
    const fim = lerData(campos.fim);
    const salario = lerSalario(campos.salario.value);
    const tipo = campos.tipo.value;
    const aviso = (form.querySelector("input[name='aviso']:checked") || {}).value;
    const feriasVencidas = parseInt(campos.feriasVencidas.value, 10) || 0;

    if (!inicio || !fim || !salario || !tipo) {
      campos.recibo.innerHTML =
        '<p class="recibo__vazio">Preencha as datas do contrato, o último salário e o tipo de desligamento para ver a estimativa.</p>';
      campos.nota.hidden = true;
      return;
    }

    if (fim < inicio) {
      campos.recibo.innerHTML =
        '<p class="recibo__vazio">A data de término precisa ser posterior à data de início.</p>';
      campos.nota.hidden = true;
      return;
    }

    const salarioDia = salario / 30;
    const linhas = [];
    const notas = [];

    /* Aviso prévio e projeção do contrato */
    let fimProjetado = new Date(fim);
    const diasAviso = diasAvisoPrevio(inicio, fim);

    if (tipo === "sem-justa-causa" && aviso === "indenizado") {
      linhas.push({
        rotulo: "Aviso prévio indenizado",
        sub: `${diasAviso} dias (30 + 3 por ano completo)`,
        valor: salarioDia * diasAviso
      });
      fimProjetado = somarDias(fim, diasAviso);
      notas.push("O aviso indenizado projeta o fim do contrato, aumentando 13º e férias proporcionais.");
    } else if (tipo === "acordo" && aviso === "indenizado") {
      const diasMetade = Math.floor(diasAviso / 2);
      linhas.push({
        rotulo: "Aviso prévio indenizado (metade)",
        sub: `${diasMetade} dias — art. 484-A da CLT`,
        valor: salarioDia * diasMetade
      });
      fimProjetado = somarDias(fim, diasMetade);
    } else if (tipo === "pedido" && aviso === "nao-cumprido") {
      linhas.push({
        rotulo: "Desconto do aviso não cumprido",
        sub: "30 dias em favor da empresa",
        valor: -salario,
        negativo: true
      });
    }

    /* Saldo de salário */
    const diasNoMes = Math.min(fim.getDate(), 30);
    linhas.unshift({
      rotulo: "Saldo de salário",
      sub: `${diasNoMes} dia${diasNoMes > 1 ? "s" : ""} no mês do término`,
      valor: salarioDia * diasNoMes
    });

    const perdeProporcionais = tipo === "justa-causa";

    /* 13º proporcional (ano do término, com projeção do aviso) */
    if (!perdeProporcionais) {
      const inicioAno = new Date(fimProjetado.getFullYear(), 0, 1);
      const base13 = inicio > inicioAno ? inicio : inicioAno;
      const avos13 = mesesComFracao(base13, fimProjetado, 12);
      if (avos13 > 0) {
        linhas.push({
          rotulo: "13º salário proporcional",
          sub: `${avos13}/12 de ${fmtBRL.format(salario)}`,
          valor: (salario / 12) * avos13
        });
      }
    }

    /* Férias proporcionais + 1/3 (período aquisitivo em curso) */
    if (!perdeProporcionais) {
      const anos = anosCompletos(inicio, fimProjetado);
      const inicioAquisitivo = new Date(inicio);
      inicioAquisitivo.setFullYear(inicioAquisitivo.getFullYear() + anos);
      const avosFerias = mesesComFracao(inicioAquisitivo, fimProjetado, 12);
      if (avosFerias > 0) {
        linhas.push({
          rotulo: "Férias proporcionais + 1/3",
          sub: `${avosFerias}/12 avos do período em curso`,
          valor: (salario / 12) * avosFerias * (4 / 3)
        });
      }
    }

    /* Férias vencidas + 1/3 (devidas em qualquer tipo de desligamento) */
    if (feriasVencidas > 0) {
      linhas.push({
        rotulo: `Férias vencidas + 1/3`,
        sub: `${feriasVencidas} período${feriasVencidas > 1 ? "s" : ""} completo${feriasVencidas > 1 ? "s" : ""}`,
        valor: salario * (4 / 3) * feriasVencidas
      });
    }

    const totalVerbas = linhas.reduce((s, l) => s + l.valor, 0);

    /* FGTS: referência de depósitos + multa conforme o tipo */
    const mesesContrato = mesesComFracao(inicio, fim);
    const fgtsRef = salario * 0.08 * mesesContrato;
    const linhasFgts = [
      {
        rotulo: "FGTS do período (referência)",
        sub: `8% × ${mesesContrato} ${mesesContrato > 1 ? "meses" : "mês"} de contrato`,
        valor: fgtsRef
      }
    ];

    if (tipo === "sem-justa-causa") {
      linhasFgts.push({ rotulo: "Multa de 40% do FGTS", sub: "sobre a referência acima", valor: fgtsRef * 0.4 });
      notas.push("No desligamento sem justa causa, o saldo do FGTS fica liberado para saque.");
    } else if (tipo === "acordo") {
      linhasFgts.push({ rotulo: "Multa de 20% do FGTS", sub: "acordo — art. 484-A da CLT", valor: fgtsRef * 0.2 });
      notas.push("No acordo, é possível sacar até 80% do saldo do FGTS.");
    } else if (tipo === "pedido") {
      notas.push("No pedido de demissão não há multa do FGTS e o saldo não fica liberado para saque imediato.");
    } else if (tipo === "justa-causa") {
      notas.push("Na justa causa não há multa do FGTS, e 13º e férias proporcionais não são devidos.");
    } else if (tipo === "prazo-determinado") {
      notas.push("No fim normal do contrato por prazo determinado não há aviso prévio nem multa de 40%, mas o FGTS fica liberado.");
    }

    const totalFgts = linhasFgts.reduce((s, l) => s + l.valor, 0);
    notas.push("Os valores de FGTS são referência: o valor real depende do saldo efetivamente depositado na conta.");

    /* ---------- Renderização do recibo ---------- */

    const NOMES_TIPO = {
      "sem-justa-causa": "Dispensa sem justa causa",
      "pedido": "Pedido de demissão",
      "justa-causa": "Dispensa por justa causa",
      "acordo": "Acordo (art. 484-A da CLT)",
      "prazo-determinado": "Fim de contrato por prazo determinado"
    };

    const linhaHtml = l => `
      <div class="recibo__linha">
        <span class="rotulo">${l.rotulo}${l.sub ? `<small>${l.sub}</small>` : ""}</span>
        <span class="valor${l.negativo ? " negativo" : ""}">${l.negativo ? "− " : ""}${fmtBRL.format(Math.abs(l.valor))}</span>
      </div>`;

    campos.recibo.innerHTML = `
      <div class="recibo__contexto">
        <span>${NOMES_TIPO[tipo]}</span>
        <span>Contrato: ${fmtData(inicio)} — ${fmtData(fim)} (${tempoVinculoTexto(inicio, fim)})</span>
        <span>Último salário: ${fmtBRL.format(salario)}</span>
      </div>
      ${linhas.map(linhaHtml).join("")}
      <div class="recibo__linha recibo__linha--subtotal">
        <span class="rotulo">Verbas rescisórias</span>
        <span class="valor">${fmtBRL.format(totalVerbas)}</span>
      </div>
      ${linhasFgts.map(linhaHtml).join("")}
      <div class="recibo__linha recibo__linha--subtotal">
        <span class="rotulo">FGTS + multa (referência)</span>
        <span class="valor">${fmtBRL.format(totalFgts)}</span>
      </div>
      <div class="recibo__total">
        <span class="rotulo">Total estimado</span>
        <span class="valor">${fmtBRL.format(totalVerbas + totalFgts)}</span>
      </div>
      ${notas.length ? `<p class="recibo__nota">${notas.join(" ")}</p>` : ""}
    `;
    campos.nota.hidden = false;
  }

  /* ---------- Eventos: atualização em tempo real ---------- */

  campos.tipo.addEventListener("change", () => {
    atualizarOpcoesAviso();
    calcular();
  });

  form.addEventListener("input", calcular);
  form.addEventListener("submit", ev => ev.preventDefault());

  atualizarOpcoesAviso();
  calcular();
});
