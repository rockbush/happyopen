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
        
        // 获取海浪碰撞线的Y坐标（海浪高度的一半）
        this.waveCollisionY = this.getWaveCollisionY();
        
        // 开始检测碰撞（提高检测频率）
        this.schedule(this.checkAllCollisions, 0.016);
        
        // 5秒后自动销毁（避免永远飞行）
        this.scheduleOnce(() => {
            if (!this.hasLanded && !this.isDestroying) {
                this.onMissTarget();
            }
        }, 5);
    },
    
    // 获取海浪碰撞线的Y坐标
    getWaveCollisionY() {
        if (!this.gameManager) return -360;
        
        // 尝试从 GameManager 获取 InfiniteWave 节点
        const infiniteWave = this.gameManager.infiniteWave;
        if (infiniteWave) {
            const waveScript = infiniteWave.getComponent('InfiniteWave');
            if (waveScript) {
                // 海浪高度的一半作为碰撞线
                // 海浪Y位置 = -screenHalfHeight + waveHeight/2 + waveOffsetY
                // 碰撞线 = 海浪顶部 - waveHeight/2 = -screenHalfHeight + waveHeight + waveOffsetY - waveHeight/2
                //        = -screenHalfHeight + waveHeight/2 + waveOffsetY
                const screenHalfHeight = cc.winSize.height / 2;
                const collisionY = -screenHalfHeight + waveScript.waveHeight / 2 + waveScript.waveOffsetY;
                console.log('🌊 海浪碰撞线Y:', collisionY.toFixed(0));
                return collisionY;
            }
        }
        
        // 默认值（屏幕底部附近）
        return -300;
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

    // 统一碰撞检测
    checkAllCollisions() {
        if (this.hasCheckedCollision || this.isDestroying || !this.gameManager) return;
        if (!this.node || !this.node.isValid) return;
        
        const cx = this.node.position.x;
        const cy = this.node.position.y;
        const cr = this.collisionRadius;
        
        // 1. 先检测是否碰到海浪（优先级最高，因为掉水里就结束了）
        if (cy - cr <= this.waveCollisionY) {
            console.log('🌊 水滴落入海浪！Y:', cy.toFixed(0), '海浪线:', this.waveCollisionY.toFixed(0));
            this.onMissTarget();
            return;
        }
        
        const pillars = this.gameManager.pillars;
        
        for (let i = 0; i < pillars.length; i++) {
            const pillar = pillars[i];
            if (!pillar || !pillar.isValid) continue;
            
            const pillarScript = pillar.getComponent('Pillar');
            if (!pillarScript) continue;
            
            // 获取 Pillar 的缩放值
            const pillarScale = pillar.scale || 1;
            
            // 2. 检测 topNode 碰撞（命中目标）
            if (pillarScript.topNode) {
                const topWorldPos = pillarScript.topNode.convertToWorldSpaceAR(cc.v2(0, 0));
                const topNodePos = this.node.parent.convertToNodeSpaceAR(topWorldPos);
                
                const topFullWidth = pillarScript.topNode.width * pillarScale;
                const topFullHeight = pillarScript.topNode.height * pillarScale;
                
                // 只使用下半部分作为碰撞区域
                const topRectX = topNodePos.x - topFullWidth / 2;
                const topRectY = topNodePos.y - topFullHeight / 2;
                const topRectW = topFullWidth;
                const topRectH = topFullHeight / 2;
                
                if (this.circleRectCollision(cx, cy, cr, topRectX, topRectY, topRectW, topRectH)) {
                    console.log('✅ 命中 topNode！');
                    this.onHitTarget();
                    return;
                }
            }
            
            // 3. 检测 bodyNode 碰撞（未命中）
            if (pillarScript.bodyNode) {
                const bodyWorldPos = pillarScript.bodyNode.convertToWorldSpaceAR(cc.v2(0, 0));
                const bodyNodePos = this.node.parent.convertToNodeSpaceAR(bodyWorldPos);
                
                // bodyNode 的尺寸（应用缩放）
                const bodyWidth = pillarScript.bodyNode.width * pillarScale;
                const bodyHeight = pillarScript.bodyNode.height * pillarScale;
                
                // bodyNode 锚点在底部中心 (0.5, 0)
                const bodyRectX = bodyNodePos.x - bodyWidth / 2;
                const bodyRectY = bodyNodePos.y;
                const bodyRectW = bodyWidth;
                const bodyRectH = bodyHeight;
                
                if (this.circleRectCollision(cx, cy, cr, bodyRectX, bodyRectY, bodyRectW, bodyRectH)) {
                    console.log('❌ 碰到 bodyNode！');
                    this.onMissTarget();
                    return;
                }
            }
        }
    },

    onHitTarget() {
        if (this.isDestroying) return;
        
        this.hasCheckedCollision = true;
        this.hasLanded = true;
        this.isDestroying = true;
        this.unscheduleAllCallbacks();
        
        // 【v12修复】立即停止水滴运动
        const rigidBody = this.node.getComponent(cc.RigidBody);
        if (rigidBody) {
            rigidBody.linearVelocity = cc.v2(0, 0);
            rigidBody.gravityScale = 0;
        }
        
        // 记录碰撞位置
        const landPos = this.node.position.clone();
        
        // 立即隐藏水滴
        this.node.opacity = 0;
        
        if (this.gameManager) {
            this.gameManager.onWaterDropLanded(true, landPos);
        }
        
        // 立即销毁
        this.destroySafely();
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