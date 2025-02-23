import Player from './Player.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

const canvas_height = 600;
const canvas_width = 950;

const ship_options = ["ship_1", "ship_2", "ship_3", "ship_4"];
let player;
let players = [];
const bullets = [];
const enemies = [];
const enemy_bullets = [];

class Bullet {
  
  constructor(player) {
    
    this.x = player.x + player.width / 2;
    this.y = player.y;
    this.speed = 5;
    this.size = 20;
    this.direction = player.angle;
    this.angle = player.angle 
  }

  move() {
    
    this.x += Math.sin(this.direction) * this.speed;
    this.y -= Math.cos(this.direction) * this.speed;
  
  }
}

let game_over = false;

socket.on("connect", () => {
  player = new Player({id: socket.id, ship: ship_options[Math.floor(Math.random() * ship_options.length)]});
  if (player.id && player.ship) {
    players.push(player);
    console.log("player on socket connect:", player);
    socket.emit("new_player", player);
    game_loop();
    draw();
  } else {
    alert("Unable to initialize player");
    return;
  }
})

socket.on("current_players", (server_players) => {

  players = server_players;
  document.getElementById("player-container-master").innerHTML = "";
  players.forEach(player => {
    document.getElementById("player-container-master").innerHTML += 
      `<div class="player-container" id="player-${player.id}-container">
        <div>
          <span>
            Player
          </span>
          <span class="stat-value">
            ${player.id}
          </span>
        </div>
        <div>
          <span>
            Rank: 
          </span>
          <span class="stat-value">
            ${new Player(player).calculateRank(players)}
          </span>
        </div>
        <div>
          <span>
            Score:
          </span>
          <span class="stat-value">
            ${player.score}
          </span>
        </div>
        <div>
          <span>
            Health:
          </span>
          <span class="stat-value">
            ${player.health}
          </span>
        </div>
      </div>`;
    if (player.shield > 0) {
      document.getElementById(`player-${player.id}-container`).innerHTML += 
        `<div>
          <span>
            Shield: 
          </span>
          <span class="shield-value">
            ${player.shield}
          </span>
        </div>`
    }
  });
});

const keys = new Set();

document.addEventListener("keydown", (event) => {
  if (game_over) return;
  keys.add(event.key);
  if (event.key === " ") {
    const new_bullet = new Bullet(player);
    bullets.push(new_bullet);
    socket.emit("new_bullet", new_bullet);
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key); 
});

const update_bullets = () => {
  bullets.forEach((bullet, index) => {
    bullet.move();

    if (bullet.y < 0 || bullet.x < 0 || bullet.y > canvas_height || bullet.x > canvas_width) {
      bullets.splice(index, 1);
    }
    enemies.forEach((enemy, enemy_index) => {
      if (bullet.x < enemy.x + enemy.size &&
        bullet.x + bullet.size > enemy.x &&
        bullet.y < enemy.y + enemy.size &&
        bullet.y + bullet.size > enemy.y) {
          if (enemy.health > 0) {
            enemy.health -= 10;
          } else {
            enemies.splice(enemy_index, 1);
          }
          bullets.splice(index, 1);
          socket.emit("update_enemy_health", enemies);
      };
    });
  });

  socket.emit("update_bullets", ({client_bullets: bullets})); // Send updated bullets to server

};

socket.on("new_enemy_bullet", (server_enemy_bullets) => {
  enemy_bullets.length = 0;
  enemy_bullets.push(...server_enemy_bullets);
})

const update_enemy_bullets = () => {
  console.log(enemy_bullets.length);
  enemy_bullets.forEach((enemy_bullet, index) => {
    enemy_bullet.x += Math.cos(enemy_bullet.direction) * enemy_bullet.speed;
    enemy_bullet.y += Math.sin(enemy_bullet.direction) * enemy_bullet.speed;
    if (enemy_bullet.y < 0 || enemy_bullet.x < 0 || enemy_bullet.y > canvas_height || enemy_bullet.x > canvas_width) {
      enemy_bullets.splice(index, 1);
    };
    if (enemy_bullet.x < player.x + player.width &&
      enemy_bullet.x + enemy_bullet.size > player.x &&
      enemy_bullet.y < player.y + player.height &&
      enemy_bullet.y + enemy_bullet.size > player.y) {
        enemy_bullets.splice(index, 1);
        if (player.shield === 0) {
          player.health = player.health === 0 ? player.health : player.health - 10;
        } else {
          player.shield -= 10;
        };
    };
  });
  const player_index = players.findIndex(p => p.id === player.id);
  players[player_index] = player;
  socket.emit("update_enemy_bullets", ({client_enemy_bullets: enemy_bullets, client_players: players}));
};

const game_loop = () => {
  if (game_over) return;
  update_bullets();
  if (enemy_bullets.length > 0) {
    update_enemy_bullets();
  };
  if (keys.has("ArrowUp")) player.movePlayer("up", 5);
  if (keys.has("ArrowDown")) player.movePlayer("down", 5);

  if (keys.has("a")) {
    player.angle -= 0.1;
  }

  if (keys.has("d")) {
    player.angle += 0.1;
  }

  socket.emit("player_moved", player); // Send updated position to server

  requestAnimationFrame(game_loop); // Keep updating movement

};

const asteroids = [];
socket.on("update_asteroids", (server_asteroids) => {
  asteroids.length = 0;
  asteroids.push(...server_asteroids);
  asteroids.forEach((asteroid, index) => {
    if (player.collision(asteroid)) {
      if (player.shield === 0) {
        player.health = player.health === 0 ? player.health : player.health - 10;
      } else {
        player.shield -= 10;
      };
      socket.emit("asteroid_collision", { client_asteroid: asteroid, client_player: player });
    };
  })
  bullets.forEach((bullet, bullet_index) => {
    asteroids.forEach((asteroid, asteroid_index) => {
      if (bullet.x < asteroid.x + asteroid.size &&
          bullet.x + bullet.size > asteroid.x &&
          bullet.y < asteroid.y + asteroid.size &&
          bullet.y + bullet.size > asteroid.y) {

            asteroids.splice(asteroid_index, 1); 
            bullets.splice(bullet_index, 1); 
            socket.emit("asteroid_destroyed", { asteroid, bullet }); 
          }
    });
  });
});

const stars = [];
socket.on("update_stars", (server_stars) => {
  stars.length = 0;
  stars.push(...server_stars);
  stars.forEach((star, index) => {
    if (player.collision(star)) {
      player.score = player.health === 0 ? player.score : player.score + 5;
      socket.emit("star_collision", {client_star: star, client_player: player});
    };
  });
});

const shields = [];
socket.on("update_shields", (server_shields) => {
  shields.length = 0;
  shields.push(...server_shields)
  shields.forEach((shield, index) => {
    if (player.collision(shield)) {
      player.shield += 10;
      socket.emit("shield_collision", {client_shield: shield, client_player: player});
    };
  });
});

socket.on("update_enemies", (server_enemies) => {
  enemies.length = 0;
  enemies.push(...server_enemies);
});

const ship_images = {
  ship_1: new Image(),
  ship_2: new Image(),
  ship_3: new Image(),
  ship_4: new Image()
};

ship_images.ship_1.src = "/assets/ship_1.png";
ship_images.ship_2.src = "/assets/ship_2.png";
ship_images.ship_3.src = "/assets/ship_3.png";
ship_images.ship_4.src = "/assets/ship_4.png";

const star_image = new Image();
star_image.src = "/assets/star_gold.png";

const asteroid_images = {
  big: new Image(),
  med: new Image(),
  small: new Image()
};

const shield_images = {
  red: new Image(),
  blue: new Image(),
  green: new Image(),
  yellow: new Image()
};

const enemy_images = {
  red: new Image(),
  blue: new Image(),
  green: new Image(),
  yellow: new Image()
}

shield_images.red.src = "/assets/powerupRed_shield.png";
shield_images.blue.src = "/assets/powerupBlue_shield.png";
shield_images.green.src = "/assets/powerupGreen_shield.png";
shield_images.yellow.src = "/assets/powerupYellow_shield.png";

asteroid_images.big.src = "/assets/big_asteroid.png";
asteroid_images.med.src = "/assets/med_asteroid.png";
asteroid_images.small.src = "/assets/small_asteroid.png";

enemy_images.red.src = "/assets/ufoRed.png";
enemy_images.blue.src = "/assets/ufoBlue.png";
enemy_images.green.src = "/assets/ufoGreen.png";
enemy_images.yellow.src = "/assets/ufoYellow.png";

const bullet_image = new Image();
bullet_image.src = "/assets/laserRed01.png";

const enemy_bullet_image = new Image();
enemy_bullet_image.src = "/assets/laserGreen08.png";

const protector_image = new Image();
protector_image.src = "/assets/shield3.png"

const background_image = new Image();
background_image.src = "/assets/background2.webp";

const draw = () => {

  if (background_image.complete) {
    context.drawImage(background_image, 0, 0, canvas_width, canvas_height);
  }

  players.forEach(player => {
    
    if (ship_images[player.ship] && ship_images[player.ship].complete) {
      context.save(); // Save the canvas state before transformations

      // Move the context to the player's position
      context.translate(player.x + player.width / 2, player.y + player.height / 2);
      context.rotate(player.angle); // Rotate around the center

      // Draw the ship at (0,0) in rotated space, offsetting to center it
      context.drawImage(
        ship_images[player.ship], 
        -player.width / 2, 
        -player.height / 2, 
        player.width, 
        player.height
      );

      context.restore(); // Restore the canvas state after drawing
    }

    if (player.shield >  0) {
      if (protector_image.complete) {
        context.drawImage(protector_image, player.x, player.y, 40, 40)
      }
    }

  });

  asteroids.forEach(asteroid => {
    if (asteroid_images[asteroid.type] && asteroid_images[asteroid.type].complete) {
      context.drawImage(asteroid_images[asteroid.type], asteroid.x, asteroid.y, asteroid.size, asteroid.size);
    };
  })

  stars.forEach(star => {
    if (star_image.complete) {
      context.drawImage(star_image, star.x, star.y, star.size, star.size);
    };
  });

  bullets.forEach(bullet => {
    if (bullet_image.complete) {
      context.save(); // Save the canvas state before transformations

      // Move the context to the bullet's position
      context.translate(bullet.x, bullet.y);
    
      // Rotate the canvas by the bullet's angle
      context.rotate(bullet.angle);
    
      // Draw the laser image (adjust its size as needed)
      context.drawImage(bullet_image, -bullet_image.width / 2, -bullet_image.height / 2, bullet_image.width + 15, bullet_image.height - 20);
    
      context.restore(); // Restore the canvas state after drawing
    };
  });

  enemy_bullets.forEach(enemy_bullet => {
    if (enemy_bullet_image.complete) {
      context.save();
      context.translate(enemy_bullet.x, enemy_bullet.y);
      context.rotate(enemy_bullet.angle);
      context.drawImage(enemy_bullet_image, -enemy_bullet_image.width / 2, -enemy_bullet_image.height / 2, enemy_bullet_image.width + 15, enemy_bullet_image.height - 20);
      context.restore();
    };
  });

  shields.forEach(shield => {
    if (shield_images[shield.color].complete) {
      context.drawImage(shield_images[shield.color], shield.x, shield.y, 20, 20);
    };
  });

  enemies.forEach(enemy => {
    if (enemy_images[enemy.color].complete) {
      context.drawImage(enemy_images[enemy.color], enemy.x, enemy.y, enemy.size, enemy.size);
      if (enemy.health < 100) {
        context.strokeStyle = "white";
        context.lineWidth = 1;
        context.strokeRect(enemy.x + 50, enemy.y - 20, 50, 10);
        context.fillStyle = "red";
        context.fillRect(enemy.x + 50, enemy.y - 20, 50 * (enemy.health / 100), 10)
      }
    };
  });

  if (player.health <= 0) {
    game_over = true;
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas_width, canvas_height);
    context.fillStyle = "rgba(85, 255, 85, 0.933)";
    context.font = "40px Courier New, Courier, monospace";
    context.textAlign = "center";
    context.fillText("Game Over", canvas.width / 2, canvas.height / 2);
    context.font = "20px Courier New, Courier, monospace";
    context.fillStyle = "white";
    context.fillText("Press any key to restart", canvas.width / 2, canvas.height / 2 + 50);
    document.addEventListener("keydown", restart_game, { once: true });
  } else {
      requestAnimationFrame(draw);
  };
};

const restart_game = () => {
  game_over = false;
  player.health = 100;
  player.score = 0;
  player.x = canvas_width / 2;
  player.y = canvas_height - 50;
  player.angle = 0;
  player.shield = 0;
  bullets.length = 0;
  asteroids.length = 0;
  stars.length = 0;
  enemy_bullets.length = 0;
  enemies.length = 0;
  socket.emit("restart_game", player);

  game_loop();
  draw();
};