require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket_io = require('socket.io');
const cors = require('cors');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

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

const players = {};
const asteroids = [];
const stars = [];
const ship_options = ["ship_1", "ship_2", "ship_3", "ship_4"];
const asteroid_options = ["big", "med", "small"];
const canvas_height = 600;
const canvas_width = 800;

io.on("connection", (socket) => {
  
  console.log("Player connected: ", socket.id);

  const assigned_ship = ship_options[Math.floor(Math.random() * ship_options.length)];
  
  players[socket.id] = {
    x: 400, 
    y: 550, // (start near the bottom)
    id: socket.id,
    health: 100,
    score: 0,
    ship: assigned_ship
  };

  console.log("Player ship:", players[socket.id].ship)

  io.emit("currentPlayers", players);

  socket.broadcast.emit("newPlayer", players[socket.id]);
  
  socket.on("move", (direction) => {

    const player = players[socket.id];

    if (direction === "left" && player.x - 5 >= 0) player.x -= 5;
    if (direction === "right" && player.x + 5 <= canvas_width) player.x += 5;
    if (direction === "up" && player.y - 5 >= 0) player.y -= 5;
    if (direction === "down" && player.y + 5 <= canvas_height) player.y += 5;
    
    console.log(`Player ${socket.id} is moving ${direction}`);

    io.emit("playerMoved", players[socket.id])
    
  });
  
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id]; 
    io.emit("removePlayer", socket.id); 
  });
  
});

const spawnAsteroid = () => {

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

// Move asteroids downward
const updateAsteroids = () => {
  asteroids.forEach((asteroid, index) => {
    asteroid.y += asteroid.speed;

    // Remove if out of bounds
    if (asteroid.y > canvas_height) {
      asteroids.splice(index, 1);
    }
    const playerSize = 40; 
    const asteroidSize = asteroid.size - 5; 
    for (const key in players) {
      const player = players[key];
      if (
        player.x < asteroid.x + asteroidSize &&
        player.x + playerSize > asteroid.x &&
        player.y < asteroid.y + asteroidSize &&
        player.y + playerSize > asteroid.y
      ) {
          console.log(`Collision detected between player ${key} and asteroid ${asteroid.id}`);
          asteroids.splice(index, 1);
          player.health -= 10;
          io.emit("currentPlayers", players)
          console.log(`Player ${player.id} health: ${player.health}`)
          break;
      }
    }
  });

  io.emit("updateAsteroids", asteroids); 
  
};

// Spawn new asteroids every second
setInterval(spawnAsteroid, 1000);

// Update asteroids every 50ms
setInterval(updateAsteroids, 50);

const spwanStar = () => {
  const star = {
    id: Date.now(),
    x: Math.random() * canvas_width,
    y: 0,
    speed: 1 + Math.random() * 2
  };
  stars.push(star)
};

const updateStars = () => {
  stars.forEach((star, index) => {
    star.y += star.speed;
    if (star.y > canvas_height) {
      stars.splice(index, 1);
    };
    const playerSize = 40; 
    const starSize = 15; 
    for (const key in players) {
      const player = players[key];
      if (
        player.x < star.x + starSize &&
        player.x + playerSize > star.x &&
        player.y < star.y + starSize &&
        player.y + playerSize > star.y
      ) {
          console.log(`Collision detected between player ${key} and star ${star.id}`);
          stars.splice(index, 1);
          player.score += 5;
          io.emit("currentPlayers", players)
          console.log(`Player ${player.id} score: ${player.score}`)
          break;
      }
    }
  });
  
  io.emit("updateStars", stars);
  
};

setInterval(spwanStar, 2500);
setInterval(updateStars, 50);

module.exports = app;
