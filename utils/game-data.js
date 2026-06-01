const ROLES = [
  { id: 1, name: '孙小美', avatar: '👧', color: '#FF6B9D', bgColor: '#FFF0F5' },
  { id: 2, name: '钱夫人', avatar: '👩', color: '#C084FC', bgColor: '#F3E8FF' },
  { id: 3, name: '阿土伯', avatar: '👨', color: '#FB923C', bgColor: '#FFF7ED' },
  { id: 4, name: '金贝贝', avatar: '👶', color: '#FCD34D', bgColor: '#FFFBEB' },
  { id: 5, name: '莎拉公主', avatar: '👸', color: '#F472B6', bgColor: '#FDF2F8' },
  { id: 6, name: '忍太郎', avatar: '🥷', color: '#6B7280', bgColor: '#F3F4F6' },
];

const DEFAULT_INITIAL_MONEY = 15000;

const BOARD_CELLS = [
  { id: 0, type: 'start', name: '起点', icon: '🚀', color: '#FF6B6B' },
  { id: 1, type: 'property', name: '台北路', price: 1000, rent: 100, baseRent: 100, rentLevel2: 300, rentLevel3: 600, rentLevel4: 1000, buildCost: 500, group: 1, color: '#4ECDC4' },
  { id: 2, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 3, type: 'property', name: '上海路', price: 1500, rent: 150, baseRent: 150, rentLevel2: 450, rentLevel3: 900, rentLevel4: 1500, buildCost: 500, group: 1, color: '#95E1D3' },
  { id: 4, type: 'tax', name: '缴税', icon: '💰', color: '#F38181', amount: 500 },
  { id: 5, type: 'property', name: '广州路', price: 2000, rent: 200, baseRent: 200, rentLevel2: 600, rentLevel3: 1200, rentLevel4: 2000, buildCost: 500, group: 2, color: '#AA96DA' },
  { id: 6, type: 'fortune', name: '命运', icon: '⭐', color: '#A8D8EA' },
  { id: 7, type: 'corner', name: '免费停车', icon: '🅿️', color: '#B5EAD7' },
  { id: 8, type: 'property', name: '成都路', price: 1200, rent: 120, baseRent: 120, rentLevel2: 360, rentLevel3: 720, rentLevel4: 1200, buildCost: 500, group: 3, color: '#FFD3B6' },
  { id: 9, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 10, type: 'property', name: '武汉路', price: 1800, rent: 180, baseRent: 180, rentLevel2: 540, rentLevel3: 1080, rentLevel4: 1800, buildCost: 500, group: 3, color: '#D5AAFF' },
  { id: 11, type: 'fortune', name: '命运', icon: '⭐', color: '#A8D8EA' },
  { id: 12, type: 'property', name: '南京路', price: 2200, rent: 220, baseRent: 220, rentLevel2: 660, rentLevel3: 1320, rentLevel4: 2200, buildCost: 800, group: 4, color: '#FFB7B2' },
  { id: 13, type: 'tax', name: '地产税', icon: '💰', color: '#F38181', amount: 800 },
  { id: 14, type: 'corner', name: '监狱', icon: '🔒', color: '#E2E2E2' },
  { id: 15, type: 'property', name: '西安路', price: 1600, rent: 160, baseRent: 160, rentLevel2: 480, rentLevel3: 960, rentLevel4: 1600, buildCost: 500, group: 2, color: '#B5EAD7' },
  { id: 16, type: 'fortune', name: '命运', icon: '⭐', color: '#A8D8EA' },
  { id: 17, type: 'property', name: '杭州路', price: 2400, rent: 240, baseRent: 240, rentLevel2: 720, rentLevel3: 1440, rentLevel4: 2400, buildCost: 800, group: 5, color: '#FFDAC1' },
  { id: 18, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 19, type: 'property', name: '大连路', price: 1400, rent: 140, baseRent: 140, rentLevel2: 420, rentLevel3: 840, rentLevel4: 1400, buildCost: 500, group: 4, color: '#E2F0CB' },
  { id: 20, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 21, type: 'corner', name: '火车站', icon: '🚂', color: '#D4A5A5' },
  { id: 22, type: 'property', name: '哈尔滨路', price: 2600, rent: 260, baseRent: 260, rentLevel2: 780, rentLevel3: 1560, rentLevel4: 2600, buildCost: 800, group: 5, color: '#C7CEEA' },
  { id: 23, type: 'fortune', name: '命运', icon: '⭐', color: '#A8D8EA' },
  { id: 24, type: 'property', name: '香港路', price: 3000, rent: 300, baseRent: 300, rentLevel2: 900, rentLevel3: 1800, rentLevel4: 3000, buildCost: 1000, group: 6, color: '#FFB3BA' },
  { id: 25, type: 'chance', name: '机会', icon: '❓', color: '#FFE66D' },
  { id: 26, type: 'property', name: '深圳路', price: 2800, rent: 280, baseRent: 280, rentLevel2: 840, rentLevel3: 1680, rentLevel4: 2800, buildCost: 800, group: 6, color: '#BAFFC9' },
  { id: 27, type: 'tax', name: '所得税', icon: '💰', color: '#F38181', amount: 600 },
];

const CHANCE_CARDS = [
  { id: 1, text: '银行发放红利，获得 2000 元', action: 'addMoney', value: 2000 },
  { id: 2, text: '中了彩票，获得 3000 元', action: 'addMoney', value: 3000 },
  { id: 3, text: '生日收到礼金，获得 1000 元', action: 'addMoney', value: 1000 },
  { id: 4, text: '股票分红，获得 2500 元', action: 'addMoney', value: 2500 },
  { id: 5, text: '钱包丢失，损失 1500 元', action: 'subtractMoney', value: 1500 },
  { id: 6, text: '车辆维修费，支付 2000 元', action: 'subtractMoney', value: 2000 },
  { id: 7, text: '手机被偷，损失 1000 元', action: 'subtractMoney', value: 1000 },
  { id: 8, text: '物业费支出，支付 1800 元', action: 'subtractMoney', value: 1800 },
  { id: 9, text: '前进 3 步', action: 'moveForward', value: 3 },
  { id: 10, text: '后退 2 步', action: 'moveBackward', value: 2 },
  { id: 11, text: '前往起点，获得 2000 元', action: 'gotoStart', value: 0 },
  { id: 12, text: '获得银行利息 500 元', action: 'addMoney', value: 500 },
  { id: 13, text: '房屋修缮费，支付 1200 元', action: 'subtractMoney', value: 1200 },
  { id: 14, text: '投资回报，获得 4000 元', action: 'addMoney', value: 4000 },
  { id: 15, text: '医疗费用，支付 2500 元', action: 'subtractMoney', value: 2500 },
  { id: 16, text: '获得年终奖金 3500 元', action: 'addMoney', value: 3500 },
  { id: 17, text: '旅行优惠，获得 1500 元', action: 'addMoney', value: 1500 },
  { id: 18, text: '宠物生病，支付 800 元', action: 'subtractMoney', value: 800 },
];

const FORTUNE_CARDS = [
  { id: 1, text: '继承遗产，获得 5000 元', action: 'addMoney', value: 5000 },
  { id: 2, text: '生意亏损，支付 3000 元', action: 'subtractMoney', value: 3000 },
  { id: 3, text: '中大奖，获得 8000 元', action: 'addMoney', value: 8000 },
  { id: 4, text: '房屋被查封，支付 4000 元', action: 'subtractMoney', value: 4000 },
  { id: 5, text: '获得赔偿金 3500 元', action: 'addMoney', value: 3500 },
  { id: 6, text: '跌入陷阱，损失 2000 元', action: 'subtractMoney', value: 2000 },
  { id: 7, text: '前方施工，后退 3 步', action: 'moveBackward', value: 3 },
  { id: 8, text: '贵人相助，前进 2 步', action: 'moveForward', value: 2 },
  { id: 9, text: '所有地产租金翻倍，持续一轮', action: 'doubleRent', value: 0 },
  { id: 10, text: '省吃俭用，获得 1000 元', action: 'addMoney', value: 1000 },
  { id: 11, text: '遭遇抢劫，损失 2500 元', action: 'subtractMoney', value: 2500 },
  { id: 12, text: '公司上市，获得 10000 元', action: 'addMoney', value: 10000 },
  { id: 13, text: '税务审查，支付 3500 元', action: 'subtractMoney', value: 3500 },
  { id: 14, text: '获得项目奖金 6000 元', action: 'addMoney', value: 6000 },
  { id: 15, text: '中新股，获得 4500 元', action: 'addMoney', value: 4500 },
  { id: 16, text: '暴雨灾害，损失 3000 元', action: 'subtractMoney', value: 3000 },
];

const BOARD_SIZE = 8;

function getCellPosition(cellIndex) {
  const size = BOARD_SIZE;
  if (cellIndex < size) {
    return { row: size - 1, col: cellIndex };
  }
  if (cellIndex < 2 * size - 1) {
    return { row: size - 1 - (cellIndex - size + 1), col: size - 1 };
  }
  if (cellIndex < 3 * size - 2) {
    return { row: 0, col: size - 1 - (cellIndex - 2 * size + 2) };
  }
  const offset = cellIndex - 3 * size + 3;
  return { row: offset, col: 0 };
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createInitialDeck(type) {
  const cards = type === 'chance' ? CHANCE_CARDS : FORTUNE_CARDS;
  return shuffleArray(cards.map(c => ({ ...c })));
}

function createPlayers(config) {
  return config.players.map((p, index) => ({
    id: index,
    name: p.name,
    role: p.role,
    money: config.initialMoney,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    isBankrupt: false,
    hasLoan: false,
    loanAmount: 0,
    loanInterest: 0,
    order: index,
    skipNextTurn: false,
    doubleRentTurns: 0,
    propertiesCount: 0,
    totalAsset: config.initialMoney,
    netWorth: config.initialMoney,
  }));
}

function getRentForLevel(property, level) {
  switch (level) {
    case 1: return property.baseRent;
    case 2: return property.rentLevel2;
    case 3: return property.rentLevel3;
    case 4: return property.rentLevel4;
    default: return property.baseRent;
  }
}

function calculatePlayerNetWorth(player, boardCells) {
  let total = player.money;
  if (player.properties && player.properties.length > 0) {
    player.properties.forEach(propId => {
      const cell = boardCells.find(c => c.id === propId);
      if (cell) {
        total += cell.price;
      }
    });
  }
  total -= (player.loanAmount || 0);
  return total;
}

module.exports = {
  ROLES,
  DEFAULT_INITIAL_MONEY,
  BOARD_CELLS,
  CHANCE_CARDS,
  FORTUNE_CARDS,
  BOARD_SIZE,
  getCellPosition,
  shuffleArray,
  createInitialDeck,
  createPlayers,
  getRentForLevel,
  calculatePlayerNetWorth,
};
