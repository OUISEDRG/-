const storage = require('../../utils/storage');
const app = getApp();

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
    this.setData({ hasSavedGame: hasSaved, saveTimeText: saveTimeText });
  },

  onNewGame() {
    wx.navigateTo({ url: '/pages/setup/setup' });
  },

  // ===== 联机：创建房间 =====
  onCreateRoom() {
    if (!wx.cloud) {
      wx.showToast({ title: '请先开通云开发', icon: 'none' });
      return;
    }

    const db = wx.cloud.database();
    const roomId = String(Math.floor(100000 + Math.random() * 900000));

    const myInfo = {
      _openid: '{openid}',
      name: '房主',
      avatar: '👑',
      bgColor: '#FFF0F5',
      color: '#FF6B9D',
      ready: true,
    };

    db.collection('rooms').add({
      data: {
        roomId: roomId,
        players: [myInfo],
        status: 'waiting',
        maxPlayers: 4,
        gameState: {},
        createTime: db.serverDate(),
      }
    }).then(() => {
      wx.navigateTo({ url: '/pages/lobby/lobby?roomId=' + roomId + '&isHost=true' });
    }).catch(err => {
      console.error('创建房间失败', err);
      wx.showToast({ title: '创建失败，请重试', icon: 'none' });
    });
  },

  // ===== 联机：加入房间 =====
  onJoinRoom() {
    if (!wx.cloud) {
      wx.showToast({ title: '请先开通云开发', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '加入房间',
      content: '',
      editable: true,
      placeholderText: '请输入 6 位房间号',
      success: (res) => {
        if (res.confirm && res.content) {
          this.doJoinRoom(res.content.trim());
        }
      }
    });
  },

  doJoinRoom(roomId) {
    if (!/^\d{6}$/.test(roomId)) {
      wx.showToast({ title: '请输入6位数字房间号', icon: 'none' });
      return;
    }

    const db = wx.cloud.database();
    db.collection('rooms').where({ roomId: roomId, status: 'waiting' }).get()
      .then(res => {
        if (res.data.length === 0) {
          wx.showToast({ title: '房间不存在或已开始', icon: 'none' });
          return;
        }

        const room = res.data[0];
        if (room.players.length >= (room.maxPlayers || 4)) {
          wx.showToast({ title: '房间已满', icon: 'none' });
          return;
        }

        const _ = db.command;
        db.collection('rooms').doc(room._id).update({
          data: {
            players: _.push({
              _openid: '{openid}',
              name: '玩家' + (room.players.length + 1),
              avatar: '👤',
              bgColor: '#F3E8FF',
              color: '#C084FC',
              ready: true,
            })
          }
        }).then(() => {
          wx.navigateTo({ url: '/pages/lobby/lobby?roomId=' + roomId + '&isHost=false' });
        });
      })
      .catch(err => {
        console.error('加入房间失败', err);
        wx.showToast({ title: '加入失败，请重试', icon: 'none' });
      });
  },

  onContinueGame() {
    if (!this.data.hasSavedGame) {
      wx.showToast({ title: '暂无存档', icon: 'none' });
      return;
    }
    const savedData = storage.loadGameState();
    if (savedData && savedData.state) {
      wx.navigateTo({ url: '/pages/game/game?loadSave=true' });
    } else {
      wx.showToast({ title: '存档读取失败', icon: 'none' });
    }
  },

  onRules() {
    wx.navigateTo({ url: '/pages/rules/rules' });
  }
});