// WaterDrop.js
// 水滴脚本 - 稳定版本6
// 使用圆形碰撞区域检测

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
        
        // 开始检测与柱子顶部的碰撞（提高频率）
        this.schedule(this.checkTopCollision, 0.016);  // 约60fps检测
        
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
        const waterDropPos = this.node.position;
        
        for (let i = 0; i < pillars.length; i++) {
            const pillar = pillars[i];
            if (!pillar || !pillar.isValid) continue;
            
            const pillarScript = pillar.getComponent('Pillar');
            if (!pillarScript || !pillarScript.topNode) continue;
            
            // 获取柱子顶部的世界坐标
            const topWorldPos = pillar.convertToWorldSpaceAR(pillarScript.topNode.position);
            const topNodePos = this.node.parent.convertToNodeSpaceAR(topWorldPos);
            
            // TopNode 碰撞区域（只取下半部分）
            const topHalfWidth = pillarScript.topNode.width / 2;
            const topFullHeight = pillarScript.topNode.height;
            
            // 下半部分矩形：从中心往下
            // 矩形左下角 Y = 中心Y - 高度/2
            // 矩形高度 = 原高度/2（只取下半部分）
            const rectX = topNodePos.x - topHalfWidth;
            const rectY = topNodePos.y - topFullHeight / 2;  // 下半部分的底部
            const rectW = topHalfWidth * 2;
            const rectH = topFullHeight / 2;  // 只有一半高度
            
            // 使用圆形与矩形的碰撞检测
            if (this.circleRectCollision(
                waterDropPos.x, waterDropPos.y, this.collisionRadius,
                rectX, rectY, rectW, rectH
            )) {
                // 碰到柱子顶部了！
                console.log('💥 碰撞成功！水滴位置:', waterDropPos.x.toFixed(0), waterDropPos.y.toFixed(0));
                this.onHitTarget();
                return;
            }
        }
    },
    
    // 圆形与矩形碰撞检测
    // cx, cy: 圆心坐标
    // r: 圆半径
    // rx, ry: 矩形左下角坐标
    // rw, rh: 矩形宽高
    circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
        // 找到矩形上离圆心最近的点
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));
        
        // 计算圆心到最近点的距离
        const distanceX = cx - closestX;
        const distanceY = cy - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        // 如果距离小于半径，则碰撞
        return distanceSquared <= r * r;
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