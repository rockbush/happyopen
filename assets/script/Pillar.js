// Pillar.js
// 柱子预制体脚本
// 结构：
//   Pillar (根节点)
//     - top       (顶部装饰，固定大小图片)
//     - topNode   (平台，固定大小图片，用于碰撞检测)
//     - bodyNode  (柱身，slice拉伸图片)

cc.Class({
    extends: cc.Component,

    properties: {
        // 顶部装饰节点
        top: cc.Node,
        // 平台节点（碰撞检测用）
        topNode: cc.Node,
        // 柱身节点
        bodyNode: cc.Node,
        // GameManager 引用
        gameManager: null
    },

    onLoad() {
        this.pillarHeight = 200;
        this.node.zIndex = -1;
    },

    // 设置柱子高度
    setHeight(height) {
        this.pillarHeight = height;
        
        // ========== 调整柱身 bodyNode ==========
        if (this.bodyNode) {
            // 设置柱身高度
            this.bodyNode.height = height;
            // 柱身锚点在底部(0.5, 0)，所以 y = 0
            this.bodyNode.y = 0;
        }
        
        // ========== 调整平台 topNode ==========
        if (this.topNode) {
            // topNode 放在 bodyNode 顶部
            // 假设 topNode 锚点在中心(0.5, 0.5)
            this.topNode.y = height;
        }
        
        // ========== 调整顶部装饰 top ==========
        if (this.top) {
            // top 的底部对齐 topNode 的中心
            // 假设 top 锚点在底部中心(0.5, 0)
            if (this.topNode) {
                this.top.y = this.topNode.y;
            } else {
                this.top.y = height;
            }
        }
        
        // ========== 更新碰撞体（如果有的话）==========
        const collider = this.node.getComponent(cc.PhysicsBoxCollider);
        if (collider) {
            collider.size.height = height;
            collider.offset.y = height / 2;
            collider.apply();
        }
    },

    // 检查水滴是否落在柱子顶部区域
    checkIfOnTop(waterDropPos) {
        const topY = this.node.y + this.pillarHeight;
        const topThreshold = 30;
        
        const isInXRange = Math.abs(waterDropPos.x - this.node.x) < 40;
        const isInYRange = Math.abs(waterDropPos.y - topY) < topThreshold;
        
        return isInXRange && isInYRange;
    }
});