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
        // ========== 创建柱身 ==========
        if (!this.bodyNode) {
            this.bodyNode = new cc.Node('Body');
            this.bodyNode.parent = this.node;
            
            // 【修改】使用 Graphics 组件绘制纯色方块
            const bodyGraphics = this.bodyNode.addComponent(cc.Graphics);
            this.bodyNode.width = 80;
            this.bodyNode.height = 200;
            this.bodyNode.y = 100; // 柱身中心点
            
            // 绘制棕色矩形
            bodyGraphics.fillColor = cc.color(139, 69, 19); // 棕色
            bodyGraphics.rect(-40, -100, 80, 200); // x, y, width, height（相对于节点中心）
            bodyGraphics.fill();
        }
        
        // ========== 创建柱顶 ==========
        if (!this.topNode) {
            this.topNode = new cc.Node('Top');
            this.topNode.parent = this.node;
            
            // 【修改】使用 Graphics 组件绘制纯色方块
            const topGraphics = this.topNode.addComponent(cc.Graphics);
            this.topNode.width = 100;
            this.topNode.height = 20;
            this.topNode.y = 200; // 顶部位置
            
            // 绘制深棕色矩形
            topGraphics.fillColor = cc.color(34, 139, 34); // 【修改】绿色，更容易区分
            topGraphics.rect(-50, -10, 100, 20); // x, y, width, height
            topGraphics.fill();
        }
    },

    setHeight(height) {
        this.pillarHeight = height;
        
        // 确保节点存在
        if (!this.bodyNode || !this.topNode) {
            this.createPillarNodes();
        }
        
        // ========== 调整柱身 ==========
        if (this.bodyNode) {
            this.bodyNode.height = height;
            this.bodyNode.y = height / 2;
            
            // 【修改】重新绘制柱身
            const bodyGraphics = this.bodyNode.getComponent(cc.Graphics);
            if (bodyGraphics) {
                bodyGraphics.clear();
                bodyGraphics.fillColor = cc.color(139, 69, 19); // 棕色
                bodyGraphics.rect(-40, -height / 2, 80, height);
                bodyGraphics.fill();
            }
        }
        
        // ========== 调整柱顶 ==========
        if (this.topNode) {
            this.topNode.y = height;
            
            // 【修改】重新绘制柱顶（位置变了需要重绘）
            const topGraphics = this.topNode.getComponent(cc.Graphics);
            if (topGraphics) {
                topGraphics.clear();
                topGraphics.fillColor = cc.color(34, 139, 34); // 绿色
                topGraphics.rect(-50, -10, 100, 20);
                topGraphics.fill();
            }
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
        const topThreshold = 30;
        
        const isInXRange = Math.abs(waterDropPos.x - this.node.x) < 40;
        const isInYRange = Math.abs(waterDropPos.y - topY) < topThreshold;
        
        return isInXRange && isInYRange;
    }
});