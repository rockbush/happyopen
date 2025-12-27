// Explosion.js
// 爆炸效果预制体脚本
//
// 预制体结构：
// Explosion (根节点，挂载此脚本 + Animation组件)
//
// 注意：销毁由 GameManager.playExplosion() 控制
// 此脚本只负责基本设置

cc.Class({
    extends: cc.Component,

    properties: {
    },

    onLoad() {
        // 确保节点在较高层级显示
        this.node.zIndex = 100;
    }
});