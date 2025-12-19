cc.Class({
    extends: cc.Component,

    properties: {
        // 背景图片（四方连续的图）
        bgSpriteFrame: cc.SpriteFrame,
        
        // 背景宽度（默认1280，和屏幕一样宽）
        bgWidth: {
            default: 1280,
            tooltip: '背景图片宽度'
        }
    },

    onLoad() {
        // 获取屏幕半宽
        this.screenHalfWidth = cc.winSize.width / 2;
        this.node.zIndex = -2
        // 创建四个背景节点
        this.bgs = [];
        for (let i = 0; i < 4; i++) {
            const bg = this.createBgNode('Background' + (i + 1));
            bg.x = (i - 1) * this.bgWidth;  // [-1280, 0, 1280, 2560]
            this.bgs.push(bg);
        }
        
        console.log('🌄 无限背景初始化完成（4张图）');
    },
    
    // 创建背景节点
    createBgNode(name) {
        const node = new cc.Node(name);
        node.parent = this.node;
        
        // 添加 Sprite 组件
        const sprite = node.addComponent(cc.Sprite);
        if (this.bgSpriteFrame) {
            sprite.spriteFrame = this.bgSpriteFrame;
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }
        
        // 设置大小
        node.width = this.bgWidth;
        node.height = 720;
        
        // 设置层级在最底层
        node.zIndex = -100;
        
        return node;
    },

    // 【核心方法】被 GameManager 调用，让背景跟着世界一起左移
    shiftLeft(distance) {
        for (let i = 0; i < this.bgs.length; i++) {
            this.bgs[i].x -= distance;
        }
        
        // 检查是否需要循环
        this.checkLoop();
    },
    
    // 检查背景是否需要循环
    checkLoop() {
        // 按 x 坐标排序
        this.bgs.sort((a, b) => a.x - b.x);
        
        const leftBg = this.bgs[0];
        const rightBg = this.bgs[this.bgs.length - 1];
        
        // 屏幕可见范围
        const leftEdge = -this.screenHalfWidth - this.bgWidth * 1.5;
        const rightEdge = this.screenHalfWidth + this.bgWidth * 1.5;
        
        // 如果最左边的背景完全移出屏幕左边，挪到最右边
        const leftBgRightEdge = leftBg.x + this.bgWidth / 2;
        if (leftBgRightEdge < leftEdge) {
            leftBg.x = rightBg.x + this.bgWidth;
            console.log('🔄 背景循环: 左→右');
        }
        
        // 如果最右边的背景完全移出屏幕右边，挪到最左边
        const rightBgLeftEdge = rightBg.x - this.bgWidth / 2;
        if (rightBgLeftEdge > rightEdge) {
            rightBg.x = leftBg.x - this.bgWidth;
            console.log('🔄 背景循环: 右→左');
        }
    }
});