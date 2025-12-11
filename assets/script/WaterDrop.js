cc.Class({
    extends: cc.Component,

    properties: {
        gameManager: null
    },

    onLoad() {
        this.hasLanded = false;
        this.hasCheckedCollision = false;
        this.isDestroying = false;
        
        // 开始检测与柱子顶部的碰撞
        this.schedule(this.checkTopCollision, 0.02);
        
        // 5秒后自动销毁（避免永远飞行）
        this.scheduleOnce(() => {
            if (!this.hasLanded && !this.isDestroying) {
                this.onMissTarget();
            }
        }, 5);
    },

    checkTopCollision() {
        if (this.hasCheckedCollision || this.isDestroying || !this.gameManager) return;
        if (!this.node || !this.node.isValid) return;
        
        // 遍历所有柱子，检查是否碰到顶部
        const pillars = this.gameManager.pillars;
        
        for (let i = 0; i < pillars.length; i++) {
            const pillar = pillars[i];
            if (!pillar || !pillar.isValid) continue;
            
            const pillarScript = pillar.getComponent('Pillar');
            if (!pillarScript || !pillarScript.topNode) continue;
            
            // 获取柱子顶部的世界坐标
            const topWorldPos = pillar.convertToWorldSpaceAR(pillarScript.topNode.position);
            const topNodePos = this.node.parent.convertToNodeSpaceAR(topWorldPos);
            
            // 检查水滴是否接触到顶部节点
            const topWidth = pillarScript.topNode.width / 2;
            const topHeight = pillarScript.topNode.height / 2;
            
            // 简单的矩形碰撞检测
            const deltaX = Math.abs(this.node.position.x - topNodePos.x);
            const deltaY = Math.abs(this.node.position.y - topNodePos.y);
            
            if (deltaX < topWidth && deltaY < topHeight + 15) {
                // 碰到柱子顶部了！
                this.onHitTarget();
                return;
            }
        }
    },

    onHitTarget() {
        if (this.isDestroying) return;
        
        this.hasCheckedCollision = true;
        this.hasLanded = true;
        this.isDestroying = true;
        this.unscheduleAllCallbacks();
        
        if (this.gameManager && this.node && this.node.isValid) {
            this.gameManager.onWaterDropLanded(true, this.node.position.clone());
        }
        
        this.scheduleOnce(() => {
            this.destroySafely();
        }, 0.5);
    },

    onMissTarget() {
        if (this.isDestroying) return;
        
        this.hasLanded = true;
        this.isDestroying = true;
        this.unscheduleAllCallbacks();
        
        if (this.gameManager && this.node && this.node.isValid) {
            this.gameManager.onWaterDropLanded(false, this.node.position.clone());
        }
        
        this.scheduleOnce(() => {
            this.destroySafely();
        }, 0.3);
    },

    destroySafely() {
        if (this.node && this.node.isValid && !cc.isValid(this.node, true)) {
            try {
                this.node.destroy();
            } catch (e) {
                console.warn('水滴销毁出错:', e);
            }
        }
    },

    onDestroy() {
        this.isDestroying = true;
        this.unscheduleAllCallbacks();
    }
});
