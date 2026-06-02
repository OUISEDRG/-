const { BOARD_CELLS, BOARD_SIZE, ROLES, createInitialDeck, createPlayers, calculatePlayerNetWorth, getRentForLevel } = require('../../utils/game-data');
const storage = require('../../utils/storage');
const util = require('../../utils/util');
const app = getApp();

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

Page({
  data: {
    boardCells: [], players: [], currentPlayerIndex: 0, currentPlayerName: '',
    round: 1, boardSize: 0, cellSize: 0, centerSize: 0,
    diceDisabled: false, isMoving: false,
    showBuyBtn: false, showBuildBtn: false, showBankBtn: false, showPropsBtn: false, showEndTurnBtn: false,
    modalVisible: false, modalTitle: '', modalContent: '',
    modalShowConfirm: false, modalShowCancel: false, modalConfirmText: '确定', modalCancelText: '取消',
    menuVisible: false, propertyLevels: {}, propertyOwners: {},
    chanceDeck: [], fortuneDeck: [], gameStarted: false, floatingTexts: [],
    jumpingCellId: -1,
    roomId: '', myIndex: 0, isOnline: false, isMyTurn: false, waitingText: '',
    boardTransform: '', // 视角跟随的变换值
    playerTokens: [],
    showPropActions: false, propActionItems: [],
    showBuyPropActions: false, buyPropItems: [],
    teleportMode: false,
  },
  _cloudSyncing: false, _roomWatcher: null,

  // ===== 入口（单机/联机分流）=====
  onLoad(options) {
    const isLoadSave = options && options.loadSave === 'true';
    const roomId = options && options.roomId;
    const myIndex = options && options.myIndex ? parseInt(options.myIndex) : 0;
    if (roomId) { this.setData({ roomId, myIndex, isOnline: true }); this.initOnlineGame(roomId, myIndex); }
    else this.initGame(isLoadSave);
  },

  // ===== 联机：初始化监听 =====
  initOnlineGame(roomId, myIndex) {
    const db = wx.cloud.database();
    this.setData({ diceDisabled: true, waitingText: '正在连接房间...' });
    this._roomWatcher = db.collection('rooms').where({ roomId }).watch({
      onChange: (snapshot) => {
        if (this._cloudSyncing) return;
        const room = snapshot.docs[0]; if (!room) return;
        const gs = room.gameState || {};
        if (!gs.players || gs.players.length === 0) return;
        this.setGameState(gs); this.setupBoard(); this.updatePlayerStatus(); // this.init3DScene(); // 3D暂时关闭
        const isMyTurn = gs.currentPlayerIndex === myIndex;
        const cp = gs.players[gs.currentPlayerIndex];
        this.setData({
          isMyTurn, gameStarted: true,
          diceDisabled: !isMyTurn,
          waitingText: isMyTurn ? '' : ('等待 ' + (cp ? cp.displayName : '其他玩家') + ' 操作中...'),
          showBuyBtn: false, showBuildBtn: false, showBankBtn: false, showPropsBtn: false, showEndTurnBtn: false,
        });
        if (isMyTurn) this.updateUI();
      },
      onError: (err) => { console.error('监听失败', err); }
    });
  },

  // 推送状态到云端
  _pushGameState() {
    if (!this.data.isOnline || !this.data.roomId) return;
    this._cloudSyncing = true;
    const gs = { players: this.data.players, currentPlayerIndex: this.data.currentPlayerIndex,
      round: this.data.round, propertyLevels: this.data.propertyLevels, propertyOwners: this.data.propertyOwners,
      chanceDeck: this.data.chanceDeck, fortuneDeck: this.data.fortuneDeck };
    const db = wx.cloud.database();
    db.collection('rooms').where({ roomId: this.data.roomId }).update({ data: { gameState: gs } })
      .then(() => { this._cloudSyncing = false; })
      .catch(err => { console.error('同步失败', err); this._cloudSyncing = false; });
  },

  // ===== 单机初始化 =====
  initGame(isLoadSave) {
    if (isLoadSave) { const sd = storage.loadGameState(); if (sd && sd.state) { this.restoreGameState(sd.state); return; } }
    const config = storage.loadGameConfig(); if (!config) { wx.redirectTo({ url: '/pages/setup/setup' }); return; }
    const players = createPlayers(config); const playerData = this.formatPlayers(players, config);
    const gs = { players: playerData, currentPlayerIndex: 0, round: 1, propertyLevels: {}, propertyOwners: {},
      chanceDeck: createInitialDeck('chance'), fortuneDeck: createInitialDeck('fortune'), usedChanceCards: [], usedFortuneCards: [] };
    this.setGameState(gs); this.setupBoard(); this.updateUI(); this.showTurnStartModal(); // this.init3DScene(); // 3D暂时关闭
  },

  formatPlayers(players, config) {
    return players.map((p, i) => {
      const c = config && config.players ? config.players[i] : null; const role = c ? c.role : ROLES[0];
      return { ...p, displayName: c ? c.name : p.name, avatar: role.avatar, bgColor: role.bgColor, roleColor: role.color,
        displayMoney: util.formatMoney(p.money), isCurrent: i === 0, propertiesCount: 0, properties: [], isBankrupt: false,
        inJail: false, jailTurns: 0, skipNextTurn: false, doubleRentTurns: 0,
        skillType: role.skillType || '', skillValue: role.skillValue || 0, freeRentUsed: false,
        items: p.items || [], hasLoan: p.hasLoan || false, loanAmount: p.loanAmount || 0, loanInterest: p.loanInterest || 0,
        isAI: p.isAI || false, aiDifficulty: p.aiDifficulty || 'normal' }; // 修复：保留存档中的道具/贷款/AI状态
    });
  },

  setGameState(gs) {
    this.setData({
      players: gs.players,
      currentPlayerIndex: gs.currentPlayerIndex,
      round: gs.round || 1,
      propertyLevels: gs.propertyLevels || {},
      propertyOwners: gs.propertyOwners || {},
      chanceDeck: gs.chanceDeck || createInitialDeck('chance'),
      fortuneDeck: gs.fortuneDeck || createInitialDeck('fortune')
    });
  },
  restoreGameState(gs) {
    this.setGameState(gs);
    this.setupBoard();
    this.updateUI();
    this.updatePlayerStatus();
    // this.init3DScene(); // 3D暂时关闭
    this.setData({ gameStarted: true });
  },

  setupBoard() {
    const si = wx.getSystemInfoSync();
    const bs = Math.min(si.windowWidth - 60, si.windowHeight * 0.5, 400);
    const cs = bs / BOARD_SIZE;
    const cts = bs - cs * 2;
    
    const cells = BOARD_CELLS.map(c => {
      const p = this.getCellPixelPosition(c.id, cs);
      const od = this.getOwnerData(c.id);
      const lv = this.getCellLevel(c.id);
      const pls = this.getPlayersOnCell(c.id);
      
      return {
        ...c,
        x: p.x,
        y: p.y,
        bgColor: this.getCellBgColor(c, od),
        shortName: c.name.length > 3 ? c.name.substring(0, 2) : c.name,
        displayPrice: c.price ? (c.price/1000).toFixed(0)+'k' : '',
        players: pls,
        level: lv,
        ownerColor: od ? od.color : '',
        ownerBorder: od ? od.color : ''
      };
    });
    
    this.setData({
      boardCells: cells,
      boardSize: bs,
      cellSize: cs,
      centerSize: cts,
      playerTokens,
    });
    
    // 初始化视角
    this.refreshPlayerTokens();
  },
  
  // 更新棋盘视角，跟随当前玩家
  

  ﻿// ===== 棋盘坐标算法（百分比定位，完美闭合正方形）=====
// 7x7网格，28格沿周长分布。四角各承载2格（经典大富翁布局）
// gridX, gridY: 0-6 的虚拟坐标
getCellGridPosition(cellId) {
  const S = BOARD_SIZE; // 7
  const perSide = 7; // 每边7格
  const side = Math.floor(cellId / perSide); // 0=上, 1=右, 2=下, 3=左
  const idx = cellId % perSide; // 0-6

  let gridX, gridY;
  switch (side) {
    case 0: gridX = idx;        gridY = S - 1; break; // 上边: (0..6, 6)
    case 1: gridX = S - 1;      gridY = S - 1 - idx; break; // 右边: (6, 6..0)
    case 2: gridX = S - 1 - idx; gridY = 0; break; // 下边: (6..0, 0)
    case 3: gridX = 0;          gridY = idx; break; // 左边: (0, 0..6)
  }
  return { gridX, gridY };
},

// 百分比定位：格子在棋盘内的 left/top 百分比
getCellPercentPosition(cellId) {
  const S = BOARD_SIZE;
  const { gridX, gridY } = this.getCellGridPosition(cellId);
  return {
    left: (gridX / (S - 1)) * 100,  // 0% ~ 100%
    top: ((S - 1 - gridY) / (S - 1)) * 100, // 0% ~ 100%（y轴翻转）
  };
},

// 像素定位（用于玩家头像渲染）
getCellPixelXY(cellId, cellPx) {
  const pct = this.getCellPercentPosition(cellId);
  return {
    x: (pct.left / 100) * (cellPx * (BOARD_SIZE - 1)),
    y: (pct.top / 100) * (cellPx * (BOARD_SIZE - 1)),
  };
},

setupBoard() {
  const si = wx.getSystemInfoSync();
  // 棋盘大小：取屏幕宽度的82%，最大480px
  const bs = Math.min(si.windowWidth * 0.82, 480);
  const cs = bs / BOARD_SIZE; // 每格像素
  const cts = bs - cs * 2;    // 中心空地

  const cells = BOARD_CELLS.map(c => {
    const pos = this.getCellPercentPosition(c.id);
    const od = this.getOwnerData(c.id);
    const lv = this.getCellLevel(c.id);
    // 四角cell特殊标记（id=0,7,14,21）
    const isCorner = ['start','corner'].includes(c.type);

    return {
      ...c,
      left: pos.left,
      top: pos.top,
      cellSize: cs,
      isCorner,
      bgColor: this.getCellBgColor(c, od),
      shortName: c.name.length > 3 ? c.name.substring(0, 2) : c.name,
      displayPrice: c.price ? (c.price / 1000).toFixed(0) + 'k' : '',
      level: lv,
      ownerColor: od ? od.color : '',
      ownerBorder: od ? od.color : '',
      isProperty: c.type === 'property',
      isChance: c.type === 'chance',
      isFortune: c.type === 'fortune',
      isTax: c.type === 'tax',
    };
  });

  // 玩家位置数据
  const playerTokens = this.data.players
    .filter(p => !p.isBankrupt)
    .map(p => {
      const pos = this.getCellPercentPosition(p.position);
      // 同格多人时微调偏移
      const sameCell = this.data.players.filter(
        pp => !pp.isBankrupt && pp.position === p.position
      );
      const myIdx = sameCell.findIndex(pp => pp.id === p.id);
      const totalOnCell = sameCell.length;
      const offsetX = totalOnCell > 1 ? ((myIdx - (totalOnCell - 1) / 2) * 10) : 0;

              const boardPx3 = cs * (BOARD_SIZE - 1);
        const px3 = (pos.left / 100) * boardPx3;
        const py3 = (pos.top / 100) * boardPx3;

return {
        id: p.id,
        avatar: p.avatar,
        roleColor: p.roleColor,
        displayName: p.displayName,
        isCurrent: p.id === this.data.players[this.data.currentPlayerIndex]?.id,
                  leftPx: px3,
                  topPx: py3,
        offsetX,
      };
    });

  this.setData({
    boardCells: cells,
    boardSize: bs,
    cellSize: cs,
    centerSize: cts,
    playerTokens,
  });
},

getCellBgColor(c, od) {
  if (c.type === 'property' && od) return od.bgColor || '#FFF5F5';
  return '';
},

getOwnerData(cid) {
  const o = this.data.propertyOwners[cid];
  if (o !== undefined) {
    const p = this.data.players[o];
    if (p && !p.isBankrupt) return { color: p.roleColor, bgColor: p.bgColor };
  }
  return null;
},

getCellLevel(cid) {
  return this.data.propertyLevels[cid] || 0;
},

// 刷新玩家Token（不重建棋盘时调用）
refreshPlayerTokens() {
    const cs = this.data.cellSize || 50;
    const tokens = this.data.players
      .filter(p => !p.isBankrupt)
      .map(p => {
        const pos = this.getCellPercentPosition(p.position);
        const sameCell = this.data.players.filter(
          pp => !pp.isBankrupt && pp.position === p.position
        );
        const myIdx = sameCell.findIndex(pp => pp.id === p.id);
        const totalOnCell = sameCell.length;
        const offsetX = totalOnCell > 1 ? ((myIdx - (totalOnCell - 1) / 2) * 12) : 0;
        const boardPx = cs * (BOARD_SIZE - 1);
        const px = (pos.left / 100) * boardPx;
        const py = (pos.top / 100) * boardPx;

        return {
          id: p.id,
          avatar: p.avatar,
          roleColor: p.roleColor,
          displayName: p.displayName,
          isCurrent: p.id === this.data.players[this.data.currentPlayerIndex]?.id,
          leftPx: px,
          topPx: py,
          offsetX,
        };
      });
    this.setData({ playerTokens: tokens });
  },

updateUI() {

    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p) return;
    
    const cc = BOARD_CELLS[p.position];
    const isP = cc && cc.type === 'property';
    const co = this.data.propertyOwners[p.position];
    let sb = false, sbb = false;
    
    if (isP && !p.isBankrupt) {
      if (co === undefined) {
        if (p.money >= cc.price) sb = true;
      } else if (co === p.id) {
        const lv = this.data.propertyLevels[p.position] || 0;
        if (lv < 3 && p.money >= cc.buildCost) sbb = true;
      }
    }
    
    // 联机权限锁：非自己回合时隐藏买地/盖房/银行按钮
    const online = this.data.isOnline;
    this.setData({
      showBuyBtn: online && !this.data.isMyTurn ? false : sb,
      showBuildBtn: online && !this.data.isMyTurn ? false : sbb,
      showBankBtn: online && !this.data.isMyTurn ? false : !p.isBankrupt,
      showPropsBtn: !p.isBankrupt && !p.isAI,
      showEndTurnBtn: online ? this.data.isMyTurn : true,
      currentPlayerName: p.displayName
    });
  },

  updatePlayerStatus() {
    const ps = this.data.players.map((p, i) => ({
      ...p,
      displayMoney: util.formatMoney(p.money),
      isCurrent: i === this.data.currentPlayerIndex && !p.isBankrupt,
      propertiesCount: (p.properties || []).length
    }));
    this.setData({ players: ps });
  },

  // ===== 掷骰子（联机权限锁）=====
  async onDiceRollEnd(e) {
    if (this.data.isMoving) return;
    // 联机：非自己回合禁止掷骰子
    if (this.data.isOnline && !this.data.isMyTurn) {
      util.showToast('还没轮到你', 'none');
      return;
    }
    let dv = e.detail.value;
    const pi = this.data.currentPlayerIndex;
    const p = this.data.players[pi];
    if (!p || p.isBankrupt) return;

    if (this._doubleNextMove) { dv *= 2; this._doubleNextMove = false; util.showToast('双倍骰子！', 'success'); }

    this.setData({
      diceDisabled: true,
      isMoving: true,
      showBuyBtn: false,
      showBuildBtn: false,
      showEndTurnBtn: false
    });

    if (this._reverseNextMove) {
      this._reverseNextMove = false;
      await this.movePlayerBackward(pi, dv);
    } else {
      await this.movePlayer(pi, dv);
    }
  },

  async movePlayer(pi, steps) {
    const ps = [...this.data.players];
    const p = {...ps[pi]};
    const cc = BOARD_CELLS.length;
    
    for (let i = 0; i < steps; i++) {
      const np = (p.position + 1) % cc;
      p.position = np;
      ps[pi] = p;
      this.setData({ players: ps, jumpingCellId: np });
      this.setupBoard(); // 更新视角
      
      if (np === 0) {
        p.money += 2000;
        if (p.skillType === 'startBonus') {
          p.money += p.skillValue;
        }
        ps[pi] = p;
        this.setData({ players: ps });
        this.updatePlayerStatus();
        this.showFloatingText('+2000💰', '#4ECDC4');
      }
      await sleep(250);
    }
    
    this.updatePlayerStatus();
    this.setupBoard(); // 更新视角
    await sleep(200);
    this.setData({ jumpingCellId: -1 });
    this.handleLanding(pi);
    // 联机模式：推送最新状态
    if (this.data.isOnline) this._pushGameState();
  },

  async movePlayerBackward(pi, steps) {
    const ps = [...this.data.players];
    const p = {...ps[pi]};
    const cc = BOARD_CELLS.length;
    
    for (let i = 0; i < steps; i++) {
      let np = p.position - 1;
      if (np < 0) np = cc - 1;
      p.position = np;
      ps[pi] = p;
      this.setData({ players: ps, jumpingCellId: np });
      this.setupBoard(); // 更新视角
      await sleep(250);
    }
    
    this.updatePlayerStatus();
    this.setupBoard(); // 更新视角
    this.setData({ jumpingCellId: -1 });
    this.handleLanding(pi);
  },

  handleLanding(pi) {
    const p = this.data.players[pi];
    if (!p || p.isBankrupt) {
      this.setData({ isMoving: false });
      this.updateUI();
      return;
    }
    
    const cell = BOARD_CELLS[p.position];
    if (!cell) {
      this.setData({ isMoving: false });
      this.updateUI();
      return;
    }
    
    switch (cell.type) {
      case 'property':
        this.handlePropertyLand(pi, cell);
        break;
      case 'chance':
        this.handleCardDraw(pi, 'chance');
        break;
      case 'fortune':
        this.handleCardDraw(pi, 'fortune');
        break;
      case 'tax':
        this.handleTax(pi, cell);
        break;
      case 'start':
        util.showToast('到达起点');
        this.setData({ isMoving: false, jumpingCellId: -1 });
        this.updateUI();
        break;
      case 'corner':
        this.handleCorner(pi, cell);
        break;
      default:
        this.setData({ isMoving: false, jumpingCellId: -1 });
        this.updateUI();
    }
  },

  handlePropertyLand(pi, cell) {
    const o = this.data.propertyOwners[cell.id];
    if (o === undefined) {
      this.setData({ isMoving: false, jumpingCellId: -1 });
      this.updateUI();
      return;
    }
    
    if (o !== pi) {
      const op = this.data.players[o];
      if (op && !op.isBankrupt) {
        if (this._rentShieldActive) {
          this._rentShieldActive = false;
          util.showToast('盾牌生效！免缴租金', 'success');
          this.setData({ isMoving: false, jumpingCellId: -1 });
          this.updateUI();
          return;
        }
        const lv = this.data.propertyLevels[cell.id] || 1;
        let rent = getRentForLevel(cell, lv);
        if (this.hasMonopoly(op, cell.group)) rent *= 2;
        if (op.skillType === 'rentBonus') rent = Math.floor(rent * (1 + op.skillValue));
        if (op.doubleRentTurns > 0) rent *= 2;
        this.payRent(pi, o, cell, rent);
      } else {
        this.setData({ isMoving: false, jumpingCellId: -1 });
        this.updateUI();
      }
    } else {
      this.setData({ isMoving: false, jumpingCellId: -1 });
      this.updateUI();
    }
  },

  payRent(pi, oi, cell, rent) {
    const ps = [...this.data.players];
    let p = {...ps[pi]};
    let o = {...ps[oi]};
    
    if (!p || !o) return;
    
    if (p.skillType === 'freeRentOnce' && !p.freeRentUsed) {
      p.freeRentUsed = true;
      ps[pi] = p;
      ps[oi] = o;
      this.setData({ players: ps, isMoving: false });
      this.updatePlayerStatus();
      this.setupBoard();
      util.showToast('🦹 忍者遁术！免缴过路费', 'success');
      this.updateUI();
      return;
    }
    
    const ar = Math.min(rent, p.money);
    p.money -= ar;
    o.money += ar;
    ps[pi] = p;
    ps[oi] = o;
    this.setData({ players: ps, isMoving: false });
    this.updatePlayerStatus();
    this.showFloatingText('-' + ar, '#FF6B6B');
    util.showToast(cell.name + ' 过路费 ' + ar + ' 元', 'none');
    setTimeout(() => { this.checkPlayerBankruptcy(pi); }, 800);
  },

  // ===== 卡片 =====
  handleCardDraw(pi, type) {
    const dk = type === 'chance' ? 'chanceDeck' : 'fortuneDeck';
    const uk = type === 'chance' ? 'usedChanceCards' : 'usedFortuneCards';
    let deck = [...this.data[dk]];
    let used = [...this.data[uk]];
    
    if (deck.length === 0) {
      deck = createInitialDeck(type);
      used = [];
    }
    
    const card = deck.pop();
    used.push(card);
    const ud = { isMoving: false };
    ud[dk] = deck;
    ud[uk] = used;
    this.setData(ud);
    this.showCardModal(type, card, pi);
  },
  
  showCardModal(type, card, pi) {
    const tn = type === 'chance' ? '机会卡' : '命运卡';
    const ti = type === 'chance' ? '❓' : '🎲';
    this.setData({
      modalVisible: true,
      modalTitle: ti + ' ' + tn,
      modalContent: '《' + card.text + '》',
      modalShowConfirm: true,
      modalShowCancel: false,
      modalConfirmText: '确定',
      modalCallback: () => { this.executeCardAction(card, pi); }
    });
  },
  
  executeCardAction(card, pi) {
    const ps = [...this.data.players];
    let p = {...ps[pi]};
    
    switch (card.action) {
      case 'addMoney':
        let bonus2 = card.value;
        if (this._luckyCharmActive) { bonus2 *= 2; this._luckyCharmActive = false; util.showToast('幸运符生效！奖励翻倍', 'success'); }
        p.money += bonus2;
        this.showFloatingText('+' + card.value, '#4ECDC4');
        util.showToast('+' + card.value + ' 元', 'success');
        break;
      case 'subtractMoney':
        p.money -= card.value;
        this.showFloatingText('-' + card.value, '#FF6B6B');
        util.showToast('-' + card.value + ' 元', 'none');
        break;
      case 'moveForward':
        ps[pi] = p;
        this.setData({ players: ps });
        this.movePlayer(pi, card.value);
        return;
      case 'moveBackward':
        ps[pi] = p;
        this.setData({ players: ps });
        this.movePlayerBackward(pi, card.value);
        return;
      case 'gotoStart':
        p.money += 2000;
        p.position = 0;
        this.showFloatingText('+2000💰', '#4ECDC4');
        util.showToast('回到起点', 'success');
        break;
      case 'doubleRent':
        p.doubleRentTurns = 2;
        util.showToast('租金翻倍已生效', 'success');
        break;
      case 'stealProperty':
        this.cardStealProperty(pi, p);
        return;
      case 'allLoseMoney':
        this.cardAllLoseMoney(pi, p, card);
        return;
      case 'destroyProperty':
        this.cardDestroyProperty(pi, p);
        return;
      case 'allPayBank':
        this.cardAllPayBank(pi, p, card);
        return;
    }
    
    ps[pi] = p;
    this.setData({ players: ps });
    this.updatePlayerStatus();
    this.setupBoard();
    setTimeout(() => { this.checkPlayerBankruptcy(pi); }, 300);
  },
  
  cardStealProperty(pi, p) {
    const oth = this.data.players.filter((pp, i) =>
      i !== pi && !pp.isBankrupt && (pp.properties || []).length > 0
    );
    if (oth.length === 0) {
      util.showToast('没有可偷的地产', 'none');
      this.updateUI();
      return;
    }
    
    const v = oth[Math.floor(Math.random() * oth.length)];
    const si = Math.floor(Math.random() * v.properties.length);
    const sc = v.properties[si];
    const ps = [...this.data.players];
    const vi = ps.findIndex(pp => pp.id === v.id);
    
    ps[vi] = {
      ...v,
      properties: v.properties.filter((_, i) => i !== si)
    };
    ps[pi] = { ...p, properties: [...(p.properties || []), sc] };
    const po = { ...this.data.propertyOwners, [sc]: pi };
    this.setData({ players: ps, propertyOwners: po });
    this.updatePlayerStatus();
    this.setupBoard();
    util.showToast('天降横财！获得' + v.displayName + '的' + BOARD_CELLS[sc].name, 'success');
    this.updateUI();
  },
  
  cardDestroyProperty(pi, p) {
    const oth = this.data.players.filter((pp, i) =>
      i !== pi && !pp.isBankrupt && (pp.properties || []).length > 0
    );
    if (oth.length === 0) {
      util.showToast('没有房产可摧毁', 'none');
      this.updateUI();
      return;
    }
    
    const v = oth[Math.floor(Math.random() * oth.length)];
    const di = Math.floor(Math.random() * v.properties.length);
    const dc = v.properties[di];
    const ps = [...this.data.players];
    const vi = ps.findIndex(pp => pp.id === v.id);
    
    ps[vi] = {
      ...v,
      properties: v.properties.filter((_, i) => i !== di)
    };
    ps[pi] = p;
    const po = { ...this.data.propertyOwners };
    delete po[dc];
    const pl = { ...this.data.propertyLevels };
    delete pl[dc];
    
    this.setData({ players: ps, propertyOwners: po, propertyLevels: pl });
    this.updatePlayerStatus();
    this.setupBoard();
    util.showToast('陨石摧毁了' + v.displayName + '的' + BOARD_CELLS[dc].name + '！', 'none');
    this.updateUI();
  },
  
  cardAllLoseMoney(pi, p, card) {
    const ps = [...this.data.players];
    ps.forEach((pp, i) => {
      if (i !== pi && !pp.isBankrupt) {
        ps[i] = { ...pp, money: Math.max(0, pp.money - card.value) };
      }
    });
    ps[pi] = p;
    this.setData({ players: ps });
    this.updatePlayerStatus();
    util.showToast('股票大跌！其他玩家各损失' + card.value + '元', 'none');
    this.updateUI();
  },
  
  cardAllPayBank(pi, p, card) {
    const ps = [...this.data.players];
    ps.forEach((pp, i) => {
      if (i !== pi && !pp.isBankrupt) {
        ps[i] = { ...pp, money: Math.max(0, pp.money - card.value) };
      }
    });
    ps[pi] = p;
    this.setData({ players: ps });
    this.updatePlayerStatus();
    util.showToast('经济危机！其他玩家各缴' + card.value + '元', 'none');
    this.updateUI();
  },

  // ===== 税务/角落 =====
  handleTax(pi, cell) {
    const ps = [...this.data.players];
    let p = {...ps[pi]};
    let amt = cell.amount || 500;
    if (p.skillType === 'taxDiscount') amt = Math.floor(amt * p.skillValue);
    
    p.money -= amt;
    ps[pi] = p;
    this.setData({ players: ps, isMoving: false });
    this.updatePlayerStatus();
    this.showFloatingText('-' + amt, '#FF6B6B');
    util.showToast('缴税 ' + amt + ' 元', 'none');
    setTimeout(() => { this.checkPlayerBankruptcy(pi); }, 800);
  },
  
  handleCorner(pi, cell) {
    this.setData({ isMoving: false });
    if (cell.name === '监狱') {
      util.showToast('免费参观监狱', 'none');
    } else if (cell.name === '免费停车') {
      util.showToast('免费停车，休息一下', 'success');
    } else {
      util.showToast('到达' + cell.name, 'none');
    }
    this.updateUI();
  },

  // ===== 买地/盖房 =====
  onBuyProperty() {
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p) return;
    const cell = BOARD_CELLS[p.position];
    if (!cell || cell.type !== 'property') return;
    
    let price = cell.price;
    if (p.skillType === 'buyDiscount') price = Math.floor(price * p.skillValue);
    
    if (p.money < price) {
      util.showToast('资金不足', 'none');
      return;
    }
    
    const cid = cell.id;
    const ps = [...this.data.players];
    ps[this.data.currentPlayerIndex] = {
      ...p,
      money: p.money - price,
      properties: [...(p.properties || []), cid]
    };
    const po = { ...this.data.propertyOwners, [cid]: this.data.currentPlayerIndex };
    const pl = { ...this.data.propertyLevels, [cid]: 1 };
    
    this.setData({ players: ps, propertyOwners: po, propertyLevels: pl });
    this.showFloatingText('-' + price, '#FF6B6B');
    util.showToast('成功购买 ' + cell.name + '！', 'success');
    this.updatePlayerStatus();
    this.setupBoard();
    this.updateUI();
  },
  
  onBuildHouse() {
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p) return;
    const cell = BOARD_CELLS[p.position];
    if (!cell || cell.type !== 'property') return;
    
    const lv = this.data.propertyLevels[p.position] || 1;
    if (lv >= 4) {
      util.showToast('已满级', 'none');
      return;
    }
    if (p.money < cell.buildCost) {
      util.showToast('资金不足', 'none');
      return;
    }
    
    const nl = lv + 1;
    const ps = [...this.data.players];
    ps[this.data.currentPlayerIndex] = { ...p, money: p.money - cell.buildCost };
    const pl = { ...this.data.propertyLevels, [p.position]: nl };
    
    this.setData({ players: ps, propertyLevels: pl });
    this.showFloatingText('-' + cell.buildCost, '#FF6B6B');
    util.showToast('升级成功！' + cell.name + ' Lv.' + nl, 'success');
    this.updatePlayerStatus();
    this.setupBoard();
    this.updateUI();
  },

  // ===== 银行 =====
  onBank() {
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p) return;
    
    const ct = '当前资金: ' + util.formatMoney(p.money) + ' 元\n' +
      (p.hasLoan ? '已有贷款: ' + util.formatMoney(p.loanAmount) + ' 元' : '当前无贷款');
    
    this.setData({
      modalVisible: true,
      modalTitle: '🏦 银行',
      modalContent: ct,
      modalShowConfirm: true,
      modalShowCancel: true,
      modalConfirmText: p.hasLoan ? '还款' : '贷款',
      modalCancelText: '关闭',
      modalCallback: null,
      modalCallbackCancel: null
    });
    
    this._bankCallback = () => {
      if (p.hasLoan) this.repayLoan();
      else this.takeLoan();
    };
    this._bankCancelCallback = () => {
      this.setData({ modalVisible: false });
      this.updateUI();
    };
  },
  
  takeLoan() {
    const ps = [...this.data.players];
    const p = ps[this.data.currentPlayerIndex];
    ps[this.data.currentPlayerIndex] = {
      ...p,
      money: p.money + 5000,
      hasLoan: true,
      loanAmount: 5000,
      loanInterest: 500
    };
    this.setData({ players: ps, modalVisible: false });
    this.showFloatingText('+5000', '#4ECDC4');
    util.showToast('贷款5000元成功', 'success');
    this.updatePlayerStatus();
    this.updateUI();
  },
  
  repayLoan() {
    const ps = [...this.data.players];
    const p = ps[this.data.currentPlayerIndex];
    const tr = p.loanAmount + p.loanInterest;
    
    if (p.money < tr) {
      util.showToast('资金不足', 'none');
      return;
    }
    
    ps[this.data.currentPlayerIndex] = {
      ...p,
      money: p.money - tr,
      hasLoan: false,
      loanAmount: 0,
      loanInterest: 0
    };
    this.setData({ players: ps, modalVisible: false });
    this.showFloatingText('-' + tr, '#FF6B6B');
    util.showToast('还款成功，共' + tr + '元', 'success');
    this.updatePlayerStatus();
    this.updateUI();
  },

  // ===== 资产查看 =====
  onViewProps() {
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p) return;
    
    const pr = (p.properties || []).map(cid => {
      const c = BOARD_CELLS.find(cc => cc.id === cid);
      const lv = this.data.propertyLevels[cid] || 1;
      return c ? c.name + ' (Lv.' + lv + ')' : '';
    }).filter(Boolean);
    
    const nw = calculatePlayerNetWorth(p, this.data.propertyOwners, this.data.propertyLevels);
    let ct = pr.length > 0 ?
      '🏠 地产(' + pr.length + '处):\n' + pr.join('\n') + '\n\n💰 现金: ' +
      util.formatMoney(p.money) + '\n💎 总资产: ' + util.formatMoney(nw) :
      '暂无地产\n\n💰 现金: ' + util.formatMoney(p.money);
    
    if (p.hasLoan) ct += '\n💸 贷款: ' + util.formatMoney(p.loanAmount);
    
    this.setData({
      modalContent: ct,
      modalVisible: true,
      modalTitle: '📋 我的资产',
      modalShowConfirm: true,
      modalShowCancel: false,
      modalConfirmText: '关闭',
      modalCallback: () => {
        this.setData({ modalVisible: false });
        this.updateUI();
      }
    });
  },

  // ===== 回合结束（联机同步）=====
  onEndTurn() {
    const ps = [...this.data.players];
    let ci = this.data.currentPlayerIndex;
    let ni = (ci + 1) % ps.length;
    let r = this.data.round;
    
    if (ps[ci] && !ps[ci].isBankrupt && ps[ci].doubleRentTurns > 0) {
      ps[ci].doubleRentTurns -= 1;
    }
    
    let at = 0;
    while (ps[ni].isBankrupt && at < ps.length) {
      ni = (ni + 1) % ps.length;
      at++;
    }
    
    if (ni <= ci && !ps[ni].isBankrupt) r += 1;
    
    this.setData({
      players: ps,
      currentPlayerIndex: ni,
      round: r,
      showBuyBtn: false,
      showBuildBtn: false,
      showBankBtn: false,
      showPropsBtn: false,
      showEndTurnBtn: false,
      isMoving: false,
      isMyTurn: false,
      waitingText: ''
    });
    
    this.updatePlayerStatus();
    
    // 联机模式：推送状态给下一位
    if (this.data.isOnline) this._pushGameState();
    this.showTurnStartModal();
  },

  showTurnStartModal() {
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p || p.isBankrupt) {
      this.advanceToNextNonBankrupt();
      return;
    }
    
    const ap = this.data.players.filter(pp => !pp.isBankrupt);
    if (ap.length <= 1) {
      this.handleGameEnd(ap[0]);
      return;
    }

    // AI自动执行
    if (p.isAI && !p.isBankrupt) {
      this.setData({ diceDisabled: true, isMoving: false, gameStarted: true });
      setTimeout(() => { this.runAITurn(); }, 500);
      return;
    }

    this.setData({
      diceDisabled: this.data.isOnline ? !this.data.isMyTurn : false,
      isMoving: false,
      gameStarted: true
    });
    
    this.refreshPlayerTokens(); // 更新视角到当前玩家
  },
  
  advanceToNextNonBankrupt() {
    const ps = this.data.players;
    let ci = this.data.currentPlayerIndex;
    let ni = (ci + 1) % ps.length;
    let r = this.data.round;
    let at = 0;
    
    while (ps[ni].isBankrupt && at < ps.length) {
      ni = (ni + 1) % ps.length;
      at++;
    }
    
    if (ni <= ci && !ps[ni].isBankrupt) r += 1;
    
    this.setData({ currentPlayerIndex: ni, round: r });
    this.updatePlayerStatus();
    this.showTurnStartModal();
  },

  checkPlayerBankruptcy(pi) {
    const p = this.data.players[pi];
    if (!p || p.isBankrupt) return;
    
    if (util.checkBankruptcy(p, this.data.propertyLevels, this.data.propertyOwners)) {
      this.handleBankruptcy(pi);
    } else {
      this.updateUI();
    }
  },

  handleBankruptcy(pi) {
    const ps = [...this.data.players];
    const p = ps[pi];
    if (!p || p.isBankrupt) return;
    
    ps[pi] = { ...p, isBankrupt: true, money: 0, properties: [] };
    
    const po = { ...this.data.propertyOwners };
    const pl = { ...this.data.propertyLevels };
    if (p.properties) {
      p.properties.forEach(cid => {
        delete po[cid];
        delete pl[cid];
      });
    }
    
    this.setData({ players: ps, propertyOwners: po, propertyLevels: pl });
    this.showFloatingText(p.displayName + ' 破产！', '#FF6B6B');
    util.showToast(p.displayName + ' 已破产出局！', 'none');
    this.updatePlayerStatus();
    this.setupBoard();
    this.refreshPlayerTokens();
    
    const alive = ps.filter(pp => !pp.isBankrupt);
    if (alive.length <= 1) {
      setTimeout(() => { this.handleGameEnd(alive[0]); }, 1500);
    } else {
      setTimeout(() => { this.onEndTurn(); }, 1200);
    }
  },

  // ===== AI 回合处理 =====
  runAITurn() {
    const pi = this.data.currentPlayerIndex;
    const p = this.data.players[pi];
    if (!p || !p.isAI || p.isBankrupt) return;
    
    this.setData({ diceDisabled: true, waitingText: p.displayName + ' 思考中...' });
    
    setTimeout(() => {
      // AI掷骰子
      const diceValue = util.rollDice() + util.rollDice();
      this.setData({ waitingText: p.displayName + ' 掷出 ' + diceValue + ' 点' });
      
      // 检查道具: double/reverse
      let steps = diceValue;
      if (this._doubleNextMove) { steps *= 2; this._doubleNextMove = false; }
      
      setTimeout(async () => {
        if (this._reverseNextMove) {
          this._reverseNextMove = false;
          await this.movePlayerBackward(pi, steps);
        } else {
          await this.movePlayer(pi, steps);
        }
        
        // AI决策: 买地/盖房/贷款/还款
        setTimeout(() => {
          this.executeAIDecisions(pi);
        }, 600);
      }, 800);
    }, 600);
  },
  
  executeAIDecisions(pi) {
    const p = this.data.players[pi];
    if (!p || !p.isAI || p.isBankrupt) return;
    
    const gs = {
      propertyLevels: this.data.propertyLevels,
      propertyOwners: this.data.propertyOwners,
    };
    
    const decision = aiController.executeAITurn(p, gs);
    
    switch (decision.action) {
      case 'buy':
        this.aiBuyProperty(pi);
        break;
      case 'build':
        this.aiBuildHouse(pi, decision.cellId);
        break;
      case 'loan':
        this.aiTakeLoan(pi);
        break;
      case 'repay':
        this.aiRepayLoan(pi);
        break;
      default:
        this.finishAITurn(pi);
    }
  },
  
  aiBuyProperty(pi) {
    const p = this.data.players[pi];
    const cell = BOARD_CELLS[p.position];
    if (!cell || cell.type !== 'property') { this.finishAITurn(pi); return; }
    
    let price = cell.price;
    if (p.skillType === 'buyDiscount') price = Math.floor(price * p.skillValue);
    if (p.money < price) { this.finishAITurn(pi); return; }
    
    const ps = [...this.data.players];
    ps[pi] = {
      ...p,
      money: p.money - price,
      properties: [...(p.properties || []), cell.id]
    };
    const po = { ...this.data.propertyOwners, [cell.id]: pi };
    const pl = { ...this.data.propertyLevels, [cell.id]: 1 };
    
    this.setData({ players: ps, propertyOwners: po, propertyLevels: pl });
    this.showFloatingText('-' + price, '#FF6B6B');
    util.showToast(p.displayName + ' 购买了 ' + cell.name, 'none');
    this.updatePlayerStatus();
    this.setupBoard();
    
    // 继续决策
    setTimeout(() => { this.executeAIDecisions(pi); }, 500);
  },
  
  aiBuildHouse(pi, cellId) {
    const p = this.data.players[pi];
    const cell = BOARD_CELLS[cellId];
    if (!cell) { this.finishAITurn(pi); return; }
    
    const lv = (this.data.propertyLevels[cellId]) || 1;
    if (lv >= 4 || p.money < cell.buildCost) { this.finishAITurn(pi); return; }
    
    const ps = [...this.data.players];
    ps[pi] = { ...p, money: p.money - cell.buildCost };
    const pl = { ...this.data.propertyLevels, [cellId]: lv + 1 };
    
    this.setData({ players: ps, propertyLevels: pl });
    this.showFloatingText('-' + cell.buildCost, '#FF6B6B');
    util.showToast(p.displayName + ' 升级了 ' + cell.name, 'none');
    this.updatePlayerStatus();
    this.setupBoard();
    
    setTimeout(() => { this.executeAIDecisions(pi); }, 500);
  },
  
  aiTakeLoan(pi) {
    const ps = [...this.data.players];
    const p = ps[pi];
    ps[pi] = { ...p, money: p.money + 5000, hasLoan: true, loanAmount: 5000, loanInterest: 500 };
    this.setData({ players: ps });
    this.showFloatingText('+5000', '#4ECDC4');
    util.showToast(p.displayName + ' 贷款5000元', 'none');
    this.updatePlayerStatus();
    
    setTimeout(() => { this.executeAIDecisions(pi); }, 500);
  },
  
  aiRepayLoan(pi) {
    const ps = [...this.data.players];
    const p = ps[pi];
    const tr = p.loanAmount + p.loanInterest;
    if (p.money < tr) { this.finishAITurn(pi); return; }
    ps[pi] = { ...p, money: p.money - tr, hasLoan: false, loanAmount: 0, loanInterest: 0 };
    this.setData({ players: ps });
    this.showFloatingText('-' + tr, '#FF6B6B');
    util.showToast(p.displayName + ' 还款' + tr + '元', 'none');
    this.updatePlayerStatus();
    
    setTimeout(() => { this.executeAIDecisions(pi); }, 500);
  },
  
  finishAITurn(pi) {
    this.setData({ isMoving: false, waitingText: '' });
    this.updateUI();
    // 自动结束回合
    setTimeout(() => { this.onEndTurn(); }, 800);
  },

  // ===== 道具系统 =====
  onUseProp() {
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p || p.isBankrupt) return;
    
    const counts = propsData.countItems(p);
    const itemIds = Object.keys(counts);
    
    if (itemIds.length === 0) {
      this.setData({
        modalVisible: true,
        modalTitle: '背包',
        modalContent: '背包空空如也~ 可以在银行购买道具',
        modalShowConfirm: true,
        modalShowCancel: false,
        modalConfirmText: '知道了',
        modalCallback: () => { this.setData({ modalVisible: false }); this.updateUI(); }
      });
      return;
    }
    
    let ct = '选择要使用的道具：';
    
    this.setData({
      modalVisible: true,
      modalTitle: '道具背包',
      modalContent: ct,
      modalShowConfirm: false,
      modalShowCancel: true,
      modalCancelText: '关闭',
      modalCallbackCancel: () => { this.setData({ modalVisible: false }); this.updateUI(); },
      showPropActions: true,
      propActionItems: itemIds.map(id => {
        const item = propsData.ITEMS[id];
        return { id, name: item ? item.name : id, icon: item ? item.icon : '', count: counts[id] || 0 };
      })
    });
  },
  
  onUsePropItem(e) {
    const itemId = e.currentTarget.dataset.itemId;
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p || p.isBankrupt) return;
    
    const items = p.items || [];
    if (!items.includes(itemId)) {
      util.showToast('没有该道具', 'none');
      return;
    }
    
    let ps = [...this.data.players];
    
    switch (itemId) {
      case 'reverseDice':
        ps[this.data.currentPlayerIndex] = propsData.removeItem(p, itemId);
        this.setData({ players: ps, modalVisible: false, showPropActions: false });
        this.updatePlayerStatus();
        util.showToast('下一次掷骰将反向移动！', 'success');
        this._reverseNextMove = true;
        this.updateUI();
        return;
        
      case 'doubleDice':
        ps[this.data.currentPlayerIndex] = propsData.removeItem(p, itemId);
        this.setData({ players: ps, modalVisible: false, showPropActions: false });
        this.updatePlayerStatus();
        util.showToast('下一次掷骰步数翻倍！', 'success');
        this._doubleNextMove = true;
        this.updateUI();
        return;
        
      case 'rentShield':
        ps[this.data.currentPlayerIndex] = propsData.removeItem(p, itemId);
        this.setData({ players: ps, modalVisible: false, showPropActions: false });
        this.updatePlayerStatus();
        util.showToast('租金盾牌已激活！本次免缴租金', 'success');
        this._rentShieldActive = true;
        this.updateUI();
        return;
        
      case 'teleport':
        ps[this.data.currentPlayerIndex] = propsData.removeItem(p, itemId);
        this.setData({ players: ps, modalVisible: false, showPropActions: false });
        this.updatePlayerStatus();
        this.showTeleportTargets();
        return;
        
      case 'luckyCharm':
        ps[this.data.currentPlayerIndex] = propsData.removeItem(p, itemId);
        this.setData({ players: ps, modalVisible: false, showPropActions: false });
        this.updatePlayerStatus();
        util.showToast('幸运符已激活！下次机会卡奖励翻倍', 'success');
        this._luckyCharmActive = true;
        this.updateUI();
        return;
        
      default:
        util.showToast('未知道具', 'none');
        return;
    }
  },
  
  showTeleportTargets() {
    this.setData({
      modalVisible: true,
      modalTitle: '传送卡 - 点击目标格子',
      modalContent: '请点击棋盘上的格子进行传送',
      modalShowConfirm: false,
      modalShowCancel: true,
      modalCancelText: '取消',
      modalCallbackCancel: () => { this.setData({ modalVisible: false, teleportMode: false }); this.updateUI(); },
      teleportMode: true
    });
  },
  
  onCellTeleport(e) {
    if (!this.data.teleportMode) return;
    const targetId = parseInt(e.currentTarget.dataset.cellId);
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p) return;
    
    const ps = [...this.data.players];
    ps[this.data.currentPlayerIndex] = { ...p, position: targetId };
    
    this.setData({
      players: ps,
      modalVisible: false,
      teleportMode: false
    });
    this.updatePlayerStatus();
    this.setupBoard();
    util.showToast('已传送到 ' + BOARD_CELLS[targetId].name, 'success');
    this.handleLanding(this.data.currentPlayerIndex);
    this.updateUI();
  },

  // ===== 银行购买道具 =====
  onBuyProp() {
    const itemList = propsData.ITEM_LIST;
    
    let ct = '选择要购买的道具：';
    
    this.setData({
      modalVisible: true,
      modalTitle: '道具商店',
      modalContent: ct,
      modalShowConfirm: false,
      modalShowCancel: true,
      modalCancelText: '关闭',
      modalCallbackCancel: () => { this.setData({ modalVisible: false }); this.updateUI(); },
      showBuyPropActions: true,
      buyPropItems: itemList
    });
  },
  
  onBuyPropItem(e) {
    const itemId = e.currentTarget.dataset.itemId;
    const p = this.data.players[this.data.currentPlayerIndex];
    if (!p || p.isBankrupt) return;
    
    const result = propsData.buyItem(p, itemId);
    if (!result.success) {
      util.showToast(result.reason, 'none');
      return;
    }
    
    const ps = [...this.data.players];
    ps[this.data.currentPlayerIndex] = result.player;
    this.setData({ players: ps, modalVisible: false, showBuyPropActions: false });
    this.showFloatingText('-' + propsData.ITEMS[itemId].price, '#FF6B6B');
    util.showToast('获得 ' + propsData.ITEMS[itemId].name + '！', 'success');
    this.updatePlayerStatus();
    this.updateUI();
  },
  
  handleGameEnd(winner) {
    const tp = this.data.players.length;
    const tr = this.data.round;
    const tprop = (winner.properties || []).length;
    const nw = calculatePlayerNetWorth(winner, this.data.propertyOwners, this.data.propertyLevels);
    
    wx.redirectTo({
      url: '/pages/gameover/gameover?winner=' + encodeURIComponent(winner.displayName) +
        '&winnerAvatar=' + encodeURIComponent(winner.avatar || '🏆') +
        '&money=' + winner.money +
        '&totalPlayers=' + tp +
        '&totalRounds=' + tr +
        '&totalProperties=' + tprop +
        '&netWorth=' + nw
    });
  },
  
  showFloatingText(text, color) {
    const id = Date.now() + Math.random();
    const fts = [...this.data.floatingTexts, { id, text, color }];
    this.setData({ floatingTexts: fts });
    setTimeout(() => {
      const u = this.data.floatingTexts.filter(ft => ft.id !== id);
      this.setData({ floatingTexts: u });
    }, 1500);
  },

  // ===== 格子点击 / Modal / 菜单 / 存档 =====
  onCellTap(e) {
    const cid = parseInt(e.currentTarget.dataset.cellId);
    const cell = BOARD_CELLS[cid];
    if (!cell) return;
    
    let info = (cell.icon || '') + ' ' + cell.name + '\n';
    if (cell.type === 'property') {
      info += '价格: ' + cell.price + ' 元\n租金: ' + cell.baseRent + ' 元';
      const o = this.data.propertyOwners[cid];
      if (o !== undefined) {
        const op = this.data.players[o];
        info += '\n所有者: ' + (op ? op.displayName : '未知');
        info += '\n等级: Lv.' + (this.data.propertyLevels[cid] || 1);
      } else {
        info += '\n状态: 可购买';
      }
    } else if (cell.type === 'tax') {
      info += '金额: ' + cell.amount + ' 元';
    }
    
    this.setData({
      modalVisible: true,
      modalTitle: '📍 ' + cell.name,
      modalContent: info,
      modalShowConfirm: true,
      modalShowCancel: false,
      modalConfirmText: '关闭',
      modalCallback: () => { this.setData({ modalVisible: false }); }
    });
  },
  
  onModalConfirm() {
    if (this.data.modalCallback) {
      const cb = this.data.modalCallback;
      this.setData({ modalCallback: null });
      cb();
    } else if (this._bankCallback) {
      const cb = this._bankCallback;
      this._bankCallback = null;
      cb();
    } else {
      this.setData({ modalVisible: false });
    }
  },
  
  onModalCancel() {
    if (this.data.modalCallbackCancel) {
      const cb = this.data.modalCallbackCancel;
      this.setData({ modalCallbackCancel: null });
      cb();
    } else if (this._bankCancelCallback) {
      const cb = this._bankCancelCallback;
      this._bankCancelCallback = null;
      cb();
    } else {
      this.setData({ modalVisible: false });
    }
  },
  
  onMenu() { this.setData({ menuVisible: true }); },
  onCloseMenu() { this.setData({ menuVisible: false }); },
  stopPropagation() {},
  
  onSaveGame() {
    const state = {
      players: this.data.players,
      currentPlayerIndex: this.data.currentPlayerIndex,
      round: this.data.round,
      propertyLevels: this.data.propertyLevels,
      propertyOwners: this.data.propertyOwners,
      chanceDeck: this.data.chanceDeck,
      fortuneDeck: this.data.fortuneDeck,
      usedChanceCards: this.data.usedChanceCards,
      usedFortuneCards: this.data.usedFortuneCards
    };
    
    const ok = storage.saveGameState(state);
    this.setData({ menuVisible: false });
    util.showToast(ok ? '游戏已保存' : '保存失败', ok ? 'success' : 'none');
  },
  
  onLoadGame() {
    this.setData({ menuVisible: false });
    const sd = storage.loadGameState();
    
    if (sd && sd.state) {
      wx.showModal({
        title: '读取存档',
        content: '确定要读取存档吗？当前游戏进度将会丢失。',
        success: (res) => {
          if (res.confirm) {
            this.restoreGameState(sd.state);
            util.showToast('存档读取成功', 'success');
          }
        }
      });
    } else {
      util.showToast('无存档可读取', 'none');
    }
  },
  
  onRules() {
    this.setData({ menuVisible: false });
    wx.navigateTo({ url: '/pages/rules/rules' });
  },
  
  onQuitGame() {
    this.setData({ menuVisible: false });
    wx.showModal({
      title: '退出游戏',
      content: '确定退出游戏吗？未保存的进度将丢失。',
      success: (res) => {
        if (res.confirm) wx.redirectTo({ url: '/pages/index/index' });
      }
    });
  },
});
