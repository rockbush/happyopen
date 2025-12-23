cc.Class({
  extends: cc.Component,

  properties: {
    designW: { default: 1280 },
    designH: { default: 720 }
  },

  onLoad () {
    this._onResize = this._onResize.bind(this);
    this._onResize();
    cc.view.on('resize', this._onResize);
  },

  _onResize () {
    const visible = cc.view.getVisibleSize();
    const scaleX = visible.width / this.designW;
    const scaleY = visible.height / this.designH;

    // 关键：取最大值，铺满屏幕，不留黑边（允许裁切）
    const scale = Math.max(scaleX, scaleY);

    this.node.setScale(scale);

    // 保证始终在中心（避免某些机型旋转后偏移）
    this.node.setPosition(0, 0);
  },

  onDestroy () {
    cc.view.off('resize', this._onResize);
  }
});
