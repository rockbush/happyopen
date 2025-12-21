/**
 * MonkeyLauncher.js
 * 猴子发射器模块 - 处理头部旋转、发射点计算、行走动画
 * 
 * 使用方法：
 * 1. 将此脚本挂载到 Monkey 预制体的根节点上
 * 2. 在编辑器中设置 head, body, hand, firePoint 的引用
 * 3. GameManager 通过 getFirePosition() 获取发射点位置
 * 4. GameManager 通过 setAimDirection(dir) 设置瞄准方向（头部会跟随旋转）
 * 5. GameManager 通过 playWalkAnimation() / stopWalkAnimation() 控制行走动画
 * 
 * 预制体结构：
 * Monkey (根节点, 挂载此脚本)
 *   - body (Sprite: Mk_body1.png, 128x128)
 *   - hand (Sprite: Mk_body3.png, 128x128, 与body重叠)
 *   - head (Sprite: head2.png, 64x64, 锚点0.5,0)
 *     - firePoint (空节点, 发射点位置)
 */

cc.Class({
    extends: cc.Component,

    properties: {
        // 头部节点（需要在编辑器中拖入）
        head: {
            default: null,
            type: cc.Node,
            tooltip: '头部节点'
        },
        
        // 身体节点
        body: {
            default: null,
            type: cc.Node,
            tooltip: '身体节点'
        },
        
        // 手部节点
        hand: {
            default: null,
            type: cc.Node,
            tooltip: '手部节点'
        },
        
        // 发射点节点（head的子节点）
        firePoint: {
            default: null,
            type: cc.Node,
            tooltip: '发射点节点（head的子节点）'
        },
        
        // 头部旋转限制
        minHeadAngle: {
            default: -45,
            tooltip: '头部最小旋转角度（向下）'
        },
        maxHeadAngle: {
            default: 80,
            tooltip: '头部最大旋转角度（向上）'
        },
        
        // 行走动画帧（可选，如果有的话）
        walkFrames: {
            default: [],
            type: [cc.SpriteFrame],
            tooltip: '行走动画帧序列'
        },
        
        // 动画帧率
        frameRate: {
            default: 8,
            tooltip: '行走动画帧率'
        }
    },

    onLoad() {
        // 保存头部初始角度
        this.initialHeadAngle = this.head ? this.head.angle : 0;
        
        // 行走动画状态
        this.isWalking = false;
        this.walkFrameIndex = 0;
        
        console.log('🐵 MonkeyLauncher 初始化完成');
    },

    /**
     * 获取发射点的世界坐标
     * @returns {cc.Vec2} 发射点世界坐标
     */
    getFirePosition() {
        if (this.firePoint) {
            // 获取 firePoint 的世界坐标，然后转换到父节点（GameManager）坐标系
            const worldPos = this.firePoint.convertToWorldSpaceAR(cc.v2(0, 0));
            const parent = this.node.parent;
            if (parent) {
                return parent.convertToNodeSpaceAR(worldPos);
            }
            return worldPos;
        }
        
        // 如果没有设置 firePoint，返回猴子位置
        console.warn('⚠️ firePoint 未设置，使用猴子位置');
        return this.node.position.clone();
    },

    /**
     * 设置瞄准方向（头部跟随旋转）
     * @param {cc.Vec2} direction 瞄准方向向量（从猴子指向目标的方向）
     */
    setAimDirection(direction) {
        if (!this.head) return;
        
        // 计算角度（弧度转角度）
        // direction 是从发射点指向目标的方向
        // 我们需要让头部朝向这个方向
        let angle = Math.atan2(direction.y, direction.x) * (180 / Math.PI);
        
        // 限制角度范围
        angle = Math.max(this.minHeadAngle, Math.min(this.maxHeadAngle, angle));
        
        // 设置头部旋转
        this.head.angle = angle;
    },

    /**
     * 根据拖拽偏移设置头部旋转
     * @param {cc.Vec2} dragOffset 拖拽偏移（向左下拖动为负值）
     */
    setHeadRotationByDrag(dragOffset) {
        if (!this.head) return;
        
        // 发射方向是拖拽偏移的反方向
        const launchDir = dragOffset.mul(-1);
        
        // 计算角度
        let angle = Math.atan2(launchDir.y, launchDir.x) * (180 / Math.PI);
        
        // 限制角度范围
        angle = Math.max(this.minHeadAngle, Math.min(this.maxHeadAngle, angle));
        
        // 设置头部旋转
        this.head.angle = angle;
    },

    /**
     * 重置头部角度
     */
    resetHeadRotation() {
        if (this.head) {
            this.head.angle = this.initialHeadAngle;
        }
    },

    /**
     * 播放行走动画
     */
    playWalkAnimation() {
        if (this.isWalking) return;
        
        this.isWalking = true;
        
        // 如果有行走动画帧，播放帧动画
        if (this.walkFrames && this.walkFrames.length > 0 && this.body) {
            this.walkFrameIndex = 0;
            const bodySprite = this.body.getComponent(cc.Sprite);
            
            // 使用 schedule 播放帧动画
            this.schedule(this._updateWalkFrame, 1 / this.frameRate);
        } else {
            // 没有动画帧，使用简单的缩放动画
            this._playSimpleWalkAnimation();
        }
        
        console.log('🚶 开始行走动画');
    },

    /**
     * 停止行走动画
     */
    stopWalkAnimation() {
        if (!this.isWalking) return;
        
        this.isWalking = false;
        
        // 停止帧动画
        this.unschedule(this._updateWalkFrame);
        
        // 停止缩放动画
        if (this.body) {
            this.body.stopAllActions();
            this.body.scale = 1;
        }
        
        console.log('🛑 停止行走动画');
    },

    /**
     * 更新行走动画帧（内部方法）
     */
    _updateWalkFrame() {
        if (!this.isWalking || !this.body) return;
        
        const bodySprite = this.body.getComponent(cc.Sprite);
        if (bodySprite && this.walkFrames.length > 0) {
            bodySprite.spriteFrame = this.walkFrames[this.walkFrameIndex];
            this.walkFrameIndex = (this.walkFrameIndex + 1) % this.walkFrames.length;
        }
    },

    /**
     * 简单的行走动画（没有帧动画时使用）
     */
    _playSimpleWalkAnimation() {
        if (!this.body) return;
        
        // 使用身体的缩放来模拟行走
        const walkAction = cc.repeatForever(
            cc.sequence(
                cc.scaleTo(0.15, 1.05, 0.95),
                cc.scaleTo(0.15, 0.95, 1.05),
                cc.scaleTo(0.15, 1, 1)
            )
        );
        
        this.body.runAction(walkAction);
    },

    onDestroy() {
        this.stopWalkAnimation();
    }
});