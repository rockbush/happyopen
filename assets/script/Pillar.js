cc.Class({
    extends: cc.Component,

    properties: {
        topNode: cc.Node,        // 柱子顶部节点
        bodyNode: cc.Node,       // 柱子主体节点
        gameManager: null
    },

    onLoad() {
        this.pillarHeight = 200;
        
        // 如果没有手动创建子节点，自动创建
        if (!this.topNode || !this.bodyNode) {
            this.createPillarNodes();
        }
    },

    createPillarNodes() {
        // 创建柱身
        if (!this.bodyNode) {
            this.bodyNode = new cc.Node('Body');
            this.bodyNode.parent = this.node;
            const bodySprite = this.bodyNode.addComponent(cc.Sprite);
            bodySprite.type = cc.Sprite.Type.SIMPLE;
            bodySprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            this.bodyNode.color = cc.color(139, 69, 19); // 棕色
            this.bodyNode.width = 80;
            this.bodyNode.height = 200;
            this.bodyNode.y = 100; // 柱身中心点
        }
        
        // 创建柱顶
        if (!this.topNode) {
            this.topNode = new cc.Node('Top');
            this.topNode.parent = this.node;
            const topSprite = this.topNode.addComponent(cc.Sprite);
            topSprite.type = cc.Sprite.Type.SIMPLE;
            topSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            this.topNode.color = cc.color(101, 67, 33); // 深棕色
            this.topNode.width = 100;
            this.topNode.height = 20;
            this.topNode.y = 200; // 顶部位置
        }
    },

    setHeight(height) {
        this.pillarHeight = height;
        
        // 确保节点存在
        if (!this.bodyNode || !this.topNode) {
            this.createPillarNodes();
        }
        
        // 调整柱身高度
        if (this.bodyNode) {
            this.bodyNode.height = height;
            this.bodyNode.y = height / 2; // 柱身中心点在高度的一半
        }
        
        // 调整柱顶位置
        if (this.topNode) {
            this.topNode.y = height; // 顶部在柱子最高点
        }
        
        // 更新碰撞体
        const collider = this.node.getComponent(cc.PhysicsBoxCollider);
        if (collider) {
            collider.size.height = height;
            collider.offset.y = height / 2;
            collider.apply();
        }
    },

    checkIfOnTop(waterDropPos) {
        // 检查水滴是否落在柱子顶部区域
        const topY = this.node.y + this.pillarHeight;
        const topThreshold = 30; // 顶部判定范围
        
        const isInXRange = Math.abs(waterDropPos.x - this.node.x) < 40;
        const isInYRange = Math.abs(waterDropPos.y - topY) < topThreshold;
        
        return isInXRange && isInYRange;
    }
});