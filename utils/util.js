function formatMoney(amount) {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1) + '万';
  }
  return amount.toLocaleString();
}

function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration,
    mask: false
  });
}

function showModal(title, content, showCancel = true, confirmText = '确定', cancelText = '取消') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      showCancel,
      confirmText,
      cancelText,
      success(res) {
        resolve(res.confirm);
      }
    });
  });
}

function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

function hideLoading() {
  wx.hideLoading();
}

function vibrateShort() {
  wx.vibrateShort({ type: 'medium' });
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function isPropertyCell(cellType) {
  return cellType === 'property';
}

function isSpecialCell(cellType) {
  return ['chance', 'fortune', 'tax', 'start', 'corner'].includes(cellType);
}

function getRelativePlayers(players, currentPlayerId) {
  const current = players.find(p => p.id === currentPlayerId);
  const others = players.filter(p => p.id !== currentPlayerId && !p.isBankrupt);
  return { current, others };
}

function checkBankruptcy(player) {
  if (player.money < 0) {
    const totalAssets = player.money + (player.properties || []).length * 500;
    return totalAssets < 0;
  }
  return false;
}

module.exports = {
  formatMoney,
  formatNumber,
  showToast,
  showModal,
  showLoading,
  hideLoading,
  vibrateShort,
  rollDice,
  isPropertyCell,
  isSpecialCell,
  getRelativePlayers,
  checkBankruptcy,
};
