const socket = io();

let mao = [];
let monte = [];
let selecionadas = [];
let ordenado = false;
let totalPoints = 0;
let handCount = 1;
let discards = 3;

const handEl = document.getElementById("hand");
const deckSizeEl = document.getElementById("deckSize");

function getSuitClass(naipe) {
  switch (naipe) {
    case '♠': return 'spade';
    case '♥': return 'heart';
    case '♦': return 'diamond';
    case '♣': return 'club';
    default: return '';
  }
}

function renderHand() {
  handEl.innerHTML = "";
  let cartas = [...mao];

  if (ordenado) {
    cartas.sort((a, b) => a.naipe.localeCompare(b.naipe));
  }

  cartas.forEach((carta, i) => {
    const div = document.createElement("div");
    div.className = `card ${getSuitClass(carta.naipe)}`;
    div.innerHTML = `${carta.valor}<br>${carta.naipe}`;
    if (selecionadas.includes(i)) div.classList.add("selected");

    div.onclick = () => {
      const idx = selecionadas.indexOf(i);
      if (idx >= 0) {
        selecionadas.splice(idx, 1);
        div.classList.remove("selected");
      } else {
        if (selecionadas.length >= 5) return;
        selecionadas.push(i);
        div.classList.add("selected");
      }
    };

    handEl.appendChild(div);
  });

  deckSizeEl.innerText = monte.length;
}

function toggleSort() {
  ordenado = !ordenado;
  renderHand();
}

function playHand() {
  if (selecionadas.length === 0) {
    alert("Selecione até 5 cartas para jogar.");
    return;
  }

  const cartasJogadas = selecionadas.map(i => mao[i]);
  socket.emit("jogada", cartasJogadas);
}

function discardSelected() {
  if (discards <= 0) {
    alert("Você não tem mais descartes.");
    return;
  }

  if (selecionadas.length === 0) {
    alert("Nenhuma carta selecionada para descartar.");
    return;
  }

  selecionadas.sort((a, b) => b - a).forEach(idx => mao.splice(idx, 1));

  while (mao.length < 8 && monte.length > 0) {
    mao.push(monte.pop());
  }

  selecionadas = [];
  discards--;
  document.getElementById("discardsLeft").innerText = discards;
  renderHand();
}

socket.on("iniciarPartida", ({ voce, oponente, mao: m, monte: mt }) => {
console.log("Evento iniciarPartida recebido!");
console.log("Mão recebida:", m);

  mao = m;
  monte = mt;
  totalPoints = 0;
  handCount = 1;
  discards = 3;
  selecionadas = [];

  document.getElementById("handNum").innerText = handCount;
  document.getElementById("discardsLeft").innerText = discards;
  document.getElementById("totalPoints").innerText = "$0";
  document.getElementById("comboName").innerText = "-";
  document.getElementById("comboValue").innerText = "0";
  document.getElementById("comboMult").innerText = "1";

  renderHand();
});

socket.on("resultadoJogada", ({ nome, fichas, mult, pontos, mao: m, monte: mt, pontosTotais, jogadasFeitas }) => {
  document.getElementById("comboName").innerText = nome;
  document.getElementById("comboValue").innerText = fichas;
  document.getElementById("comboMult").innerText = mult;
  totalPoints = pontosTotais;
  document.getElementById("totalPoints").innerText = `$${totalPoints}`;

  // Atualiza mão e monte com dados do servidor
  mao = m;
  monte = mt;

  handCount = jogadasFeitas + 1;
  document.getElementById("handNum").innerText = handCount;
  selecionadas = [];
  renderHand();

  if (handCount > 4) {
    alert("Fim de partida!");
  }
});

socket.on("fimDeJogo", ({ vencedor, pontosVencedor, seuPontos, suaPosicao }) => {
  alert(`Fim de jogo! Vencedor: ${vencedor} com ${pontosVencedor.toFixed(2)} pontos. Você fez ${seuPontos.toFixed(2)} pontos.`);

  // Redirecionar para a página de melhorias, loja, ou gacha, conforme lógica do seu jogo
  window.location.href = "/loja.html"; // Exemplo, crie essa página
});
