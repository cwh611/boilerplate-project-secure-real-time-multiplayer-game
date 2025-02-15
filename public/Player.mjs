class Player {
  constructor({x, y, score, id}) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
    this.speed = 0;
    this.height = 40;
    this.width = 40;
  }

  movePlayer(dir, speed) {
    if (dir === "left") {
      this.x -= speed;
    }
    if (dir === "right") {
      this.x += speed;
    }
    if (dir === "up") {
      this.y -= speed;
    }
    if (dir === "down") {
      this.y += speed;
    }

  }

  collision(item) {
    if (!item) return;
    if (
      this.x < item.x + item.width &&
      this.x + this.width > item.x &&
      this.y < item.y + item.height &&
      this.y + this.height > item.y
    ) {
      console.log("Collision detected");
      this.score += item.value;
    }
  }

  calculateRank(arr) {
    const total = arr.length;
    const rank = arr.findIndex(id => id === this.id);
    return `Rank: ${rank}/${total}`
  }
}

export default Player;