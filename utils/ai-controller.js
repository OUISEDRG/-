const { BOARD_CELLS, getRentForLevel } = require('./game-data');

const DIFFICULTY = {
  EASY: { buyThreshold: 0.3, buildThreshold: 0.2, name: '简单' },
  NORMAL: { buyThreshold: 0.45, buildThreshold: 0.35, name: '普通' },
  HARD: { buyThreshold: 0.6, buildThreshold: 0.5, name: '困难' },
};

function getDifficultyConfig(level) {
  return DIFFICULTY[level] || DIFFICULTY.NORMAL;
}

/**
 * AI决定是否购买当前地产
 */
function decideBuy(aiPlayer, cell, gameState) {
  const diff = getDifficultyConfig(aiPlayer.aiDifficulty || 'NORMAL');
  if (!cell || cell.type !== 'property') return false;
  if (aiPlayer.isBankrupt) return false;

  const price = getActualPrice(aiPlayer, cell);
  if (aiPlayer.money < price) return false;

  // 资金安全线
  const safeMoney = aiPlayer.money * diff.buyThreshold;
  if (aiPlayer.money - price < safeMoney) return false;

  // EASY: 随机决定
  if (aiPlayer.aiDifficulty === 'EASY') {
    return Math.random() < 0.6;
  }

  // 同组地产收集倾向
  let groupScore = 0;
  const sameGroupCount = (aiPlayer.properties || []).filter(id => {
    const c = BOARD_CELLS[id];
    return c && c.group === cell.group;
  }).length;
  groupScore += sameGroupCount * 25;

  // 总组内地产数
  const totalInGroup = BOARD_CELLS.filter(c => c.group === cell.group && c.type === 'property').length;
  if (sameGroupCount + 1 >= totalInGroup) groupScore += 30; // 即将垄断

  // 投资回报率
  const roi = cell.baseRent / price;
  const roiScore = roi * 80;

  // 价格合理性
  const priceScore = Math.min(20, 2000 / Math.max(price, 1) * 10);

  // HARD: 更激进
  const totalScore = groupScore + roiScore + priceScore;
  const threshold = aiPlayer.aiDifficulty === 'HARD' ? 40 : 55;

  return totalScore > threshold;
}

/**
 * AI决定是否升级地产
 */
function decideBuild(aiPlayer, cell, gameState) {
  const diff = getDifficultyConfig(aiPlayer.aiDifficulty || 'NORMAL');
  if (!cell || cell.type !== 'property') return false;
  if (aiPlayer.isBankrupt) return false;

  const level = (gameState.propertyLevels && gameState.propertyLevels[cell.id]) || 1;
  if (level >= 4) return false;

  const ownerId = (gameState.propertyOwners && gameState.propertyOwners[cell.id]);
  if (ownerId !== aiPlayer.id) return false;

  const cost = cell.buildCost || 500;
  if (aiPlayer.money < cost) return false;

  // 资金安全线
  const safeMoney = aiPlayer.money * diff.buildThreshold;
  if (aiPlayer.money - cost < safeMoney) return false;

  // EASY: 只偶尔升级
  if (aiPlayer.aiDifficulty === 'EASY') {
    return level === 1 && Math.random() < 0.3;
  }

  // 是否拥有整组
  const totalInGroup = BOARD_CELLS.filter(c => c.group === cell.group && c.type === 'property').length;
  const ownedInGroup = (aiPlayer.properties || []).filter(id => {
    const c = BOARD_CELLS[id];
    return c && c.group === cell.group;
  }).length;
  const hasMonopoly = ownedInGroup >= totalInGroup;

  // 优先升级已垄断的地产
  if (hasMonopoly) return true;

  // 收益评估
  const rentIncrease = getRentForLevel(cell, level + 1) - getRentForLevel(cell, level);
  const paybackRounds = cost / Math.max(rentIncrease, 1);

  // HARD: 更短回本周期
  const maxRounds = aiPlayer.aiDifficulty === 'HARD' ? 8 : 12;
  return paybackRounds <= maxRounds;
}

/**
 * AI决定是否贷款
 */
function decideLoan(aiPlayer, gameState) {
  const diff = getDifficultyConfig(aiPlayer.aiDifficulty || 'NORMAL');
  if (aiPlayer.isBankrupt) return false;
  if (aiPlayer.hasLoan) return false;

  // 资金紧张且有地产时考虑贷款
  if (aiPlayer.money < 1000 && (aiPlayer.properties || []).length > 0) {
    return aiPlayer.aiDifficulty !== 'EASY' || Math.random() < 0.5;
  }

  // 有整组地产且缺钱升级时贷款
  const props = aiPlayer.properties || [];
  for (const cid of props) {
    const cell = BOARD_CELLS[cid];
    if (!cell || cell.type !== 'property') continue;
    const level = (gameState.propertyLevels && gameState.propertyLevels[cid]) || 1;
    if (level < 4 && aiPlayer.money < (cell.buildCost || 500)) {
      const totalInGroup = BOARD_CELLS.filter(c => c.group === cell.group && c.type === 'property').length;
      const ownedInGroup = props.filter(id => {
        const c2 = BOARD_CELLS[id];
        return c2 && c2.group === cell.group;
      }).length;
      if (ownedInGroup >= totalInGroup) return true;
    }
  }

  return false;
}

/**
 * AI决定是否还款
 */
function decideRepay(aiPlayer, gameState) {
  if (!aiPlayer.hasLoan) return false;
  const totalDue = (aiPlayer.loanAmount || 0) + (aiPlayer.loanInterest || 0);
  if (aiPlayer.money < totalDue) return false;
  // 保留30%现金
  return aiPlayer.money - totalDue > aiPlayer.money * 0.3;
}

/**
 * AI决定是否使用道具
 */
function decideUseItem(aiPlayer, gameState) {
  const items = aiPlayer.items || [];
  if (items.length === 0) return null;
  // AI暂时不使用道具 - 留给人机交互
  return null;
}

function getActualPrice(player, cell) {
  let price = cell.price;
  if (player.skillType === 'buyDiscount') {
    price = Math.floor(price * (player.skillValue || 0.9));
  }
  return price;
}

/**
 * AI主回合执行
 * 返回: { action: 'buy'|'build'|'loan'|'repay'|'end', data: any }
 */
function executeAITurn(aiPlayer, gameState) {
  const currentCell = BOARD_CELLS[aiPlayer.position];
  const states = [];

  // 1. 检查是否需要还款
  if (decideRepay(aiPlayer, gameState)) {
    return { action: 'repay' };
  }

  // 2. 检查是否需要贷款
  if (decideLoan(aiPlayer, gameState)) {
    return { action: 'loan' };
  }

  // 3. 检查是否购买当前地产
  if (currentCell && currentCell.type === 'property') {
    const ownerId = (gameState.propertyOwners && gameState.propertyOwners[currentCell.id]);
    if (ownerId === undefined && decideBuy(aiPlayer, currentCell, gameState)) {
      return { action: 'buy', cellId: currentCell.id };
    }
  }

  // 4. 检查是否升级地产
  const props = aiPlayer.properties || [];
  // 优先升级同组地产
  const sortedProps = props.slice().sort((a, b) => {
    const ca = BOARD_CELLS[a];
    const cb = BOARD_CELLS[b];
    if (!ca || !cb) return 0;
    const levelA = (gameState.propertyLevels && gameState.propertyLevels[a]) || 1;
    const levelB = (gameState.propertyLevels && gameState.propertyLevels[b]) || 1;
    // 优先升级低等级的地产
    return levelA - levelB;
  });

  for (const cid of sortedProps) {
    const cell = BOARD_CELLS[cid];
    if (!cell) continue;
    if (decideBuild(aiPlayer, cell, gameState)) {
      return { action: 'build', cellId: cid };
    }
  }

  return { action: 'end' };
}

module.exports = {
  DIFFICULTY,
  getDifficultyConfig,
  decideBuy,
  decideBuild,
  decideLoan,
  decideRepay,
  decideUseItem,
  executeAITurn,
};
