const { BOARD_CELLS, BOARD_SIZE, ROLES, createInitialDeck, createPlayers, calculatePlayerNetWorth, getRentForLevel } = require('../../utils/game-data');
const storage = require('../../utils/storage');
const util = require('../../utils/util');

Page({
  data: {
    boardCells: [],
    players: [],
    currentPlayerIndex: 0,
    currentPlayerName: '',
    round: 1,
    boardSize: 0,
    cellSize: 0,
    centerSize: 0,
    diceDisabled: false,
    showBuyBtn: false,
    showBuildBtn: false,
    showBankBtn: false,
    showPropsBtn: false,
    showEndTurnBtn: false,
    modalVisible: false,
    modalTitle: '',
    modalContent: '',
    modalShowConfirm: false,
    modalShowCancel: false,
    modalConfirmText: '确定',
    modalCancelText: '取消',
    menuVisible: false,
    propertyLevels: {},
    propertyOwners: {},
    chanceDeck: [],
    fortuneDeck: [],
    gameStarted: false,
  },

  onLoad(options) {
    const isLoadSave = options && options.loadSave === 'true';
    this.initGame(isLoadSave);
  },

  initGame(isLoadSave) {
    if (isLoadSave) {
      const savedData = storage.loadGameState();
      if (savedData && savedData.state) {
        this.restoreGameState(savedData.state);
        return;
      }
    }

    const config = storage.loadGameConfig();
    if (!config) {
      wx.redirectTo({ url: '/pages/setup/setup' });
      return;
    }

    const players = createPlayers(config);
    const playerData = this.formatPlayers(players, config);
    const gameState = {
      players: playerData,
      currentPlayerIndex: 0,
      round: 1,
      propertyLevels: {},
      propertyOwners: {},
      chanceDeck: createInitialDeck('chance'),
      fortuneDeck: createInitialDeck('fortune'),
      usedChanceCards: [],
      usedFortuneCards: [],
    };

    this.setGameState(gameState);
    this.setupBoard();
    this.updateUI();
    this.showTurnStartModal();
  },

  formatPlayers(players, config) {
    return players.map((p, index) => {
      const configPlayer = config && config.players ? config.players[index] : null;
      const role = configPlayer ? configPlayer.role : ROLES[0];
      return {
        ...p,
        displayName: configPlayer ? configPlayer.name : p.name,
        avatar: role.avatar || '😊',
        bgColor: role.bgColor || '#F5F5F5',
        roleColor: role.color || '#333',
        displayMoney: util.formatMoney(p.money),
        isCurrent: index === 0,
        propertiesCount: 0,
        properties: [],
        isBankrupt: false,
        inJail: false,
        jailTurns: 0,
        skipNextTurn: false,
        doubleRentTurns: 0,
      };
    });
  },

  setGameState(state) {
    this.setData({
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      round: state.round || 1,
      propertyLevels: state.propertyLevels || {},
      propertyOwners: state.propertyOwners || {},
      chanceDeck: state.chanceDeck || createInitialDeck('chance'),
      fortuneDeck: state.fortuneDeck || createInitialDeck('fortune'),
      usedChanceCards: state.usedChanceCards || [],
      usedFortuneCards: state.usedFortuneCards || [],
    });
  },

  restoreGameState(savedState) {
    this.setGameState(savedState);
    this.setupBoard();
    this.updateUI();
    this.updatePlayerStatus();
    this.setData({ gameStarted: true });
  },

  setupBoard() {
    const sysInfo = wx.getSystemInfoSync();
    const maxWidth = sysInfo.windowWidth - 32;
    const maxHeight = sysInfo.windowHeight * 0.48;
    const boardSize = Math.min(maxWidth, maxHeight, 360);
    const cellSize = boardSize / BOARD_SIZE;
    const centerSize = boardSize - cellSize * 2;

    const cells = BOARD_CELLS.map(cell => {
      const pos = this.getCellPixelPosition(cell.id, cellSize);
      const ownerData = this.getOwnerData(cell.id);
      const level = this.getCellLevel(cell.id);
      const players = this.getPlayersOnCell(cell.id);

      return {
        ...cell,
        x: pos.x,
        y: pos.y,
        bgColor: this.getCellBgColor(cell, ownerData),
        shortName: cell.name.length > 3 ? cell.name.substring(0, 2) : cell.name,
        displayPrice: cell.price ? (cell.price / 1000).toFixed(0) + 'k' : '',
        players: players,
        level: level,
        ownerColor: ownerData ? ownerData.color : '',
        ownerBorder: ownerData ? ownerData.color : '',
      };
    });

    this.setData({
      boardCells: cells,
      boardSize: boardSize,
      cellSize: cellSize,
      centerSize: centerSize,
    });
  },

  getCellPixelPosition(cellId, cellSize) {
    const size = BOARD_SIZE;
    if (cellId < size) {
      return { x: cellId * cellSize, y: (size - 1) * cellSize };
    }
    if (cellId < 2 * size - 1) {
      return { x: (size - 1) * cellSize, y: (size - 1 - (cellId - size + 1)) * cellSize };
    }
    if (cellId < 3 * size - 2) {
      return { x: (size - 1 - (cellId - 2 * size + 2)) * cellSize, y: 0 };
    }
    const offset = cellId - 3 * size + 3;
    return { x: 0, y: offset * cellSize };
  },

  getCellBgColor(cell, ownerData) {
    if (cell.type === 'property') {
      return ownerData ? (ownerData.bgColor || '#FFF') : '#FFFFFF';
    }
    return '';
  },

  getOwnerData(cellId) {
    const owner = this.data.propertyOwners[cellId];
    if (owner !== undefined) {
      const player = this.data.players[owner];
      if (player && !player.isBankrupt) {
        return { color: player.roleColor, bgColor: player.bgColor };
      }
    }
    return null;
  },

  getCellLevel(cellId) {
    return this.data.propertyLevels[cellId] || 0;
  },

  getPlayersOnCell(cellId) {
    return this.data.players
      .filter(p => !p.isBankrupt && p.position === cellId)
      .map(p => p.avatar);
  },

  updateUI() {
    const player = this.data.players[this.data.currentPlayerIndex];
    if (!player) return;

    const currentCell = BOARD_CELLS[player.position];
    const isProperty = currentCell && currentCell.type === 'property';
    const cellOwner = this.data.propertyOwners[player.position];

    let showBuyBtn = false;
    let showBuildBtn = false;

    if (isProperty && !player.isBankrupt) {
      if (cellOwner === undefined) {
        if (player.money >= currentCell.price) {
          showBuyBtn = true;
        }
      } else if (cellOwner === player.id) {
        const level = this.data.propertyLevels[player.position] || 0;
        if (level < 3 && player.money >= currentCell.buildCost) {
          showBuildBtn = true;
        }
      }
    }

    this.setData({
      showBuyBtn: showBuyBtn,
      showBuildBtn: showBuildBtn,
      showBankBtn: !player.isBankrupt,
      showPropsBtn: !player.isBankrupt,
      showEndTurnBtn: true,
      currentPlayerName: player.displayName,
    });
  },

  updatePlayerStatus() {
    const players = this.data.players.map((p, index) => ({
      ...p,
      displayMoney: util.formatMoney(p.money),
      isCurrent: index === this.data.currentPlayerIndex && !p.isBankrupt,
      propertiesCount: (p.properties && p.properties.length) || 0,
    }));
    this.setData({ players });
  },

  onDiceRollEnd(e) {
    const diceValue = e.detail.value;
    const playerIndex = this.data.currentPlayerIndex;
    const player = this.data.players[playerIndex];
    if (!player || player.isBankrupt) return;

    this.setData({ diceDisabled: true, showBuyBtn: false, showBuildBtn: false });
    this.movePlayer(playerIndex, diceValue);
  },

  movePlayer(playerIndex, steps) {
    const player = this.data.players[playerIndex];
    const oldPos = player.position;
    const newPos = (oldPos + steps) % BOARD_CELLS.length;
    const passedStart = newPos < oldPos || (oldPos + steps >= BOARD_CELLS.length);

    const players = [...this.data.players];
    players[playerIndex] = { ...player, position: newPos };
    this.setData({ players });
    this.setupBoard();
    this.updatePlayerStatus();

    if (passedStart && newPos !== 0) {
      players[playerIndex] = { ...players[playerIndex], money: players[playerIndex].money + 2000 };
      this.setData({ players });
      util.showToast('经过起点，获得 2000 元', 'success');
    }

    setTimeout(() => {
      this.handleLanding(playerIndex);
    }, 500);
  },

  handleLanding(playerIndex) {
    const player = this.data.players[playerIndex];
    if (!player || player.isBankrupt) return;

    const cell = BOARD_CELLS[player.position];
    if (!cell) return;

    switch (cell.type) {
      case 'property':
        this.handlePropertyLand(playerIndex, cell);
        break;
      case 'chance':
        this.handleCardDraw(playerIndex, 'chance');
        break;
      case 'fortune':
        this.handleCardDraw(playerIndex, 'fortune');
        break;
      case 'tax':
        this.handleTax(playerIndex, cell);
        break;
      case 'start':
        util.showToast('到达起点，休息一下', 'success');
        this.updateUI();
        break;
      case 'corner':
        this.handleCorner(playerIndex, cell);
        break;
      default:
        this.updateUI();
    }
  },

  handlePropertyLand(playerIndex, cell) {
    const owner = this.data.propertyOwners[cell.id];
    if (owner === undefined) {
      this.updateUI();
    } else if (owner !== playerIndex) {
      const ownerPlayer = this.data.players[owner];
      if (ownerPlayer && !ownerPlayer.isBankrupt) {
        const level = this.data.propertyLevels[cell.id] || 1;
        let rent = getRentForLevel(cell, level);
        if (ownerPlayer.doubleRentTurns > 0) {
          rent *= 2;
        }
        this.payRent(playerIndex, owner, cell, rent);
      } else {
        this.updateUI();
      }
    } else {
      this.updateUI();
    }
  },

  payRent(playerIndex, ownerIndex, cell, rent) {
    const players = [...this.data.players];
    const player = players[playerIndex];
    const owner = players[ownerIndex];

    if (!player || !owner) return;

    const actualRent = Math.min(rent, player.money);
    players[playerIndex] = { ...player, money: player.money - actualRent };
    players[ownerIndex] = { ...owner, money: owner.money + actualRent };
    this.setData({ players });
    this.updatePlayerStatus();

    util.showToast(`${cell.name}过路费 ${actualRent} 元`, 'none');

    setTimeout(() => {
      this.checkPlayerBankruptcy(playerIndex);
    }, 500);
  },

  handleCardDraw(playerIndex, type) {
    const deckKey = type === 'chance' ? 'chanceDeck' : 'fortuneDeck';
    const usedKey = type === 'chance' ? 'usedChanceCards' : 'usedFortuneCards';
    let deck = [...this.data[deckKey]];
    let used = [...this.data[usedKey]];

    if (deck.length === 0) {
      deck = createInitialDeck(type);
      used = [];
    }

    const card = deck.pop();
    used.push(card);

    const updateData = {};
    updateData[deckKey] = deck;
    updateData[usedKey] = used;
    this.setData(updateData);

    this.showCardModal(type, card, playerIndex);
  },

  showCardModal(type, card, playerIndex) {
    const typeName = type === 'chance' ? '机会卡' : '命运卡';
    const typeIcon = type === 'chance' ? '❓' : '⭐';

    this.setData({
      modalVisible: true,
      modalTitle: `${typeIcon} ${typeName}`,
      modalContent: `「${card.text}」`,
      modalShowConfirm: true,
      modalShowCancel: false,
      modalConfirmText: '确定',
      modalCancelText: '',
      modalCallback: () => {
        this.executeCardAction(card, playerIndex);
      }
    });
  },

  executeCardAction(card, playerIndex) {
    const players = [...this.data.players];
    const player = { ...players[playerIndex] };

    switch (card.action) {
      case 'addMoney':
        player.money += card.value;
        util.showToast(`+${card.value} 元`, 'success');
        break;
      case 'subtractMoney':
        player.money -= card.value;
        util.showToast(`-${card.value} 元`, 'none');
        break;
      case 'moveForward':
        players[playerIndex] = player;
        this.setData({ players });
        this.movePlayer(playerIndex, card.value);
        return;
      case 'moveBackward':
        players[playerIndex] = player;
        this.setData({ players });
        this.movePlayerBackward(playerIndex, card.value);
        return;
      case 'gotoStart':
        player.money += 2000;
        player.position = 0;
        util.showToast('回到起点，获得 2000 元', 'success');
        break;
      case 'doubleRent':
        player.doubleRentTurns = 2;
        util.showToast('租金翻倍已生效', 'success');
        break;
    }

    players[playerIndex] = player;
    this.setData({ players });
    this.updatePlayerStatus();
    this.setupBoard();

    setTimeout(() => {
      this.checkPlayerBankruptcy(playerIndex);
    }, 300);
  },

  movePlayerBackward(playerIndex, steps) {
    const players = [...this.data.players];
    const player = players[playerIndex];
    let newPos = player.position - steps;
    if (newPos < 0) {
      newPos = BOARD_CELLS.length + newPos;
    }
    players[playerIndex] = { ...player, position: newPos };
    this.setData({ players });
    this.setupBoard();
    this.updatePlayerStatus();

    setTimeout(() => {
      this.handleLanding(playerIndex);
    }, 500);
  },

  handleTax(playerIndex, cell) {
    const players = [...this.data.players];
    const player = players[playerIndex];
    const amount = cell.amount || 500;
    players[playerIndex] = { ...player, money: player.money - amount };
    this.setData({ players });
    this.updatePlayerStatus();

    util.showToast(`缴税 ${amount} 元`, 'none');

    setTimeout(() => {
      this.checkPlayerBankruptcy(playerIndex);
    }, 500);
  },

  handleCorner(playerIndex, cell) {
    if (cell.name === '监狱') {
      util.showToast('免费参观监狱', 'none');
    } else if (cell.name === '免费停车') {
      util.showToast('免费停车，休息一下', 'success');
    } else {
      util.showToast(`到达${cell.name}`, 'none');
    }
    this.updateUI();
  },

  onBuyProperty() {
    const player = this.data.players[this.data.currentPlayerIndex];
    if (!player) return;

    const cell = BOARD_CELLS[player.position];
    if (!cell || cell.type !== 'property') return;

    if (player.money < cell.price) {
      util.showToast('资金不足', 'none');
      return;
    }

    const cellId = cell.id;
    const players = [...this.data.players];
    players[this.data.currentPlayerIndex] = {
      ...player,
      money: player.money - cell.price,
      properties: [...(player.properties || []), cellId]
    };

    const propertyOwners = { ...this.data.propertyOwners, [cellId]: this.data.currentPlayerIndex };
    const propertyLevels = { ...this.data.propertyLevels, [cellId]: 1 };

    this.setData({
      players,
      propertyOwners,
      propertyLevels
    });

    util.showToast(`成功购买 ${cell.name}！`, 'success');
    this.updatePlayerStatus();
    this.setupBoard();
    this.updateUI();
  },

  onBuildHouse() {
    const player = this.data.players[this.data.currentPlayerIndex];
    if (!player) return;

    const cell = BOARD_CELLS[player.position];
    if (!cell || cell.type !== 'property') return;

    const level = this.data.propertyLevels[player.position] || 1;
    if (level >= 4) {
      util.showToast('已满级，无法再升级', 'none');
      return;
    }

    if (player.money < cell.buildCost) {
      util.showToast('资金不足', 'none');
      return;
    }

    const newLevel = level + 1;
    const players = [...this.data.players];
    players[this.data.currentPlayerIndex] = {
      ...player,
      money: player.money - cell.buildCost
    };

    const propertyLevels = { ...this.data.propertyLevels, [player.position]: newLevel };

    this.setData({ players, propertyLevels });
    util.showToast(`升级成功！${cell.name} 等级 ${newLevel}`, 'success');
    this.updatePlayerStatus();
    this.setupBoard();
    this.updateUI();
  },

  onBank() {
    const player = this.data.players[this.data.currentPlayerIndex];
    if (!player) return;

    const content = `当前资金: ${util.formatMoney(player.money)} 元\n${
      player.hasLoan ? `已有贷款: ${util.formatMoney(player.loanAmount)} 元` : '当前无贷款'
    }`;

    this.setData({
      modalVisible: true,
      modalTitle: '🏦 银行',
      modalContent: content,
      modalShowConfirm: true,
      modalShowCancel: true,
      modalConfirmText: player.hasLoan ? '还款' : '贷款',
      modalCancelText: '关闭',
      modalCallback: null,
      modalCallbackCancel: null,
    });

    this._bankCallback = () => {
      if (player.hasLoan) {
        this.repayLoan();
      } else {
        this.takeLoan();
      }
    };
    this._bankCancelCallback = () => {
      this.setData({ modalVisible: false });
      this.updateUI();
    };
  },

  takeLoan() {
    const players = [...this.data.players];
    const player = players[this.data.currentPlayerIndex];
    const loanAmount = 5000;
    const interest = 500;

    players[this.data.currentPlayerIndex] = {
      ...player,
      money: player.money + loanAmount,
      hasLoan: true,
      loanAmount: loanAmount,
      loanInterest: interest,
    };

    this.setData({
      players,
      modalVisible: false,
    });

    util.showToast(`贷款 ${loanAmount} 元成功`, 'success');
    this.updatePlayerStatus();
    this.updateUI();
  },

  repayLoan() {
    const players = [...this.data.players];
    const player = players[this.data.currentPlayerIndex];
    const totalRepay = player.loanAmount + player.loanInterest;

    if (player.money < totalRepay) {
      util.showToast('资金不足，无法还款', 'none');
      return;
    }

    players[this.data.currentPlayerIndex] = {
      ...player,
      money: player.money - totalRepay,
      hasLoan: false,
      loanAmount: 0,
      loanInterest: 0,
    };

    this.setData({
      players,
      modalVisible: false,
    });

    util.showToast(`还款成功，共 ${totalRepay} 元`, 'success');
    this.updatePlayerStatus();
    this.updateUI();
  },

  onViewProps() {
    const player = this.data.players[this.data.currentPlayerIndex];
    if (!player) return;

    const props = (player.properties || []).map(propId => {
      const cell = BOARD_CELLS.find(c => c.id === propId);
      const level = this.data.propertyLevels[propId] || 1;
      return cell ? `${cell.name} (Lv.${level})` : '';
    }).filter(Boolean);

    const content = props.length > 0
      ? `🏠 地产 (${props.length}处):\n${props.join('\n')}\n\n💰 资金: ${util.formatMoney(player.money)}`
      : `暂无地产\n\n💰 资金: ${util.formatMoney(player.money)}`;

    if (player.hasLoan) {
      this.setData({
        modalContent: content + `\n💳 贷款: ${util.formatMoney(player.loanAmount)}`,
        modalVisible: true,
        modalTitle: '📋 我的资产',
        modalShowConfirm: true,
        modalShowCancel: false,
        modalConfirmText: '关闭',
        modalCallback: () => {
          this.setData({ modalVisible: false });
          this.updateUI();
        },
      });
    } else {
      this.setData({
        modalContent: content,
        modalVisible: true,
        modalTitle: '📋 我的资产',
        modalShowConfirm: true,
        modalShowCancel: false,
        modalConfirmText: '关闭',
        modalCallback: () => {
          this.setData({ modalVisible: false });
          this.updateUI();
        },
      });
    }
  },

  onEndTurn() {
    const players = [...this.data.players];
    let currentIndex = this.data.currentPlayerIndex;
    let nextIndex = (currentIndex + 1) % players.length;
    let rounds = this.data.round;

    if (players[currentIndex] && !players[currentIndex].isBankrupt) {
      if (players[currentIndex].doubleRentTurns > 0) {
        players[currentIndex].doubleRentTurns -= 1;
      }
    }

    let attempts = 0;
    while (players[nextIndex].isBankrupt && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }

    if (nextIndex <= currentIndex && !players[nextIndex].isBankrupt) {
      rounds += 1;
    }

    this.setData({
      players,
      currentPlayerIndex: nextIndex,
      round: rounds,
      showBuyBtn: false,
      showBuildBtn: false,
      showBankBtn: false,
      showPropsBtn: false,
      showEndTurnBtn: false,
    });

    this.updatePlayerStatus();
    this.showTurnStartModal();
  },

  showTurnStartModal() {
    const player = this.data.players[this.data.currentPlayerIndex];
    if (!player || player.isBankrupt) {
      this.advanceToNextNonBankrupt();
      return;
    }

    const activePlayers = this.data.players.filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1) {
      this.handleGameEnd(activePlayers[0]);
      return;
    }

    this.setData({
      diceDisabled: false,
      modalVisible: true,
      modalTitle: `${player.avatar} ${player.displayName}`,
      modalContent: `轮到你了！\n当前资金: ${util.formatMoney(player.money)} 元`,
      modalShowConfirm: true,
      modalShowCancel: false,
      modalConfirmText: '开始回合',
      modalCallback: () => {
        this.setData({ modalVisible: false });
        this.updateUI();
      },
    });
  },

  advanceToNextNonBankrupt() {
    const players = [...this.data.players];
    let index = this.data.currentPlayerIndex;
    let attempts = 0;

    do {
      index = (index + 1) % players.length;
      attempts++;
    } while (players[index].isBankrupt && attempts < players.length);

    if (attempts >= players.length || players.filter(p => !p.isBankrupt).length <= 1) {
      const winner = players.find(p => !p.isBankrupt);
      this.handleGameEnd(winner);
      return;
    }

    this.setData({ currentPlayerIndex: index });
    this.updatePlayerStatus();
    this.showTurnStartModal();
  },

  checkPlayerBankruptcy(playerIndex) {
    const player = this.data.players[playerIndex];
    if (!player) return;

    if (player.money >= 0) return;

    let currentMoney = player.money;
    let properties = [...(player.properties || [])];
    const propertyOwners = { ...this.data.propertyOwners };
    const propertyLevels = { ...this.data.propertyLevels };

    while (currentMoney < 0 && properties.length > 0) {
      const propToSell = properties.pop();
      currentMoney += 500;
      delete propertyOwners[propToSell];
      delete propertyLevels[propToSell];
    }

    if (currentMoney < 0) {
      this.handleBankruptcy(playerIndex);
    } else {
      const players = [...this.data.players];
      players[playerIndex] = { ...player, money: currentMoney, properties };
      this.setData({ players, propertyOwners, propertyLevels });
      this.setupBoard();
      this.updatePlayerStatus();
      util.showToast('因资金为负，已自动变卖房产抵债', 'none');
    }
  },

  handleBankruptcy(playerIndex) {
    const players = [...this.data.players];
    players[playerIndex] = {
      ...players[playerIndex],
      isBankrupt: true,
      properties: [],
      hasLoan: false,
      loanAmount: 0,
      loanInterest: 0,
    };

    const propertyOwners = { ...this.data.propertyOwners };
    Object.keys(propertyOwners).forEach(key => {
      if (propertyOwners[key] === playerIndex) {
        delete propertyOwners[key];
      }
    });

    const propertyLevels = { ...this.data.propertyLevels };
    Object.keys(propertyLevels).forEach(key => {
      if (propertyOwners[key] === undefined) {
        delete propertyLevels[key];
      }
    });

    this.setData({ players, propertyOwners, propertyLevels });
    this.setupBoard();
    this.updatePlayerStatus();

    const activePlayers = players.filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1) {
      this.handleGameEnd(activePlayers[0]);
    } else {
      util.showToast(`${players[playerIndex].displayName} 破产了！`, 'none');
    }
  },

  handleGameEnd(winner) {
    wx.redirectTo({
      url: `/pages/gameover/gameover?winner=${encodeURIComponent(winner.displayName)}&winnerAvatar=${encodeURIComponent(winner.avatar)}&money=${winner.money}&totalPlayers=${this.data.players.length}`,
    });
  },

  onCellTap(e) {
    const cellId = parseInt(e.currentTarget.dataset.cellId);
    const cell = BOARD_CELLS[cellId];
    if (!cell) return;

    let info = `${cell.icon} ${cell.name}\n`;
    if (cell.type === 'property') {
      info += `价格: ${cell.price} 元\n租金: ${cell.baseRent} 元`;
      const owner = this.data.propertyOwners[cellId];
      if (owner !== undefined) {
        const ownerPlayer = this.data.players[owner];
        info += `\n所有者: ${ownerPlayer ? ownerPlayer.displayName : '未知'}`;
        const level = this.data.propertyLevels[cellId] || 1;
        info += `\n等级: Lv.${level}`;
      } else {
        info += '\n状态: 可购买';
      }
    } else if (cell.type === 'tax') {
      info += `金额: ${cell.amount} 元`;
    }

    this.setData({
      modalVisible: true,
      modalTitle: `📍 ${cell.name}`,
      modalContent: info,
      modalShowConfirm: true,
      modalShowCancel: false,
      modalConfirmText: '关闭',
      modalCallback: () => {
        this.setData({ modalVisible: false });
      },
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

  onMenu() {
    this.setData({ menuVisible: true });
  },

  onCloseMenu() {
    this.setData({ menuVisible: false });
  },

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
      usedFortuneCards: this.data.usedFortuneCards,
    };

    const success = storage.saveGameState(state);
    this.setData({ menuVisible: false });

    if (success) {
      util.showToast('游戏已保存', 'success');
    } else {
      util.showToast('保存失败', 'none');
    }
  },

  onLoadGame() {
    this.setData({ menuVisible: false });
    const savedData = storage.loadGameState();
    if (savedData && savedData.state) {
      wx.showModal({
        title: '读取存档',
        content: '确定要读取存档吗？当前游戏进度将会丢失。',
        success: (res) => {
          if (res.confirm) {
            this.restoreGameState(savedData.state);
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
        if (res.confirm) {
          wx.redirectTo({ url: '/pages/index/index' });
        }
      }
    });
  },

  stopPropagation() {},

  onHide() {
    if (this.data.gameStarted) {
      this.onSaveGame();
    }
  },
});
