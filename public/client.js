const socket = io();

document.getElementById('criarBtn').onclick = () => {
  const nome = document.getElementById('nome').value.trim();
  if (nome) socket.emit('criarSala', nome);
};

document.getElementById('entrarBtn').onclick = () => {
  const nome = document.getElementById('nome').value.trim();
  const salaId = document.getElementById('salaId').value.trim().toUpperCase();
  if (nome && salaId) {
    socket.emit('entrarSala', { salaId, nome });
  }
};

socket.on('salaCriada', (salaId) => {
  alert(`Sala criada com ID: ${salaId}`);
});

socket.on('iniciarPartida', (dados) => {
  localStorage.setItem('mao', JSON.stringify(dados.mao));
  localStorage.setItem('monte', JSON.stringify(dados.monte));
  localStorage.setItem('voce', JSON.stringify(dados.voce));
  localStorage.setItem('oponente', JSON.stringify(dados.oponente));
  window.location.href = "/game.html";
});

socket.on('erro', (msg) => {
  alert(msg);
});
