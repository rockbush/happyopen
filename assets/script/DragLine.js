// DragLine.js
// 拖拽虚线模块 - 显示从猴子头到手指位置的两条红色虚线
//
// 使用方法：
// 1. 在场景中创建一个空节点，命名为 DragLine
// 2. 添加 Graphics 组件
// 3. 挂载此脚本
// 4. 在 GameManager 的属性面板中拖入 DragLine 节点引用

cc.Class({
    extends: cc.Component,

    properties: {
        // 虚线颜色
        lineColor: {
            default: cc.color(255, 80, 80),
            tooltip: '虚线颜色'
        },
        
        // 虚线宽度
        lineWidth: {
            default: 3,
            tooltip: '虚线宽度'
        },
        
        // 虚线段长度
        dashLength: {
            default: 10,
            tooltip: '虚线段长度'
        },
        
        // 虚线间隔长度
        gapLength: {
            default: 8,
            tooltip: '虚线间隔长度'
        }
    },

    onLoad() {
        this.graphics = this.node.getComponent(cc.Graphics);
        if (!this.graphics) {
            this.graphics = this.node.addComponent(cc.Graphics);
        }
        
        // 确保在较高层级显示
        this.node.zIndex = 100;
        
        console.log('📏 拖拽虚线模块初始化完成');
    },

    /**
     * 显示两条虚线
     * @param {cc.Vec2} headTopPos - 猴子头顶部位置 (锚点0.5, 1)
     * @param {cc.Vec2} headBottomPos - 猴子头底部位置 (锚点0.5, 0)
     * @param {cc.Vec2} targetPos - 手指/指示器位置
     */
    show(headTopPos, headBottomPos, targetPos) {
        if (!this.graphics) return;
        
        this.graphics.clear();
        
        // 画两条虚线
        this.drawDashedLine(headTopPos, targetPos);
        this.drawDashedLine(headBottomPos, targetPos);
    },
    
    /**
     * 画一条虚线
     */
    drawDashedLine(startPos, endPos) {
        if (!startPos || !endPos) return;
        
        this.graphics.strokeColor = this.lineColor;
        this.graphics.lineWidth = this.lineWidth;
        
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) return;
        
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        let currentDist = 0;
        let drawing = true;
        
        while (currentDist < distance) {
            const segmentLength = drawing ? this.dashLength : this.gapLength;
            const nextDist = Math.min(currentDist + segmentLength, distance);
            
            if (drawing) {
                const x1 = startPos.x + unitX * currentDist;
                const y1 = startPos.y + unitY * currentDist;
                const x2 = startPos.x + unitX * nextDist;
                const y2 = startPos.y + unitY * nextDist;
                
                this.graphics.moveTo(x1, y1);
                this.graphics.lineTo(x2, y2);
            }
            
            currentDist = nextDist;
            drawing = !drawing;
        }
        
        this.graphics.stroke();
    },
    
    /**
     * 隐藏/清除虚线
     */
    hide() {
        if (this.graphics) {
            this.graphics.clear();
        }
    }
});
