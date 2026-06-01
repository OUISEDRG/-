const storage = require('../../utils/storage');

Page({
  data: {
    hasSavedGame: false,
    saveTimeText: ''
  },

  onShow() {
    const hasSaved = storage.hasSavedGame();
    let saveTimeText = '';
    if (hasSaved) {
      const saveTime = storage.getSaveTime();
      saveTimeText = saveTime ? storage.formatTime(saveTime) : '未知';
    }
    this.setData({
      hasSavedGame: hasSaved,
      saveTimeText: saveTimeText
    });
  },

  onNewGame() {
    wx.navigateTo({
      url: '/pages/setup/setup'
    });
  },

  onContinueGame() {
    if (!this.data.hasSavedGame) {
      wx.showToast({ title: '暂无存档', icon: 'none' });
      return;
    }
    const savedData = storage.loadGameState();
    if (savedData && savedData.state) {
      wx.navigateTo({
        url: '/pages/game/game?loadSave=true'
      });
    } else {
      wx.showToast({ title: '存档读取失败', icon: 'none' });
    }
  },

  onRules() {
    wx.navigateTo({
      url: '/pages/rules/rules'
    });
  }
});
