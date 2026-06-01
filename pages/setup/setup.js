const { ROLES, DEFAULT_INITIAL_MONEY } = require('../../utils/game-data');
const storage = require('../../utils/storage');

Page({
  data: {
    playerCount: 2,
    initialMoney: DEFAULT_INITIAL_MONEY,
    roles: [],
    selectedRoles: [],
    selectedCount: 0
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
      selectedCount: 0
    });
    this.resetRoles();
  },

  onSelectMoney(e) {
    const money = parseInt(e.currentTarget.dataset.money);
    this.setData({ initialMoney: money });
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
    const selectedIds = this.data.selectedRoles.map(r => r.roleId);
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
      initialMoney
    };

    storage.saveGameConfig(config);

    wx.redirectTo({
      url: '/pages/game/game'
    });
  }
});
