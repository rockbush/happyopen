// SlingshotIndicator.js
// 弹弓拖拽指示器模块
// 使用方法：
// 1. 创建一个节点，添加 Sprite 组件
// 2. 把这个脚本挂到该节点上
// 3. 在属性面板设置 draggingSprite（拖拽中图片）和 releaseSprite（松手后图片）
// 4. 在 GameManager 中引用这个节点

cc.Class({
    extends: cc.Component,

    properties: {
        // 拖拽中显示的图片
        draggingSprite: {
            default: null,
            type: cc.SpriteFrame,
            tooltip: '拖拽中显示的图片'
        },
        
        // 松手后显示的图片
        releaseSprite: {
            default: null,
            type: cc.SpriteFrame,
            tooltip: '松手后显示的图片'
        },
        
        // 松手后图片显示时长
        releaseDuration: {
            default: 1.0,
            tooltip: '松手后图片显示多少秒后消失'
        }
    },

    onLoad() {
        // 获取 Sprite 组件
        this.sprite = this.node.getComponent(cc.Sprite);
        if (!this.sprite) {
            this.sprite = this.node.addComponent(cc.Sprite);
        }
        
        // 默认隐藏
        this.node.active = false;
        
        console.log('🎯 弹弓指示器初始化完成');
    },

    // 开始拖拽时调用（传入世界坐标）
    showDragging(worldPos) {
        // 取消之前的定时器
        this.unscheduleAllCallbacks();
        
        // 设置拖拽中的图片
        if (this.draggingSprite) {
            this.sprite.spriteFrame = this.draggingSprite;
        }
        
        // 设置位置
        this.node.position = worldPos;
        this.node.active = true;
    },
    
    // 拖拽过程中更新位置（传入世界坐标）
    updatePosition(worldPos) {
        if (this.node.active) {
            this.node.position = worldPos;
        }
    },

    // 松手时调用（传入世界坐标）
    showRelease(worldPos) {
        // 设置松手后的图片
        if (this.releaseSprite) {
            this.sprite.spriteFrame = this.releaseSprite;
        }
        
        // 设置位置
        this.node.position = worldPos;
        this.node.active = true;
        
        // 延迟隐藏
        this.scheduleOnce(() => {
            this.hide();
        }, this.releaseDuration);
    },

    // 隐藏指示器
    hide() {
        this.node.active = false;
    }
});
