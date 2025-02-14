// import Player from './Player.mjs';
// import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

document.addEventListener("keydown", (event) => {
  
  let direction = null;
  
  if (event.key === "ArrowLeft" || event.key === "A") {
      direction = "left";
    } else if (event.key === "ArrowRight" || event.key === "D") {
        direction = "right";
    } else if (event.key === "ArrowUp" || event.key === "W") {
        direction = "up";
    } else if (event.key === "ArrowDown" || event.key === "S") {
        direction = "down";
    };
  
  if (direction) {
    socket.emit("move", direction);
  };
});

const players = {};

socket.on("currentPlayers", (serverPlayers) => {
  Object.assign(players, serverPlayers); // Copy existing players
  console.log(players)
});

socket.on("newPlayer", (serverPlayer) => {
  players[serverPlayer.id] = {
    x: serverPlayer.x,
    y: serverPlayer.y
  };
});

socket.on("playerMoved", (serverPlayer) => {
  if (players[serverPlayer.id]) { 
    players[serverPlayer.id] = {
      x: serverPlayer.x,
      y: serverPlayer.y
    };
  };
});

socket.on("removePlayer", (id) => {
  delete players[id]; // Remove from client
});

const asteroids = [];
socket.on("updateAsteroids", (serverAsteroids) => {
  asteroids.length = 0;
  asteroids.push(...serverAsteroids);
});

const stars = [];
socket.on("updateStars", (serverStars) => {
  stars.length = 0;
  stars.push(...serverStars);
});

const draw = () => {
  
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "green";
  for (const id in players) {
    const { x, y } = players[id];
    context.fillRect(x, y, 10, 10); // Draw each player
  };

  requestAnimationFrame(draw);
  
  // Draw asteroids
  context.fillStyle = "gray";
  asteroids.forEach(({ x, y }) => {
    context.beginPath();
    context.arc(x, y, 10, 0, Math.PI * 2); // Circular asteroids
    context.fill();
  });

  context.fillStyle = "yellow";
  stars.forEach(({ x, y }) => {
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();
  });
}

draw();