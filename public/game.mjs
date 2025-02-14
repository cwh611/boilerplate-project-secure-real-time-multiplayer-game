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
    y: serverPlayer.y,
    ship: serverPlayer.ship || "ship_1",
    health: serverPlayer.health,
    score: serverPlayer.score
  };
});

socket.on("playerMoved", (serverPlayer) => {
  if (players[serverPlayer.id]) { 
    players[serverPlayer.id] = {
      x: serverPlayer.x,
      y: serverPlayer.y,
      ship: serverPlayer.ship || "ship_1",
      health: serverPlayer.health,
      score: serverPlayer.score
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

const ship_images = {
  ship_1: new Image(),
  ship_2: new Image(),
  ship_3: new Image(),
  ship_4: new Image()
};

const star_image = new Image();
star_image.src = "/assets/star_gold.png"

let images_loaded = 0;
const total_images = Object.keys(ship_images).length;

for (const key in ship_images) {
  ship_images[key].src = `/assets/${key}.png`;
  ship_images[key].onload = () => {
    images_loaded++;
    if (images_loaded === total_images) {
      console.log("All images loaded.");
      draw(); // Start the drawing loop after all images are loaded
    }
  };
  ship_images[key].onerror = () => {
    console.error(`Failed to load image: /assets/${key}.png`);
  };
}

const asteroid_images = {
  big: new Image(),
  med: new Image(),
  small: new Image()
};

asteroid_images.big.src = "/assets/big_asteroid.png";
asteroid_images.med.src = "/assets/med_asteroid.png";
asteroid_images.small.src = "/assets/small_asteroid.png"

const background_image = new Image();
background_image.src = "/assets/chatgpt_space_background.webp"

const draw = () => {
  
  context.drawImage(background_image, 0, 0, canvas.width, canvas.height);

  for (const id in players) {
    const { x, y, ship } = players[id];

    if (ship_images[ship] && ship_images[ship].complete) {
      context.drawImage(ship_images[ship], x, y, 40, 40);
    } else {
      console.error(`Image for ship ${ship} not loaded yet!`);
    }
  }

  requestAnimationFrame(draw);
  
  // draw asteroids
  asteroids.forEach(({ x, y, type, size }) => {
    context.drawImage(asteroid_images[type], x, y, size, size)
  });

  // draw stars
  stars.forEach(({ x, y }) => {
    context.drawImage(star_image, x, y, 15, 15)
  });
}