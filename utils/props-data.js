const ITEMS = {
  reverseDice: { id: 'reverseDice', name: '反转骰子', icon: '🔄', desc: '朝反方向移动', price: 800 },
  doubleDice: { id: 'doubleDice', name: '双倍骰子', icon: '🎲', desc: '步数翻倍', price: 1000 },
  rentShield: { id: 'rentShield', name: '租金盾牌', icon: '🛡️', desc: '免缴一次租金', price: 1200 },
  teleport: { id: 'teleport', name: '传送卡', icon: '🚀', desc: '传送到任意位置', price: 1500 },
  luckyCharm: { id: 'luckyCharm', name: '幸运符', icon: '🍀', desc: '下次机会卡奖励翻倍', price: 600 },
};

const ITEM_LIST = Object.values(ITEMS);

/**
 * 创建初始道具背包
 */
function createItemBag() {
  return [];
}

/**
 * 添加道具
 */
function addItem(player, itemId, count = 1) {
  const items = player.items || [];
  for (let i = 0; i < count; i++) {
    items.push(itemId);
  }
  return { ...player, items };
}

/**
 * 移除道具
 */
function removeItem(player, itemId) {
  const items = (player.items || []).slice();
  const idx = items.indexOf(itemId);
  if (idx >= 0) {
    items.splice(idx, 1);
    return { ...player, items };
  }
  return player;
}

/**
 * 购买道具
 */
function buyItem(player, itemId) {
  const item = ITEMS[itemId];
  if (!item) return { success: false, reason: '道具不存在' };
  if (player.money < item.price) return { success: false, reason: '资金不足' };
  const newPlayer = addItem(player, itemId);
  newPlayer.money = (newPlayer.money || player.money) - item.price;
  return { success: true, player: newPlayer };
}

/**
 * 统计道具数量
 */
function countItems(player) {
  const items = player.items || [];
  const counts = {};
  items.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return counts;
}

module.exports = {
  ITEMS,
  ITEM_LIST,
  createItemBag,
  addItem,
  removeItem,
  buyItem,
  countItems,
};
