App({
  globalData: {
    gameData: null,
    isGameLoaded: false,
    cloudEnvId: 'cloud1-d2gv00el60a8dc5c6',
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.cloudEnvId,
        traceUser: true,
      });
    }

    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = {
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      pixelRatio: systemInfo.pixelRatio,
      statusBarHeight: systemInfo.statusBarHeight
    };
  }
});