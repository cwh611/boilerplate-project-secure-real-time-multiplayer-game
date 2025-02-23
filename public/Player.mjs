class Player {
  constructor({id, ship}) {
    this.x = 400;
    this.y = 550;
    this.score = 0;
    this.id = id;
    this.speed = 0;
    this.height = 40;
    this.width = 40;
    this.ship = ship;
    this.health = 100;
    this.angle = 0;
    this.shield = 0;
  }

  movePlayer(dir, speed) {
    if (dir === "up") {
      this.x += Math.sin(this.angle) * speed;  
      this.y -= Math.cos(this.angle) * speed;  
    }
    if (dir === "down") {
      this.x -= Math.sin(this.angle) * speed;  
      this.y += Math.cos(this.angle) * speed;  
    }

  }

  collision(item) {
    if (!item) return;
    if (
      this.x < item.x + item.size &&
      this.x + this.width > item.x &&
      this.y < item.y + item.size &&
      this.y + this.height > item.y
    ) {
      console.log("Collision detected");
      return true;
    }
  }

  calculateRank(arr) {
    const total = arr.length;
    const rank = arr.findIndex(player => player.id === this.id) + 1;
    return `${rank}/${total}`
  }
}

export default Player;