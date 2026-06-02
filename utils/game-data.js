const ROLES = [
  { id: 1, name: '孙小美', avatar: '👧', color: '#FF6B9D', bgColor: '#FFF0F5',
    skill: '购物达人', skillDesc: '购买地产打9折，省钱小能手', skillType: 'buyDiscount', skillValue: 0.9 },
  { id: 2, name: '钱夫人', avatar: '👩', color: '#C084FC', bgColor: '#F3E8FF',
    skill: '精打细算', skillDesc: '收取租金增加20%，钱生钱', skillType: 'rentBonus', skillValue: 0.2 },
  { id: 3, name: '阿土伯', avatar: '👨', color: '#FB923C', bgColor: '#FFF7ED',
    skill: '勤劳致富', skillDesc: '初始资金多2000元，起步更快', skillType: 'extraMoney', skillValue: 2000 },
  { id: 4, name: '金贝贝', avatar: '👚', color: '#FCD34D', bgColor: '#FFFBEB',
    skill: '幸运星', skillDesc: '经过起点额外获得500元', skillType: 'startBonus', skillValue: 500 },
  { id: 5, name: '莎拉公主', avatar: '👛', color: '#F472B6', bgColor: '#FDF2F8',
    skill: '皇家特权', skillDesc: '缴税金额减半，皇家礼遇', skillType: 'taxDiscount', skillValue: 0.5 },
  { id: 6, name: '忍太郎', avatar: '🐤', color: '#6B7280', bgColor: '#F3F4F6',
    skill: '忍者遁术', skillDesc: '免缴一次过路费（每局限1次）', skillType: 'freeRentOnce', skillValue: 1 },
];

const DEFAULT_INITIAL_MONEY = 15000;

const BOARD_CELLS = [
  { id: 0, type: 'start', name: '起点', icon: '🚌', color: '#FF6B6B' },
  { id: 1, type: 'property', name: '台北路', price: 1000, rent: 100, baseRent: 100, rentLevel2: 300, rentLevel3: 600, rentLevel4: 1000, buildCost: 500, group: 1, color: '#4ECDC4' },
  { id: 2, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 3, type: 'property', name: '上海路', price: 1500, rent: 150, baseRent: 150, rentLevel2: 450, rentLevel3: 900, rentLevel4: 1500, buildCost: 500, group: 1, color: '#95E1D3' },
  { id: 4, type: 'tax', name: '缴税', icon: '💰', color: '#F38181', amount: 500 },
  { id: 5, type: 'property', name: '广州路', price: 2000, rent: 200, baseRent: 200, rentLevel2: 600, rentLevel3: 1200, rentLevel4: 2000, buildCost: 500, group: 2, color: '#AA96DA' },
  { id: 6, type: 'fortune', name: '命运', icon: '🎲', color: '#A8D8EA' },
  { id: 7, type: 'corner', name: '免费停车', icon: '🚙️', color: '#B5EAD7' },
  { id: 8, type: 'property', name: '成都路', price: 1200, rent: 120, baseRent: 120, rentLevel2: 360, rentLevel3: 720, rentLevel4: 1200, buildCost: 500, group: 3, color: '#FFD3B6' },
  { id: 9, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 10, type: 'property', name: '武汉路', price: 1800, rent: 180, baseRent: 180, rentLevel2: 540, rentLevel3: 1080, rentLevel4: 1800, buildCost: 500, group: 3, color: '#D5AAFF' },
  { id: 11, type: 'fortune', name: '命运', icon: '🎲', color: '#A8D8EA' },
  { id: 12, type: 'property', name: '南京路', price: 2200, rent: 220, baseRent: 220, rentLevel2: 660, rentLevel3: 1320, rentLevel4: 2200, buildCost: 800, group: 4, color: '#FFB7B2' },
  { id: 13, type: 'tax', name: '地产税', icon: '💰', color: '#F38181', amount: 800 },
  { id: 14, type: 'corner', name: '监狱', icon: '🔀', color: '#E2E2E2' },
  { id: 15, type: 'property', name: '西安路', price: 1600, rent: 160, baseRent: 160, rentLevel2: 480, rentLevel3: 960, rentLevel4: 1600, buildCost: 500, group: 2, color: '#B5EAD7' },
  { id: 16, type: 'fortune', name: '命运', icon: '🎲', color: '#A8D8EA' },
  { id: 17, type: 'property', name: '杭州路', price: 2400, rent: 240, baseRent: 240, rentLevel2: 720, rentLevel3: 1440, rentLevel4: 2400, buildCost: 800, group: 5, color: '#FFDAC1' },
  { id: 18, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 19, type: 'property', name: '大连路', price: 1400, rent: 140, baseRent: 140, rentLevel2: 420, rentLevel3: 840, rentLevel4: 1400, buildCost: 500, group: 4, color: '#E2F0CB' },
  { id: 20, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 21, type: 'corner', name: '火车站', icon: '🚏', color: '#D4A5A5' },
  { id: 22, type: 'property', name: '哈尔滨路', price: 2600, rent: 260, baseRent: 260, rentLevel2: 780, rentLevel3: 1560, rentLevel4: 2600, buildCost: 800, group: 5, color: '#C7CEEA' },
  { id: 23, type: 'fortune', name: '命运', icon: '🎲', color: '#A8D8EA' },
  { id: 24, type: 'property', name: '香港路', price: 3000, rent: 300, baseRent: 300, rentLevel2: 900, rentLevel3: 1800, rentLevel4: 3000, buildCost: 1000, group: 6, color: '#FFB3BA' },
  { id: 25, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 26, type: 'property', name: '深圳路', price: 2800, rent: 280, baseRent: 280, rentLevel2: 840, rentLevel3: 1680, rentLevel4: 2800, buildCost: 800, group: 6, color: '#BAFFC9' },
  { id: 27, type: 'tax', name: '所得税', icon: '💰', color: '#F38181', amount: 600 },
];

const BOARD_SIZE = 7;

const CHANCE_CARDS = [
  { id: 1, text: '银行发放红利，获得 2000 元', action: 'addMoney', value: 2000 },
  { id: 2, text: '中了彩票，获得 3000 元', action: 'addMoney', value: 3000 },
  { id: 3, text: '生日收到礼金，获得 1000 元', action: 'addMoney', value: 1000 },
  { id: 4, text: '股票分红，获得 2500 元', action: 'addMoney', value: 2500 },
  { id: 5, text: '钱包丢失，损失 1500 元', action: 'subtractMoney', value: 1500 },
  { id: 6, text: '车辆维修费，支付 2000 元', action: 'subtractMoney', value: 2000 },
  { id: 7, text: '手机被偷，损失 1000 元', action: 'subtractMoney', value: 1000 },
  { id: 8, text: '医疗费用，支付 800 元', action: 'subtractMoney', value: 800 },
  { id: 9, text: '天降横财！随机获得一名对手的一块地', action: 'stealProperty', value: 0 },
  { id: 10, text: '股票大跌！所有人损失 1000 元', action: 'allLoseMoney', value: 1000 },
  { id: 11, text: '向前移动 3 步', action: 'moveForward', value: 3 },
  { id: 12, text: '后退 2 步', action: 'moveBackward', value: 2 },
  { id: 13, text: '直接飞到起点，获得 2000 元', action: 'gotoStart', value: 0 },
  { id: 14, text: '租金翻倍卡！下两次收租翻倍', action: 'doubleRent', value: 0 },
];

const FORTUNE_CARDS = [
  { id: 1, text: '股市大涨，获得 2500 元', action: 'addMoney', value: 2500 },
  { id: 2, text: '找到宝藏，获得 4000 元', action: 'addMoney', value: 4000 },
  { id: 3, text: '收到红包，获得 1500 元', action: 'addMoney', value: 1500 },
  { id: 4, text: '继承遗产，获得 5000 元', action: 'addMoney', value: 5000 },
  { id: 5, text: '被罚款，损失 2000 元', action: 'subtractMoney', value: 2000 },
  { id: 6, text: '房子漏水维修，支付 3000 元', action: 'subtractMoney', value: 3000 },
  { id: 7, text: '被小偷偷走 2000 元', action: 'subtractMoney', value: 2000 },
  { id: 8, text: '意外支出，损失 1500 元', action: 'subtractMoney', value: 1500 },
  { id: 9, text: '天降陨石！随机摧毁一名对手的一块地', action: 'destroyProperty', value: 0 },
  { id: 10, text: '经济危机！所有人向银行缴 800 元', action: 'allPayBank', value: 800 },
  { id: 11, text: '向前移动 4 步', action: 'moveForward', value: 4 },
  { id: 12, text: '后退 3 步', action: 'moveBackward', value: 3 },
  { id: 13, text: '直接飞到起点，获得 2000 元', action: 'gotoStart', value: 0 },
  { id: 14, text: '租金翻倍卡！下两次收租翻倍', action: 'doubleRent', value: 0 },
];

function createInitialDeck(type) {
  const cards = type === 'chance' ? [...CHANCE_CARDS] : [...FORTUNE_CARDS];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function createPlayers(config) {
  const players = [];
  const aiPlayers = config.aiPlayers || [];
  for (let i = 0; i < config.playerCount; i++) {
    players.push({
      id: i,
      name: `玩家${i + 1}`,
      money: config.initialMoney || DEFAULT_INITIAL_MONEY,
      position: 0,
      properties: [],
      isBankrupt: false,
      inJail: false,
      jailTurns: 0,
      skipNextTurn: false,
      doubleRentTurns: 0,
      isAI: aiPlayers.includes(i),
      aiDifficulty: aiPlayers.includes(i) ? (config.aiDifficulty || 'normal') : null,
      items: [],
      hasLoan: false,
      loanAmount: 0,
      loanInterest: 0,
    });
  }
  return players;
}

function calculatePlayerNetWorth(player, propertyOwners, propertyLevels) {
  let netWorth = player.money || 0;
  const props = player.properties || [];
  props.forEach(cellId => {
    const cell = BOARD_CELLS[cellId];
    if (cell && cell.type === 'property') {
      netWorth += cell.price;
      const level = (propertyLevels && propertyLevels[cellId]) || 0;
      if (level > 0 && cell.buildCost) {
        netWorth += cell.buildCost * level;
      }
    }
  });
  return netWorth;
}

function getRentForLevel(cell, level) {
  switch (level) {
    case 2: return cell.rentLevel2 || cell.baseRent;
    case 3: return cell.rentLevel3 || cell.baseRent;
    case 4: return cell.rentLevel4 || cell.baseRent;
    default: return cell.baseRent || cell.rent;
  }
}

module.exports = {
  ROLES,
  DEFAULT_INITIAL_MONEY,
  BOARD_CELLS,
  BOARD_SIZE,
  CHANCE_CARDS,
  FORTUNE_CARDS,
  createInitialDeck,
  createPlayers,
  calculatePlayerNetWorth,
  getRentForLevel,
};
