const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

Component({
  properties: {
    disabled: {
      type: Boolean,
      value: false
    },
    value: {
      type: Number,
      value: 1,
      observer: 'updateDisplay'
    }
  },

  data: {
    displayValue: '⚀',
    animating: false
  },

  methods: {
    updateDisplay(val) {
      this.setData({
        displayValue: DICE_FACES[(val || 1) - 1] || '⚀'
      });
    },

    onRoll() {
      if (this.data.disabled || this.data.animating) return;

      this.setData({ animating: true });

      let count = 0;
      const maxCount = 8;
      const interval = setInterval(() => {
        const randomVal = Math.floor(Math.random() * 6) + 1;
        this.setData({
          displayValue: DICE_FACES[randomVal - 1]
        });
        count++;
        if (count >= maxCount) {
          clearInterval(interval);
          const finalVal = Math.floor(Math.random() * 6) + 1;
          this.setData({
            displayValue: DICE_FACES[finalVal - 1],
            animating: false
          });
          this.triggerEvent('rollend', { value: finalVal });
        }
      }, 100);
    },

    setValue(val) {
      this.setData({
        displayValue: DICE_FACES[(val || 1) - 1] || '⚀'
      });
    }
  },

  lifetimes: {
    attached() {
      this.updateDisplay(this.properties.value);
    }
  }
});
