// server set-up

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket_io = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

app.use(helmet());
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({origin: '*'})); 

app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

fccTestingRoutes(app);
    
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

const io = socket_io(server);

const canvas_height = 600;
const canvas_width = 950;

// game logic

const players = [];
const asteroids = [];
const asteroid_options = ["big", "med", "small"];
const shield_options = ["red", "blue", "green", "yellow"];
const enemy_color_options = ["red", "blue", "green", "yellow"];
const stars = [];
let bullets = [];
const shields = [];
let enemies = [];
const enemy_bullets = [];

const spawn_enemy = () => {
  
  const enemy_color = enemy_color_options[Math.floor(Math.random() * enemy_color_options.length)];

  const enemy = {
    
    id: Date.now(),
    x: 100,
    y: 0,
    speed: 0,
    color: enemy_color,
    in_position: false,
    size: 40,
    health: 100

  };

  enemies.push(enemy);
  console.log(enemy);

};

const update_enemies = () => {

    enemies.forEach(enemy => {
      if (enemies.findIndex(enem => enem.id === enemy.id) === 0) {
        if (enemy.y < canvas_height / 2 + 80) {
          enemy.y += 2;
        } else {
          enemy.in_position = true;
        }
      } else if (enemies.findIndex(enem => enem.id === enemy.id) === 1) {
        if (enemy.y < canvas_height / 2) {
          enemy.y += 2;
        } else {
          enemy.in_position = true;
        }
      } else if (enemies.findIndex(enem => enem.id === enemy.id) === 2) {
        if (enemy.y < canvas_height / 2 - 80) {
          enemy.y += 2;
        } else {
          enemy.in_position = true;
        }
      };
    });
    
    io.emit("update_enemies", enemies);

};

class Enemy_Bullet {
  
  constructor(enemy, player) {
    this.x = enemy.x;
    this.y = enemy.y;
    this.speed = 5;
    this.size = 20;
    // Compute direction toward player
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    this.angle = Math.atan2(dy, dx); // Get angle from enemy to player
    
    // Adjust movement direction
    this.direction = this.angle;
  }

};

const enemies_open_fire = () => {
  if (enemies.length === 0) {
    return
  } else {
    enemies.forEach(enemy => {
      if (enemy.in_position) {
        players.forEach(player => {
          const new_enemy_bullet = new Enemy_Bullet(enemy, player);
          enemy_bullets.push(new_enemy_bullet);
          io.emit("new_enemy_bullet", enemy_bullets);
        });
      };
    });
  }
};

const spawn_asteroid = () => {

  const asteroid_type = asteroid_options[Math.floor(Math.random() * asteroid_options.length)];
  
  const asteroid = {
    id: Date.now(), 
    x: Math.random() * canvas_width, 
    y: 0, 
    speed: 2 + Math.random() * 3, // random btwn 2 and 5
    type: asteroid_type,
    size: asteroid_type === "big" ? 60 : asteroid_type === "med" ? 40 : 20
  };

  asteroids.push(asteroid);
  
};

const update_asteroids = () => {
  
  asteroids.forEach((asteroid, index) => {
    
    asteroid.y += asteroid.speed;

    if (asteroid.y > canvas_height) {
      asteroids.splice(index, 1);
    }

  });

  io.emit("update_asteroids", asteroids); 
  
};

const spawn_star = () => {
  
  const star = {
    id: Date.now(),
    x: Math.random() * canvas_width,
    y: 0,
    speed: 1 + Math.random() * 2,
    size: 20
  };
  
  stars.push(star);

};

const update_stars = () => {
  
  stars.forEach((star, index) => {
    
    star.y += star.speed;
    
    if (star.y > canvas_height) {
      stars.splice(index, 1);
    };

  });

  io.emit("update_stars", stars);

};

const spawn_shield = () => {
  
  const shield_color = shield_options[Math.floor(Math.random() * shield_options.length)]

  const shield = {
    id: Date.now(),
    x: Math.random() * canvas_width,
    y: 0,
    speed: 1 + Math.random() * 2,
    size: 20,
    color: shield_color
  };
  
  shields.push(shield);

};

const update_shields = () => {
  
  shields.forEach((shield, index) => {
    
    shield.y += shield.speed;
    
    if (shield.y > canvas_height) {
      shields.splice(index, 1);
    };

  });

  io.emit("update_shields", shields);

};

io.on("connection", (socket) => {
  
  console.log(`Player ${socket.id} connected`);

  socket.on("new_player", (client_player) => {
    if (!players.find(player => player.id === client_player.id)) {
      if (client_player && client_player.id) players.push(client_player);
      io.emit("current_players", players);
    }
  });

  socket.on("player_moved", (client_player) => {

    const player_index = players.findIndex(player => player.id === client_player.id);
    players[player_index] = client_player;
    io.emit("current_players", players);

  });

  socket.on("asteroid_collision", (data) => {
    const { client_asteroid, client_player } = data;
    asteroids.splice(asteroids.findIndex(asteroid => asteroid.id === client_asteroid.id), 1);
    const player_index = players.findIndex(player => player.id === client_player.id);
    players[player_index] = client_player;
    io.emit("current_players", players)
  });

  socket.on("star_collision", (data) => {
    const { client_star, client_player } = data;
    stars.splice(stars.findIndex(star => star.id === client_star.id), 1);
    const player_index = players.findIndex(player => player.id === client_player.id);
    players[player_index] = client_player;
    io.emit("current_players", players)
  });

  socket.on("shield_collision", (data) => {
    const { client_shield, client_player } = data;
    shields.splice(shields.findIndex(shield => shield.id === client_shield.id), 1);
    const player_index = players.findIndex(player => player.id === client_player.id);
    players[player_index] = client_player;
    io.emit("current_players", players);
  })

  socket.on("new_bullet", (bullet) => {
    bullets.push(bullet); 
    io.emit("new_bullet", bullet); 
  });
  
  socket.on("update_bullets", (data) => {
    const { client_bullets, client_enemies } = data;
    bullets = client_bullets; // sync bullets
  });

  socket.on("update_enemy_bullets", (data) => {
    const { client_enemy_bullets, client_players } = data;
    enemy_bullets.length = 0;
    enemy_bullets.push(...client_enemy_bullets);
    players.length = 0;
    players.push(...client_players);
  })

  socket.on("update_enemy_health", client_enemies => {
    enemies = client_enemies;
  })
  
  socket.on("asteroid_destroyed", (data) => {
    const { asteroid, bullet } = data;
  
    const asteroidIndex = asteroids.findIndex(a => a.id === asteroid.id);
    if (asteroidIndex !== -1) {
      asteroids.splice(asteroidIndex, 1);
    }
  
    const bulletIndex = bullets.findIndex(b => b.x === bullet.x && b.y === bullet.y);
    if (bulletIndex !== -1) {
      bullets.splice(bulletIndex, 1);
    }
  
    io.emit("update_asteroids", asteroids);
    io.emit("update_bullets", bullets);
  });

  socket.on("disconnect", () => {
    console.log(`Player ${socket.id} disconnected`);
    const index = players.findIndex(player => player.id === socket.id);
    if (index !== -1) players.splice(index, 1); 
    io.emit("current_players", players);
  });

  socket.on("restart_game", (client_player) => {
    console.log(`Player ${client_player.id} requested restart`);
    const player_index = players.findIndex(player => player.id === client_player.id);
    players[player_index] = client_player;
    io.emit("current_players", players);
    enemy_bullets.length = 0;
    asteroids.length = 0;
    shields.length = 0;
    bullets.length = 0;
    enemies.length = 0;
    setTimeout(() => {
      spawn_enemy();
      setTimeout(() => {
        spawn_enemy(); 
    
        setTimeout(() => {
          spawn_enemy(); 
        }, 2000);
    
      }, 2000);
    
    }, 5000);
    setInterval(enemies_open_fire, 2000);
    setInterval(update_enemies, 50);
  })

});

setInterval(spawn_asteroid, 1000);
setInterval(update_asteroids, 50);

setInterval(spawn_star, 2500);
setInterval(update_stars, 50);

setInterval(spawn_shield, 5000);
setInterval(update_shields, 50);

setTimeout(() => {
  spawn_enemy();
  setTimeout(() => {
    spawn_enemy(); 

    setTimeout(() => {
      spawn_enemy(); 
    }, 2000);

  }, 2000);

}, 5000);

const enemies_open_fire_interval = setInterval(enemies_open_fire, 2000);
const update_enemies_interval = setInterval(update_enemies, 50);

module.exports = app;