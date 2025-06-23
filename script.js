const suits = ['♠', '♥', '♦', '♣'];
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const valueToPoints = {
  '2': 2,  '3': 3,  '4': 4,  '5': 5,  '6': 6,  '7': 7,
  '8': 8,  '9': 9, '10':10, 'J':10, 'Q':10, 'K':10, 'A':11
};

let deck = [];
let hand = [];
let discards = 3;
let totalPoints = 0;
let handCount = 1;
let currentSort = 'value'; // começa ordenando por valor

function createDeck() {
  deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({ suit: s, value: v });
    }
  }
  deck = deck.sort(() => Math.random() - 0.5); // embaralhar
}

function drawHand(extraCards = []) {
  while (extraCards.length < 8 && deck.length > 0) {
    extraCards.push(deck.pop());
  }
  hand = extraCards;
  sortHand();
  renderHand();
  updateDeckCount();
}

function startGame() {
  createDeck();
  totalPoints = 0;
  handCount = 1;
  discards = 3;
  document.getElementById("handNum").innerText = handCount;
  document.getElementById("discardsLeft").innerText = discards;
  document.getElementById("totalPoints").innerText = "$0";
  document.getElementById("comboName").innerText = "—";
  document.getElementById("comboValue").innerText = "0";
  document.getElementById("comboMult").innerText = "1";
  drawHand();
  updateDeckCount(); 
}

function renderHand() {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = '';

  hand.forEach((card, i) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";

    switch (card.suit) {
  case '♠': cardEl.classList.add('spade'); break;
  case '♥': cardEl.classList.add('heart'); break;
  case '♦': cardEl.classList.add('diamond'); break;
  case '♣': cardEl.classList.add('club'); break;
}
    cardEl.innerText = `${card.value}${card.suit}`;
    cardEl.onclick = () => toggleCardSelection(i);
    handDiv.appendChild(cardEl);
  });
}

function discardSelected() {
  if (discards <= 0) return alert("Sem descartes restantes!");
  const cards = document.querySelectorAll(".card");
  let selectedIndices = [];
  cards.forEach((el, i) => {
    if (el.classList.contains("selected")) selectedIndices.push(i);
  });
  if (selectedIndices.length > 0) {
    selectedIndices.forEach(i => {
      hand[i] = deck.pop();
    });
    discards--;
    document.getElementById("discardsLeft").innerText = discards;
    renderHand();
    updateDeckCount();
  }
}

function updateDeckCount() {
  const el = document.getElementById("deckCount");
  el.innerText = `Cartas no baralho: ${deck.length}`;
}


function playHand() {
  const cards = document.querySelectorAll(".card");
  let selectedIndices = [];
  cards.forEach((el, i) => {
    if (el.classList.contains("selected")) selectedIndices.push(i);
  });

  if (selectedIndices.length === 0) {
    alert("Selecione cartas para jogar!");
    return;
  }

  // Pega as cartas selecionadas para avaliar a mão
  const selectedCards = selectedIndices.map(i => hand[i]);

  // Avalia a melhor combinação dentro das cartas selecionadas
  const result = evaluateHand(selectedCards);

  // Só soma os pontos das cartas que fazem parte da combinação (result.cards)
  const cardValueSum = result.cards.reduce((sum, c) => sum + valueToPoints[c.value], 0);

  const totalThisHand = (result.fichas + cardValueSum) * result.mult;

  // Atualiza a interface
  document.getElementById("comboName").innerText = result.nome;
  document.getElementById("comboValue").innerText = result.fichas + cardValueSum;
  document.getElementById("comboMult").innerText = result.mult;
  totalPoints += totalThisHand;
  document.getElementById("totalPoints").innerText = `$${totalPoints}`;

  if (handCount < 4) {
    handCount++;
    document.getElementById("handNum").innerText = handCount;

    // Remove da mão as cartas jogadas (selecionadas)
    hand = hand.filter((_, i) => !selectedIndices.includes(i));

    // Desenha a nova mão
    drawHand(hand);
  } else {
    alert(`Fim de partida! Total: ${totalPoints} fichas`);
  }
}


function getSelectedCards() {
  const selectedCards = [];
  const handDiv = document.getElementById("hand");
  const cardsEls = handDiv.querySelectorAll(".card");

  cardsEls.forEach((el, i) => {
    if (el.classList.contains("selected")) {
      selectedCards.push(hand[i]);
    }
  });

  return selectedCards;
}

function updateSelectedCombo() {
  const selectedCards = getSelectedCards();

  if (selectedCards.length === 0) {
    document.getElementById("comboName").innerText = "—";
    document.getElementById("comboValue").innerText = "0";
    document.getElementById("comboMult").innerText = "1";
    return;
  }

  const result = evaluateHand(selectedCards);

  document.getElementById("comboName").innerText = result.nome;
  document.getElementById("comboValue").innerText = result.fichas;
  document.getElementById("comboMult").innerText = result.mult;
}

function toggleSort() {
  currentSort = currentSort === 'value' ? 'suit' : 'value';

  // Atualiza o texto do botão
  const btn = document.getElementById("sortBtn");
  btn.innerText = currentSort === 'value' ? "Ordenar por Naipe" : "Ordenar por Valor";

  sortHand();
  renderHand();
}

function sortHand() {
  if (currentSort === 'value') {
    hand.sort((a, b) => cardToNumber(b.value) - cardToNumber(a.value));
  } else {
    const suitOrder = ['♠', '♥', '♦', '♣'];
    hand.sort((a, b) => {
      if (a.suit === b.suit) {
        return cardToNumber(b.value) - cardToNumber(a.value);
      }
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    });
  }
}


function toggleCardSelection(index) {
  const handDiv = document.getElementById("hand");
  const cardEl = handDiv.children[index];
  const selectedCount = handDiv.querySelectorAll(".selected").length;

  if (cardEl.classList.contains("selected")) {
    cardEl.classList.remove("selected");
  } else {
    if (selectedCount < 5) {
      cardEl.classList.add("selected");
    } else {
      alert("Você só pode selecionar até 5 cartas.");
    }
  }

  updateSelectedCombo(); // Atualiza o combo no painel conforme seleção
}


function evaluateHand(hand) {
  const counts = {};
  const suits = {};
  const numValues = [];

  hand.forEach(c => {
    counts[c.value] = (counts[c.value] || 0) + 1;
    suits[c.suit] = (suits[c.suit] || 0) + 1;
    numValues.push(cardToNumber(c.value));
  });

  const valuesSorted = [...new Set(numValues)].sort((a, b) => a - b);

  // Verifica sequência
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
  for (const suit in suits) {
    if (suits[suit] >= 5) {
      flushSuit = suit;
      break;
    }
  }

  const flushCards = flushSuit ? hand.filter(c => c.suit === flushSuit) : [];

  const cardsByValue = {};
  hand.forEach(c => {
    if (!cardsByValue[c.value]) cardsByValue[c.value] = [];
    cardsByValue[c.value].push(c);
  });

  function getCardsOfValue(value, count) {
    return cardsByValue[value].slice(0, count);
  }

  const countEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // 🔶 Straight Flush
  if (flushSuit && straightVals) {
    const straightFlushCards = flushCards.filter(c =>
      straightVals.includes(cardToNumber(c.value))
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

  // 🔶 Quadra
  if (countEntries[0][1] === 4) {
    const quadCards = getCardsOfValue(countEntries[0][0], 4);
    return {
      nome: "Quadra",
      fichas: 60,
      mult: 7,
      cards: quadCards
    };
  }

  // 🔶 Full House
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

  // 🔶 Flush
  if (flushSuit) {
    return {
      nome: "Flush",
      fichas: 35,
      mult: 4,
      cards: flushCards.slice(0, 5)
    };
  }

  // 🔶 Sequência
  if (straightVals) {
    const straightCards = [];
    for (let v of straightVals) {
      const match = hand.find(c => cardToNumber(c.value) === v);
      if (match) straightCards.push(match);
    }
    return {
      nome: "Sequência",
      fichas: 30,
      mult: 4,
      cards: straightCards
    };
  }

  // 🔶 Trinca
  if (countEntries[0][1] === 3) {
    const triple = getCardsOfValue(countEntries[0][0], 3);
    return {
      nome: "Trinca",
      fichas: 30,
      mult: 3,
      cards: triple
    };
  }

  // 🔶 Dois Pares
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

  // 🔶 Par
  if (countEntries[0][1] === 2) {
    const pair = getCardsOfValue(countEntries[0][0], 2);
    return {
      nome: "Par",
      fichas: 10,
      mult: 2,
      cards: pair
    };
  }

  // 🔶 Carta Alta
  const highestCard = hand.reduce((max, c) =>
    cardToNumber(c.value) > cardToNumber(max.value) ? c : max, hand[0]
  );
  return {
    nome: "Carta Alta",
    fichas: 5,
    mult: 1,
    cards: [highestCard]
  };
}


// Função auxiliar que converte cartas para números
function cardToNumber(val) {
  if (val === 'J') return 11;
  if (val === 'Q') return 12;
  if (val === 'K') return 13;
  if (val === 'A') return 14;
  return parseInt(val);
}


function cardToNumber(val) {
  if (val === 'J') return 11;
  if (val === 'Q') return 12;
  if (val === 'K') return 13;
  if (val === 'A') return 14;
  return parseInt(val);
}

function isConsecutive(nums) {
  nums = [...new Set(nums)].sort((a, b) => a - b);
  for (let i = 0; i <= nums.length - 5; i++) {
    if (
      nums[i + 4] - nums[i] === 4 &&
      nums.slice(i, i + 5).every((n, j, arr) => j === 0 || n === arr[j - 1] + 1)
    ) {
      return true;
    }
  }
  return false;
}

// ✅ Inicia o jogo quando o DOM estiver carregado
window.addEventListener('DOMContentLoaded', () => {
  startGame();
});
