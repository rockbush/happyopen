// CollisionDebug.js
// 碰撞区域调试可视化
// 用不同颜色框出水滴和TopNode的碰撞区域

cc.Class({
    extends: cc.Component,

    properties: {
        // 是否启用调试显示
        debugEnabled: {
            default: true,
            tooltip: '是否启用碰撞区域显示'
        },
        
        // 水滴碰撞区域颜色（红色）
        waterDropColor: {
            default: cc.color(255, 50, 50, 200),
            tooltip: '水滴碰撞区域颜色'
        },
        
        // TopNode碰撞区域颜色（绿色）
        topNodeColor: {
            default: cc.color(0, 255, 100, 180),
            tooltip: 'TopNode碰撞区域颜色'
        },
        
        // 线宽
        lineWidth: {
            default: 3,
            tooltip: '边框线宽'
        }
    },

    onLoad() {
        // 创建 Graphics 组件用于绘制
        this.graphics = this.node.addComponent(cc.Graphics);
        this.graphics.lineWidth = this.lineWidth;
        
        // 确保在最上层显示
        this.node.zIndex = 9999;
        
        // 获取 GameManager 引用
        this.gameManager = this.node.parent.getComponent('GameManager');
        
        console.log('🔍 碰撞调试可视化已启用');
    },

    update(dt) {
        if (!this.debugEnabled) {
            this.graphics.clear();
            return;
        }
        
        this.graphics.clear();
        
        // 绘制所有TopNode的碰撞区域
        this.drawTopNodeColliders();
        
        // 绘制水滴的碰撞区域
        this.drawWaterDropCollider();
    },
    
    // 绘制TopNode碰撞区域（绿色，只有下半部分）
    drawTopNodeColliders() {
        if (!this.gameManager || !this.gameManager.pillars) return;
        
        const pillars = this.gameManager.pillars;
        
        for (let i = 0; i < pillars.length; i++) {
            const pillar = pillars[i];
            if (!pillar || !pillar.isValid) continue;
            
            const pillarScript = pillar.getComponent('Pillar');
            if (!pillarScript || !pillarScript.topNode) continue;
            
            // 获取TopNode的世界坐标并转换到当前节点坐标系
            const topWorldPos = pillar.convertToWorldSpaceAR(pillarScript.topNode.position);
            const topNodePos = this.node.parent.convertToNodeSpaceAR(topWorldPos);
            
            // 碰撞区域（只有下半部分）
            const topHalfWidth = pillarScript.topNode.width / 2;
            const topFullHeight = pillarScript.topNode.height;
            
            // 下半部分矩形
            const rectX = topNodePos.x - topHalfWidth;
            const rectY = topNodePos.y - topFullHeight / 2;
            const rectW = topHalfWidth * 2;
            const rectH = topFullHeight / 2;
            
            // 绘制碰撞区域矩形
            this.graphics.strokeColor = this.topNodeColor;
            this.graphics.fillColor = cc.color(
                this.topNodeColor.r, 
                this.topNodeColor.g, 
                this.topNodeColor.b, 
                50
            );
            
            this.graphics.rect(rectX, rectY, rectW, rectH);
            this.graphics.fill();
            this.graphics.stroke();
            
            // 绘制中心点
            this.graphics.fillColor = this.topNodeColor;
            this.graphics.circle(topNodePos.x, topNodePos.y, 5);
            this.graphics.fill();
        }
    },
    
    // 绘制水滴碰撞区域（红色）
    drawWaterDropCollider() {
        if (!this.gameManager) return;
        
        // 通过GameManager获取当前水滴
        const waterDropNode = this.gameManager.currentWaterDrop;
        if (!waterDropNode || !waterDropNode.isValid) return;
        
        const waterDropPos = waterDropNode.position;
        
        // 获取水滴脚本中的碰撞半径，默认25
        const waterDropScript = waterDropNode.getComponent('WaterDrop');
        const waterDropRadius = waterDropScript && waterDropScript.collisionRadius ? waterDropScript.collisionRadius : 25;
        
        // 绘制水滴碰撞区域（红色圆形）
        this.graphics.strokeColor = this.waterDropColor;
        this.graphics.lineWidth = 4;  // 加粗线条
        this.graphics.fillColor = cc.color(255, 0, 0, 100);  // 红色半透明填充
        
        this.graphics.circle(waterDropPos.x, waterDropPos.y, waterDropRadius);
        this.graphics.fill();
        this.graphics.stroke();
        
        // 绘制中心点（黄色，更醒目）
        this.graphics.fillColor = cc.color(255, 255, 0, 255);
        this.graphics.circle(waterDropPos.x, waterDropPos.y, 8);
        this.graphics.fill();
        
        // 绘制十字准星
        this.graphics.strokeColor = cc.color(255, 255, 0, 255);
        this.graphics.moveTo(waterDropPos.x - 15, waterDropPos.y);
        this.graphics.lineTo(waterDropPos.x + 15, waterDropPos.y);
        this.graphics.moveTo(waterDropPos.x, waterDropPos.y - 15);
        this.graphics.lineTo(waterDropPos.x, waterDropPos.y + 15);
        this.graphics.stroke();
    }
});