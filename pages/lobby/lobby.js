const app = getApp();

Page({
  data: {
    roomId: '',
    players: [],
    playerCount: 0,
    maxPlayers: 4,
    isHost: false,
    status: 'waiting',
    myIndex: 0,
  },

  onLoad(options) {
    const roomId = options.roomId || '';
    const isHost = options.isHost === 'true';
    this.setData({ roomId, isHost });
    if (roomId) {
      this.watchRoom(roomId);
    }
  },

  // 监听房间变化
  watchRoom(roomId) {
    const db = wx.cloud.database();
    this._watcher = db.collection('rooms').doc(roomId).watch({
      onChange: (snapshot) => {
        const room = snapshot.docs[0];
        if (!room) return;
        this.setData({
          players: room.players || [],
          playerCount: (room.players || []).length,
          status: room.status || 'waiting',
        });

        // 游戏开始，跳转
        if (room.status === 'playing') {
          wx.redirectTo({ url: '/pages/game/game?roomId=' + roomId + '&myIndex=' + this.data.myIndex });
        }
      },
      onError: (err) => {
        console.error('房间监听失败', err);
      }
    });
  },

  // 房主开始游戏
  onStartGame() {
    const db = wx.cloud.database();
    db.collection('rooms').doc(this.data.roomId).update({
      data: { status: 'playing' }
    }).then(() => {
      wx.redirectTo({ url: '/pages/game/game?roomId=' + this.data.roomId + '&myIndex=0' });
    });
  },

  // 退出房间
  onLeaveRoom() {
    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('rooms').doc(this.data.roomId).update({
      data: { players: _.pull({ _openid: '{openid}' }) }
    }).then(() => {
      if (this._watcher) this._watcher.close();
      wx.redirectTo({ url: '/pages/index/index' });
    });
  },

  onUnload() {
    if (this._watcher) this._watcher.close();
  }
});