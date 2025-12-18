cc.Class({
    extends: cc.Component,

    properties: {
        // 只旋转这个节点（head）
        headNode: { default: null, type: cc.Node },

        // 角度限制（度）
        minAngle: { default: -45 },
        maxAngle: { default: 65 },

        // 跟随速度：越大越“跟手”，越小越“延迟”
        followSpeed: { default: 12 }
    },

    onLoad () {
        this._targetAngle = 0;
    },

    /**
     * 设置目标瞄准角（度）
     * 0 度朝右，上为正，下为负
     */
    setAimAngle (angleDeg) {
        angleDeg = this._clamp(angleDeg, this.minAngle, this.maxAngle);
        this._targetAngle = angleDeg;
    },

    /**
     * 松手后立刻回正（不插值）
     */
    resetAimInstant () {
        this._targetAngle = 0;
        if (this.headNode) this.headNode.rotation = 0;
    },

    update (dt) {
        if (!this.headNode) return;

        const current = this.headNode.rotation;
        const target = this._targetAngle;

        // 指数平滑：稳定、不抖、不会 overshoot
        const t = 1 - Math.exp(-this.followSpeed * dt);
        this.headNode.rotation = this._lerpAngle(current, target, t);
    },

    _lerpAngle (a, b, t) {
        // 将差值归一到 [-180, 180]，保证走最短角度
        let delta = (b - a) % 360;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        return a + delta * t;
    },

    _clamp (v, min, max) {
        return Math.max(min, Math.min(max, v));
    }
});
