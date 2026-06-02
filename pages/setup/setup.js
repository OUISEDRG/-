const { ROLES, DEFAULT_INITIAL_MONEY } = require('../../utils/game-data');
const storage = require('../../utils/storage');

Page({
  data: {
    playerCount: 2,
    initialMoney: DEFAULT_INITIAL_MONEY,
    roles: [],
    selectedRoles: [],
    selectedCount: 0,
    swiperCurrent: 0,
    aiPlayers: [],
    aiDifficulty: 'normal',
    showAiConfig: false,
  },

  onLoad() {
    this.initRoles();
  },

  initRoles() {
    const roles = ROLES.map(r => ({
      ...r,
      selected: false,
      disabled: false
    }));
    this.setData({ roles });
  },

  onSelectPlayerCount(e) {
    const count = parseInt(e.currentTarget.dataset.count);
    this.setData({
      playerCount: count,
      selectedRoles: [],
      selectedCount: 0,
      swiperCurrent: 0,
    });
    this.resetRoles();
  },

  onMoneyChange(e) {
    const money = parseInt(e.detail.value);
    this.setData({ initialMoney: money });
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current });
  },

  onSelectRole(e) {
    const roleId = parseInt(e.currentTarget.dataset.role);
    const { roles, selectedRoles, playerCount, selectedCount } = this.data;

    const roleIndex = roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) return;

    if (roles[roleIndex].selected) {
      return;
    }

    if (roles[roleIndex].disabled) {
      return;
    }

    if (selectedCount >= playerCount) {
      wx.showToast({ title: '已选满角色', icon: 'none' });
      return;
    }

    const role = ROLES.find(r => r.id === roleId);
    const newRoles = [...roles];
    newRoles[roleIndex] = { ...newRoles[roleIndex], selected: true };

    const newSelected = [...selectedRoles, {
      ...role,
      displayName: role.name,
      roleId: role.id
    }];

    const newCount = newSelected.length;
    this.updateDisabledRoles(newRoles, newCount);
    this.setData({
      roles: newRoles,
      selectedRoles: newSelected,
      selectedCount: newCount
    });
  },

  onRemoveRole(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const { selectedRoles, roles } = this.data;

    const removedRole = selectedRoles[index];
    const newSelected = selectedRoles.filter((_, i) => i !== index);

    const newRoles = roles.map(r => {
      if (r.id === removedRole.roleId) {
        return { ...r, selected: false };
      }
      return r;
    });

    const newCount = newSelected.length;
    this.updateDisabledRoles(newRoles, newCount);
    this.setData({
      roles: newRoles,
      selectedRoles: newSelected,
      selectedCount: newCount
    });
  },

  updateDisabledRoles(roles, selectedCount) {
    const selectedIds = roles.filter(r => r.selected).map(r => r.id);
    roles.forEach((r, i) => {
      roles[i] = {
        ...r,
        disabled: !r.selected && selectedIds.includes(r.id)
      };
    });
  },

  resetRoles() {
    const roles = ROLES.map(r => ({
      ...r,
      selected: false,
      disabled: false
    }));
    this.setData({ roles });
  },

  onToggleAI(e) {
    const playerIndex = parseInt(e.currentTarget.dataset.index);
    let aiPlayers = [...this.data.aiPlayers];
    if (aiPlayers.includes(playerIndex)) {
      aiPlayers = aiPlayers.filter(i => i !== playerIndex);
    } else {
      aiPlayers.push(playerIndex);
    }
    this.setData({ aiPlayers });
  },

  onAiDifficulty(e) {
    this.setData({ aiDifficulty: e.currentTarget.dataset.level });
  },

  onStartGame() {
    const { selectedRoles, playerCount, initialMoney } = this.data;

    if (selectedRoles.length !== playerCount) {
      wx.showToast({ title: '请选择完所有角色', icon: 'none' });
      return;
    }

    const config = {
      players: selectedRoles.map((r, index) => ({
        name: `玩家${index + 1} (${r.name})`,
        role: r,
      })),
      playerCount,
      initialMoney,
      aiPlayers: (this.data.aiPlayers || []),
      aiDifficulty: this.data.aiDifficulty || 'normal',
    };

    storage.saveGameConfig(config);

    wx.redirectTo({
      url: '/pages/game/game'
    });
  }
});
