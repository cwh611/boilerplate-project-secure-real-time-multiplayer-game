import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

const canvas_height = 600;
const canvas_width = 800;

const player = new Player({x: 400, y: 550, score: 0, id: socket.id});
socket.emit("new_player", player);

let players = [];

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "W") {
    if (player.y - player.height - 10 >= 0) {
      player.movePlayer("up", 10);
    };
  } else if (event.key === "ArrowDown" || event.key === "S") {
    if (player.y + player.height + 10 <= canvas.height) {
      player.movePlayer("down", 10);
    };
  } else if (event.key === "ArrowLeft" || event.key === "A") {
    if (player.x - player.width - 10 >= 0) {
      player.movePlayer("left", 10);
    };
  } else if (event.key === "ArrowRight" || event.key === "D") {
    if (player.x + player.width + 10 <= canvas.width) {
      player.movePlayer("right", 10)
    }
  }
  socket.emit("player_moved", player);

});

socket.on("current_players", (server_players) => {

  players = server_players;

});

setInterval(() => player.collision(collectible), 50);
setInterval(() => player.calculateRank(players), 50);

const colors_array = ["red", "white", "blue"];

let collectible = null;

socket.on("current_collectible", (server_collectible) => {
  collectible = new Collectible(server_collectible);
  console.log("collectible:", collectible)
});

const draw = () => {

  context.fillStyle = "black";
  context.clearRect(0, 0, canvas.width, canvas.height);

  players.forEach(player => {
    context.fillStyle = colors_array[Math.floor(Math.random() * 3)];
    context.fillRect(player.x, player.y, 40, 40);
  })

  if (collectible) { 
    context.fillStyle = "yellow";
    context.fillRect(collectible.x, collectible.y, 20, 20);
  }

  requestAnimationFrame(draw);

}

draw();