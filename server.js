const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const valueToPoints = {
  '2': 2,  '3': 3,  '4': 4,  '5': 5,  '6': 6,  '7': 7,
  '8': 8,  '9': 9, '10':10, 'J':10, 'Q':10, 'K':10, 'A':11
};

function cardToNumber(val) {
  if (val === 'J') return 11;
  if (val === 'Q') return 12;
  if (val === 'K') return 13;
  if (val === 'A') return 14;
  return parseInt(val);
}

function evaluateHand(hand) {
  const counts = {};
  const suits = {};
  const numValues = [];

  hand.forEach(c => {
    counts[c.valor] = (counts[c.valor] || 0) + 1;
    suits[c.naipe] = (suits[c.naipe] || 0) + 1;
    numValues.push(cardToNumber(c.valor));
  });

  const valuesSorted = [...new Set(numValues)].sort((a, b) => a - b);

  function isConsecutive(nums) {
    for (let i = 0; i <= nums.length - 5; i++) {
      if (
        nums[i + 4] - nums[i] === 4 &&
        nums.slice(i, i + 5).every((n, j, arr) => j === 0 || n === arr[j - 1] + 1)
      ) {
        return nums.slice(i, i + 5);
      }
    }
    return null;
  }

  const straightVals = isConsecutive(valuesSorted);

  let flushSuit = null;
  for (const s in suits) {
    if (suits[s] >= 5) flushSuit = s;
  }

  const flushCards = flushSuit ? hand.filter(c => c.naipe === flushSuit) : [];

  const cardsByValue = {};
  hand.forEach(c => {
    if (!cardsByValue[c.valor]) cardsByValue[c.valor] = [];
    cardsByValue[c.valor].push(c);
  });

  function getCardsOfValue(value, count) {
    return cardsByValue[value].slice(0, count);
  }

  const countEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // Straight Flush
  if (flushSuit && straightVals) {
    const straightFlushCards = flushCards.filter(c =>
      straightVals.includes(cardToNumber(c.valor))
    );
    if (straightFlushCards.length >= 5) {
      return {
        nome: "Straight Flush",
        fichas: 100,
        mult: 8,
        cards: straightFlushCards.slice(0, 5)
      };
    }
  }

  // Quadra
  if (countEntries[0][1] === 4) {
    const quadCards = getCardsOfValue(countEntries[0][0], 4);
    return {
      nome: "Quadra",
      fichas: 60,
      mult: 7,
      cards: quadCards
    };
  }

  // Full House
  if (countEntries[0][1] === 3 && countEntries[1] && countEntries[1][1] >= 2) {
    const triple = getCardsOfValue(countEntries[0][0], 3);
    const pair = getCardsOfValue(countEntries[1][0], 2);
    return {
      nome: "Full House",
      fichas: 40,
      mult: 4,
      cards: [...triple, ...pair]
    };
  }

  // Flush
  if (flushSuit) {
    return {
      nome: "Flush",
      fichas: 35,
      mult: 4,
      cards: flushCards.slice(0, 5)
    };
  }

  // Sequência
  if (straightVals) {
    const straightCards = [];
    for (let v of straightVals) {
      const match = hand.find(c => cardToNumber(c.valor) === v);
      if (match) straightCards.push(match);
    }
    return {
      nome: "Sequência",
      fichas: 30,
      mult: 4,
      cards: straightCards
    };
  }

  // Trinca
  if (countEntries[0][1] === 3) {
    const triple = getCardsOfValue(countEntries[0][0], 3);
    return {
      nome: "Trinca",
      fichas: 30,
      mult: 3,
      cards: triple
    };
  }

  // Dois Pares
  const pairs = countEntries.filter(e => e[1] === 2);
  if (pairs.length >= 2) {
    const firstPair = getCardsOfValue(pairs[0][0], 2);
    const secondPair = getCardsOfValue(pairs[1][0], 2);
    return {
      nome: "Dois Pares",
      fichas: 20,
      mult: 2,
      cards: [...firstPair, ...secondPair]
    };
  }

  // Par
  if (countEntries[0][1] === 2) {
    const pair = getCardsOfValue(countEntries[0][0], 2);
    return {
      nome: "Par",
      fichas: 10,
      mult: 2,
      cards: pair
    };
  }

  // Carta Alta
  const highestCard = hand.reduce((max, c) =>
    cardToNumber(c.valor) > cardToNumber(max.valor) ? c : max, hand[0]
  );
  return {
    nome: "Carta Alta",
    fichas: 5,
    mult: 1,
    cards: [highestCard]
  };
}

function criarBaralho() {
  let baralho = [];
  for (const naipe of suits) {
    for (const valor of values) {
      baralho.push({ naipe, valor });
    }
  }
  // Embaralha
  return baralho.sort(() => Math.random() - 0.5);
}

const salas = {};

io.on('connection', (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);

  socket.on('criarSala', (nome) => {
    const salaId = Math.random().toString(36).substr(2, 5).toUpperCase();
    salas[salaId] = {
      jogadores: [{ id: socket.id, nome, pontos: 0, mao: [], monte: [], jogadasFeitas: 0 }]
    };
    socket.join(salaId);
    socket.emit('salaCriada', salaId);
    console.log(`Sala criada: ${salaId} por ${nome}`);
  });

  socket.on('entrarSala', ({ salaId, nome }) => {
    const sala = salas[salaId];
    if (!sala) {
      socket.emit('erro', 'Sala não existe');
      return;
    }
    if (sala.jogadores.length >= 2) {
      socket.emit('erro', 'Sala cheia');
      return;
    }
    sala.jogadores.push({ id: socket.id, nome, pontos: 0, mao: [], monte: [], jogadasFeitas: 0 });
    socket.join(salaId);

    // Criar baralhos e distribuir cartas
    const baralho1 = criarBaralho();
    const baralho2 = criarBaralho();

    sala.jogadores[0].mao = baralho1.splice(0, 8);
    sala.jogadores[0].monte = baralho1;
    sala.jogadores[1].mao = baralho2.splice(0, 8);
    sala.jogadores[1].monte = baralho2;

    // Envia dados para cada jogador
    sala.jogadores.forEach(jog => {
      io.to(jog.id).emit('iniciarPartida', {
        voce: { id: jog.id, nome: jog.nome, pontos: jog.pontos },
        oponente: sala.jogadores.find(j => j.id !== jog.id),
        mao: jog.mao,
        monte: jog.monte
      });
    });

    console.log(`Partida iniciada na sala ${salaId}`);
  });

  socket.on('jogada', (cartasJogadas) => {
    // Encontra a sala e jogador
    const salaId = Object.keys(salas).find(salaId => salas[salaId].jogadores.some(j => j.id === socket.id));
    if (!salaId) return;
    const sala = salas[salaId];
    const jogador = sala.jogadores.find(j => j.id === socket.id);
    if (!jogador) return;

    // Avaliar mão e calcular pontos
    const resultado = evaluateHand(cartasJogadas);

    // Somar valor das cartas na jogada
    const somaValores = cartasJogadas.reduce((acc, c) => acc + (valueToPoints[c.valor] || 0), 0);
    const pontosJogada = (resultado.fichas + somaValores) * resultado.mult;

    jogador.pontos += pontosJogada;
    jogador.jogadasFeitas++;

    // Remove cartas jogadas da mão do jogador
    cartasJogadas.forEach(carta => {
  const index = jogador.mao.findIndex(c => c.valor === carta.valor && c.naipe === carta.naipe);
  if (index !== -1) {
    jogador.mao.splice(index, 1);
  }
});


    // Puxar cartas do monte para completar 8 cartas na mão
    while (jogador.mao.length < 8 && jogador.monte.length > 0) {
      jogador.mao.push(jogador.monte.pop());
    }

    // Enviar resultado para o jogador
    io.to(jogador.id).emit('resultadoJogada', {
      nome: resultado.nome,
      fichas: resultado.fichas,
      mult: resultado.mult,
      pontos: pontosJogada,
      mao: jogador.mao,
      monte: jogador.monte,
      pontosTotais: jogador.pontos,
      jogadasFeitas: jogador.jogadasFeitas
    });

    // Verificar se ambos jogadores já fizeram as 4 jogadas
    if (sala.jogadores.every(j => j.jogadasFeitas >= 4)) {
      // Decide o vencedor
      const vencedor = sala.jogadores.reduce((a, b) => a.pontos > b.pontos ? a : b);

      // Envia resultado final para ambos
      sala.jogadores.forEach(j => {
        io.to(j.id).emit('fimDeJogo', {
          vencedor: vencedor.nome,
          pontosVencedor: vencedor.pontos,
          seuPontos: j.pontos,
          suaPosicao: j.id === vencedor.id ? 'vencedor' : 'perdedor'
        });
      });

      // Aqui você pode resetar ou limpar a sala, se quiser
    }
  });

  socket.on('disconnect', () => {
    console.log(`Jogador desconectado: ${socket.id}`);
    // Opcional: remover jogador da sala
  });
});

server.listen(3000, () => {
  console.log("🚀 Servidor rodando em http://localhost:3000");
});