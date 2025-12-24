cc.Class({
    extends: cc.Component,

    properties: {
        gameManager: null,
        // 水滴碰撞半径
        collisionRadius: {
            default: 40,
            tooltip: '水滴碰撞检测半径'
        }
    },

    onLoad() {
        this.hasLanded = false;
        this.hasCheckedCollision = false;
        this.isDestroying = false;
        
        // 开始检测与柱子顶部的碰撞（提高检测频率）
        this.schedule(this.checkTopCollision, 0.016);
        
        // 5秒后自动销毁（避免永远飞行）
        this.scheduleOnce(() => {
            if (!this.hasLanded && !this.isDestroying) {
                this.onMissTarget();
            }
        }, 5);
    },

    // 圆形与矩形碰撞检测
    circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
        // 找到矩形上离圆心最近的点
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));
        
        // 计算圆心到最近点的距离
        const distanceX = cx - closestX;
        const distanceY = cy - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        return distanceSquared <= r * r;
    },

    checkTopCollision() {
        if (this.hasCheckedCollision || this.isDestroying || !this.gameManager) return;
        if (!this.node || !this.node.isValid) return;
        
        const pillars = this.gameManager.pillars;
        
        for (let i = 0; i < pillars.length; i++) {
            const pillar = pillars[i];
            if (!pillar || !pillar.isValid) continue;
            
            const pillarScript = pillar.getComponent('Pillar');
            if (!pillarScript || !pillarScript.topNode) continue;
            
            // 获取 Pillar 的缩放值
            const pillarScale = pillar.scale || 1;
            
            // 获取 topNode 的世界坐标
            const topWorldPos = pillarScript.topNode.convertToWorldSpaceAR(cc.v2(0, 0));
            const topNodePos = this.node.parent.convertToNodeSpaceAR(topWorldPos);
            
            // 获取 topNode 原始尺寸，并应用缩放
            const topFullWidth = pillarScript.topNode.width * pillarScale;
            const topFullHeight = pillarScript.topNode.height * pillarScale;
            
            // 只使用下半部分作为碰撞区域
            // 矩形左下角坐标和尺寸（应用缩放后）
            const rectX = topNodePos.x - topFullWidth / 2;
            const rectY = topNodePos.y - topFullHeight / 2;  // 从中心往下
            const rectW = topFullWidth;
            const rectH = topFullHeight / 2;  // 只有下半部分
            
            // 水滴圆心和半径
            const cx = this.node.position.x;
            const cy = this.node.position.y;
            const cr = this.collisionRadius;
            
            // 圆形与矩形碰撞检测
            if (this.circleRectCollision(cx, cy, cr, rectX, rectY, rectW, rectH)) {
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
        if (this.node && this.node.isValid) {
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