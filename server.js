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

const players = [];

let collectible = { 
  x: 100 + Math.floor(Math.random() * 600), 
  y: 50, 
  value: 10, 
  id: 1
};

io.on("connection", (socket) => {
  
  console.log(`Player ${socket.id} connected`);

  socket.on("new_player", (client_player) => {

    players.push(client_player);
    io.emit("current_players", players);
  
  });

  socket.on("player_moved", (client_player) => {

    const player_index = players.findIndex(player => player.id === client_player.id);
    players[player_index] = client_player;
    io.emit("current_players", players);

  });

  socket.emit("current_collectible", collectible);

});

module.exports = app;
