export class Economy {
  constructor(startingMoney = 800) {
    this.startingMoney = startingMoney;
    this.money = startingMoney;
    this.totalEarned = 0;
    this.totalSpent = 0;
  }

  canAfford(amount) {
    return this.money >= amount;
  }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.money -= amount;
    this.totalSpent += amount;
    return true;
  }

  earn(amount) {
    this.money += amount;
    this.totalEarned += amount;
  }

  refund(amount) {
    this.money += amount;
  }
}
