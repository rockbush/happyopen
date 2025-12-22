// Monkey.js - 稳定版本2（最小改动版）
// 
// 猴子预制体脚本
// 预制体结构：
//   Monkey (根节点)
//     ├── body (身体，128×128)
//     ├── hand (手，128×128，与body重叠)
//     └── head (头部，64×64)
//           └── launchPoint (发射点，空节点)

cc.Class({
    extends: cc.Component,

    properties: {
        // 头部节点
        head: {
            default: null,
            type: cc.Node,
            tooltip: '猴子头部节点'
        },
        
        // 身体节点
        body: {
            default: null,
            type: cc.Node,
            tooltip: '猴子身体节点'
        },
        
        // 手节点
        hand: {
            default: null,
            type: cc.Node,
            tooltip: '猴子手节点'
        },
        
        // 行走动画帧（8张图）
        walkFrames: {
            default: [],
            type: [cc.SpriteFrame],
            tooltip: '行走动画帧（按顺序放入8张图）'
        },
        
        // 行走动画播放速度（每秒多少帧）
        walkFrameRate: {
            default: 12,
            tooltip: '行走动画帧率'
        },
        
        // 头部默认角度
        defaultHeadAngle: {
            default: 45,
            tooltip: '头部默认朝向角度'
        },
        
        // 头部最小旋转角度
        minHeadAngle: {
            default: -30,
            tooltip: '头部最小旋转角度'
        },
        
        // 头部最大旋转角度
        maxHeadAngle: {
            default: 80,
            tooltip: '头部最大旋转角度'
        },
        
        // 跳跃动画帧
        jumpFrames: {
            default: [],
            type: [cc.SpriteFrame],
            tooltip: '跳跃动画帧（按顺序放入）'
        },
        
        // 跳跃动画播放速度
        jumpFrameRate: {
            default: 12,
            tooltip: '跳跃动画帧率'
        },
        
        // 跳跃高度
        jumpHeight: {
            default: 30,
            tooltip: '跳跃时Y位置上移的像素'
        }
    },

    onLoad() {
        this.launchPoint = null;
        this.walkFrameIndex = 0;
        this.jumpFrameIndex = 0;
        this.isWalking = false;
        this.isJumping = false;
        this.originalBodySpriteFrame = null;
        this.walkAnimNode = null;
        this.jumpAnimNode = null;  // 跳跃动画节点
        this.initStructure();
    },
    
    // 初始化结构
    initStructure() {
        // 自动查找节点
        if (!this.head) this.head = this.node.getChildByName('head');
        if (!this.body) this.body = this.node.getChildByName('body');
        if (!this.hand) this.hand = this.node.getChildByName('hand');
        
        // 【新增】保存body原始spriteFrame
        if (this.body) {
            const sprite = this.body.getComponent(cc.Sprite);
            if (sprite) {
                this.originalBodySpriteFrame = sprite.spriteFrame;
            }
        }
        
        // 创建或获取发射点
        if (this.head) {
            this.launchPoint = this.head.getChildByName('launchPoint');
            if (!this.launchPoint) {
                this.launchPoint = new cc.Node('launchPoint');
                this.launchPoint.parent = this.head;
                // head锚点0.5,0时，右侧中心是 x=32, y=32（头部64×64）
                this.launchPoint.x = 32;
                this.launchPoint.y = 32;
            }
            // 记录头部初始角度（预制体里的角度）
            this.defaultHeadAngle = this.head.angle;
        }
        
        console.log('🐵 猴子初始化完成');
    },
    
    // 【核心方法】获取发射点位置（相对于猴子父节点的坐标）
    getLaunchPosition() {
        if (this.launchPoint) {
            const worldPos = this.launchPoint.convertToWorldSpaceAR(cc.v2(0, 0));
            return this.node.parent.convertToNodeSpaceAR(worldPos);
        }
        // 后备方案
        return this.node.position.add(cc.v2(30, 100));
    },
    
    // 【新增】获取头部顶部位置（锚点0.5, 1的位置）
    getHeadTopPosition() {
        if (this.head) {
            // head锚点是0.5,0，所以顶部是 y = head.height
            const localPos = cc.v2(0, this.head.height);
            const worldPos = this.head.convertToWorldSpaceAR(localPos);
            return this.node.parent.convertToNodeSpaceAR(worldPos);
        }
        return this.node.position.add(cc.v2(0, 150));
    },
    
    // 【新增】获取头部底部位置（锚点0.5, 0的位置）
    getHeadBottomPosition() {
        if (this.head) {
            // head锚点是0.5,0，所以底部就是 y = 0
            const localPos = cc.v2(0, 0);
            const worldPos = this.head.convertToWorldSpaceAR(localPos);
            return this.node.parent.convertToNodeSpaceAR(worldPos);
        }
        return this.node.position.add(cc.v2(0, 100));
    },
    
    // 【核心方法】根据拖拽偏移设置头部朝向
    setHeadDirection(dragOffset) {
        if (!this.head) return;
        
        // dragOffset 是拖拽偏移（向左下拖），发射方向是反向
        const launchDir = dragOffset.neg();
        let angle = Math.atan2(launchDir.y, launchDir.x) * 180 / Math.PI;
        
        // 限制角度范围
        angle = Math.max(this.minHeadAngle, Math.min(this.maxHeadAngle, angle));
        this.head.angle = angle;
    },
    
    // 重置头部朝向
    resetHeadDirection() {
        if (this.head) {
            this.head.angle = this.defaultHeadAngle;
        }
    },
    
    // 播放行走动画
    playWalkAnimation() {
        if (this.isWalking) return;
        this.isWalking = true;
        
        // 如果有行走帧，播放帧动画
        if (this.walkFrames && this.walkFrames.length > 0) {
            // 【修改】隐藏head、body、hand节点（因为动画帧是完整猴子）
            if (this.head) this.head.active = false;
            if (this.body) this.body.active = false;
            if (this.hand) this.hand.active = false;
            
            // 创建动画节点（如果不存在）
            if (!this.walkAnimNode) {
                this.walkAnimNode = new cc.Node('walkAnim');
                this.walkAnimNode.parent = this.node;
                // 设置锚点为底部中心，和猴子预制体一致
                this.walkAnimNode.anchorX = 0.5;
                this.walkAnimNode.anchorY = 0;
                const sprite = this.walkAnimNode.addComponent(cc.Sprite);
                sprite.sizeMode = cc.Sprite.SizeMode.RAW;
                sprite.trim = false;
            }
            this.walkAnimNode.active = true;
            
            this.walkFrameIndex = 0;
            const interval = 1 / this.walkFrameRate;
            this.schedule(this.updateWalkFrame, interval);
            console.log('🐵 播放行走帧动画，帧数:', this.walkFrames.length);
        } else {
            // 没有帧动画，用简单的弹跳动画
            this.node.stopAllActions();
            const bounce = cc.sequence(
                cc.moveBy(0.15, 0, 8).easing(cc.easeOut(2)),
                cc.moveBy(0.15, 0, -8).easing(cc.easeIn(2))
            );
            this.node.runAction(cc.repeatForever(bounce));
            console.log('🐵 播放简单弹跳动画');
        }
    },
    
    // 更新行走帧
    updateWalkFrame() {
        if (!this.walkAnimNode || !this.walkFrames || this.walkFrames.length === 0) return;
        
        const sprite = this.walkAnimNode.getComponent(cc.Sprite);
        if (sprite && this.walkFrames[this.walkFrameIndex]) {
            sprite.spriteFrame = this.walkFrames[this.walkFrameIndex];
        }
        
        this.walkFrameIndex = (this.walkFrameIndex + 1) % this.walkFrames.length;
    },
    
    // 停止行走动画
    stopWalkAnimation() {
        this.isWalking = false;
        this.unschedule(this.updateWalkFrame);
        this.node.stopAllActions();
        
        // 隐藏动画节点
        if (this.walkAnimNode) {
            this.walkAnimNode.active = false;
        }
        
        // 显示回head、body、hand节点
        if (this.head) this.head.active = true;
        if (this.body) this.body.active = true;
        if (this.hand) this.hand.active = true;
    },
    
    /**
     * 播放跳跃动画
     * @param {Function} callback - 跳跃完成后的回调
     * @param {Number} targetY - 目标Y坐标（云朵位置），猴子底部会落到这个位置
     */
    playJumpAnimation(callback, targetY) {
        if (this.isJumping) return;
        this.isJumping = true;
        
        // 计算需要跳跃的高度
        const currentY = this.node.y;
        const jumpToY = targetY !== undefined ? targetY : (currentY + this.jumpHeight);
        const jumpDistance = jumpToY - currentY;
        
        console.log('🐵 播放跳跃动画，从', currentY.toFixed(0), '跳到', jumpToY.toFixed(0));
        
        if (this.jumpFrames && this.jumpFrames.length > 0) {
            // 隐藏head、body、hand节点
            if (this.head) this.head.active = false;
            if (this.body) this.body.active = false;
            if (this.hand) this.hand.active = false;
            
            // 创建跳跃动画节点（如果不存在）
            if (!this.jumpAnimNode) {
                this.jumpAnimNode = new cc.Node('jumpAnim');
                this.jumpAnimNode.parent = this.node;
                // 设置锚点为底部中心，和猴子预制体一致
                this.jumpAnimNode.anchorX = 0.5;
                this.jumpAnimNode.anchorY = 0;
                const sprite = this.jumpAnimNode.addComponent(cc.Sprite);
                sprite.sizeMode = cc.Sprite.SizeMode.RAW;
                sprite.trim = false;
            }
            this.jumpAnimNode.active = true;
            
            // 播放跳跃帧动画
            this.jumpFrameIndex = 0;
            const interval = 1 / this.jumpFrameRate;
            const totalDuration = this.jumpFrames.length * interval;
            
            this.schedule(this.updateJumpFrame, interval);
            
            // Y位置移动到目标位置
            this.node.runAction(
                cc.moveTo(totalDuration, this.node.x, jumpToY).easing(cc.easeOut(2))
            );
            
            // 动画播放完毕后回调
            this.scheduleOnce(() => {
                this.stopJumpAnimation();
                if (callback) callback();
            }, totalDuration);
            
        } else {
            // 没有跳跃帧，用简单的跳跃动作
            this.node.runAction(
                cc.sequence(
                    cc.moveTo(0.3, this.node.x, jumpToY).easing(cc.easeOut(2)),
                    cc.callFunc(() => {
                        this.isJumping = false;
                        if (callback) callback();
                    })
                )
            );
        }
    },
    
    // 更新跳跃帧
    updateJumpFrame() {
        if (!this.jumpAnimNode || !this.jumpFrames || this.jumpFrames.length === 0) return;
        
        const sprite = this.jumpAnimNode.getComponent(cc.Sprite);
        if (sprite && this.jumpFrames[this.jumpFrameIndex]) {
            sprite.spriteFrame = this.jumpFrames[this.jumpFrameIndex];
        }
        
        this.jumpFrameIndex++;
        
        // 跳跃动画不循环，播放到最后一帧就停止
        if (this.jumpFrameIndex >= this.jumpFrames.length) {
            this.unschedule(this.updateJumpFrame);
        }
    },
    
    // 停止跳跃动画
    stopJumpAnimation() {
        this.isJumping = false;
        this.unschedule(this.updateJumpFrame);
        
        // 隐藏跳跃动画节点
        if (this.jumpAnimNode) {
            this.jumpAnimNode.active = false;
        }
        
        // 显示回head、body、hand节点
        if (this.head) this.head.active = true;
        if (this.body) this.body.active = true;
        if (this.hand) this.hand.active = true;
    }
});