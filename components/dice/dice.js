const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

Component({
  properties: {
    disabled: { type: Boolean, value: false },
  },

  data: {
    displayValue1: '⚀',  // 修复：改用两颗骰子
    displayValue2: '⚁',  // 修复：第二颗骰子
    animating: false
  },

  methods: {
    onRoll() {
      if (this.data.disabled || this.data.animating) return;
      this.setData({ animating: true });

      let count = 0;
      const maxCount = 10;
      const interval = setInterval(() => {
        const v1 = Math.floor(Math.random() * 6) + 1;
        const v2 = Math.floor(Math.random() * 6) + 1;
        this.setData({ displayValue1: DICE_FACES[v1 - 1], displayValue2: DICE_FACES[v2 - 1] });
        count++;
        if (count >= maxCount) {
          clearInterval(interval);
          const final1 = Math.floor(Math.random() * 6) + 1;
          const final2 = Math.floor(Math.random() * 6) + 1;
          const total = final1 + final2; // 修复：两颗骰子之和 2-12
          this.setData({ displayValue1: DICE_FACES[final1 - 1], displayValue2: DICE_FACES[final2 - 1], animating: false });
          this.triggerEvent('rollend', { value: total, dice1: final1, dice2: final2 });
        }
      }, 80);
    },
  },

  lifetimes: {
    attached() {}
  }
});
