class Player {
  
  constructor({x, y, score, id}) {
    
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
    this.speed = 0;
    this.height = 10;
    this.width = 10;
  }

  movePlayer(dir, speed) {
    this.dir = dir;
    this.speed = speed; 
    if (this.dir === "left") {
      this.x -= this.speed;
    } else if (this.dir === "right") {
      this.x += this.speed;
    } else if (this.dir === "up") {
      this.y -= this.speed;
    } else if (this.dir === "down") {
      this.y += this.speed;
    };
  };

  collision(item) {
    
  }

  calculateRank(arr) {

  }
}

export default Player;
