const STORAGE_KEYS = {
  GAME_STATE: 'monopoly_game_state',
  GAME_CONFIG: 'monopoly_game_config',
  SAVE_TIME: 'monopoly_save_time',
};

function saveGameState(gameState) {
  try {
    const data = JSON.stringify(gameState);
    wx.setStorageSync(STORAGE_KEYS.GAME_STATE, data);
    wx.setStorageSync(STORAGE_KEYS.SAVE_TIME, Date.now());
    return true;
  } catch (e) {
    console.error('保存游戏失败:', e);
    return false;
  }
}

function loadGameState() {
  try {
    const data = wx.getStorageSync(STORAGE_KEYS.GAME_STATE);
    const saveTime = wx.getStorageSync(STORAGE_KEYS.SAVE_TIME);
    if (data) {
      return {
        state: JSON.parse(data),
        saveTime: saveTime || 0
      };
    }
    return null;
  } catch (e) {
    console.error('读取游戏存档失败:', e);
    return null;
  }
}

function saveGameConfig(config) {
  try {
    wx.setStorageSync(STORAGE_KEYS.GAME_CONFIG, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('保存游戏配置失败:', e);
    return false;
  }
}

function loadGameConfig() {
  try {
    const data = wx.getStorageSync(STORAGE_KEYS.GAME_CONFIG);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (e) {
    console.error('读取游戏配置失败:', e);
    return null;
  }
}

function clearGameData() {
  try {
    wx.removeStorageSync(STORAGE_KEYS.GAME_STATE);
    wx.removeStorageSync(STORAGE_KEYS.GAME_CONFIG);
    wx.removeStorageSync(STORAGE_KEYS.SAVE_TIME);
    return true;
  } catch (e) {
    console.error('清除游戏数据失败:', e);
    return false;
  }
}

function hasSavedGame() {
  try {
    const data = wx.getStorageSync(STORAGE_KEYS.GAME_STATE);
    return !!data;
  } catch (e) {
    return false;
  }
}

function getSaveTime() {
  try {
    const time = wx.getStorageSync(STORAGE_KEYS.SAVE_TIME);
    return time || 0;
  } catch (e) {
    return 0;
  }
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
}

module.exports = {
  STORAGE_KEYS,
  saveGameState,
  loadGameState,
  saveGameConfig,
  loadGameConfig,
  clearGameData,
  hasSavedGame,
  getSaveTime,
  formatTime,
};
