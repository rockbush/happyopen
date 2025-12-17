// DragIndicator.js
// 拖拽指示器模块
// 使用方法：
// 1. 创建一个节点，添加 Sprite 组件并设置好图片
// 2. 把这个脚本挂到该节点上
// 3. 在 GameManager 中引用这个节点

cc.Class({
    extends: cc.Component,

    properties: {
    },

    onLoad() {
        // 获取摄像机节点，指示器需要挂在摄像机下才能跟随
        this.cameraNode = cc.find('Canvas/Main Camera');
        
        // 屏幕尺寸
        this.screenHalfWidth = cc.winSize.width / 2;
        this.screenHalfHeight = cc.winSize.height / 2;
        
        // 把自己挂到摄像机下
        this.node.parent = this.cameraNode;
        this.node.zIndex = 1000;
        
        // 默认隐藏
        this.node.active = false;
        
        console.log('👆 拖拽指示器初始化完成');
    },

    // 显示指示器（传入屏幕坐标）
    show(screenPos) {
        // 屏幕坐标转为相对于摄像机的本地坐标
        const localX = screenPos.x - this.screenHalfWidth;
        const localY = screenPos.y - this.screenHalfHeight;
        
        this.node.x = localX;
        this.node.y = localY;
        this.node.active = true;
    },

    // 隐藏指示器
    hide() {
        this.node.active = false;
    }
});