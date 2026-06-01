App({
  globalData: {
    gameData: null,
    isGameLoaded: false
  },

  onLaunch() {
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = {
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      pixelRatio: systemInfo.pixelRatio,
      statusBarHeight: systemInfo.statusBarHeight
    };
  }
});
