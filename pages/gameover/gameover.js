const storage = require('../../utils/storage');
const util = require('../../utils/util');

Page({
  data: {
    winner: '',
    winnerAvatar: '',
    finalMoney: '',
    totalPlayers: 0,
    totalRounds: 0,
    totalProperties: 0,
    netWorth: '',
    bgColor: '#FFF5F5'
  },

  onLoad(options) {
    const winner = decodeURIComponent(options.winner || '玩家');
    const winnerAvatar = decodeURIComponent(options.winnerAvatar || '🏆');
    const money = parseInt(options.money || 0);
    const totalPlayers = parseInt(options.totalPlayers || 2);
    const totalRounds = parseInt(options.totalRounds || 1);
    const totalProperties = parseInt(options.totalProperties || 0);
    const netWorth = parseInt(options.netWorth || money);

    this.setData({
      winner,
      winnerAvatar,
      finalMoney: util.formatMoney(money),
      totalPlayers,
      totalRounds,
      totalProperties,
      netWorth: util.formatMoney(netWorth)
    });

    storage.clearGameData();
  },

  onPlayAgain() {
    wx.redirectTo({ url: '/pages/setup/setup' });
  },

  onBackHome() {
    wx.redirectTo({ url: '/pages/index/index' });
  }
});
