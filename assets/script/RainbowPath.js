cc.Class({
    extends: cc.Component,

    properties: {
        // 云朵纹理图片
        rainbowTexture: cc.SpriteFrame,
        
        // 云朵宽度
        cloudWidth: {
            default: 80,
            tooltip: '云朵的宽度'
        },
        
        // 云朵高度
        cloudHeight: {
            default: 35,
            tooltip: '云朵的高度'
        },
        
        // 云朵间隔距离
        cloudSpacing: {
            default: 180,
            tooltip: '云朵之间的间隔距离'
        }
    },

    onLoad() {
        // 路径点
        this.pathPoints = [];
        
        // 存储所有云朵节点
        this.cloudNodes = [];
        
        // 创建一个容器节点
        this.container = new cc.Node('CloudContainer');
        this.container.parent = this.node;
        
        // 是否显示
        this.isVisible = false;

        this.node.zIndex = 999
        
        console.log('☁️ 云朵路径初始化完成');
    },

    // 设置路径点并绘制云朵
    setPath(points) {
        if (!points || points.length < 2) {
            console.warn('☁️ 路径点不足，无法绘制');
            return;
        }
        
        // 先清除旧的
        this.clearClouds();
        
        this.pathPoints = [];
        for (let i = 0; i < points.length; i++) {
            this.pathPoints.push(cc.v2(points[i].x, points[i].y));
        }
        
        this.isVisible = true;
        
        // 绘制云朵路径
        this.drawCloudPath();
        
        console.log('☁️ 云朵路径绘制完成');
    },

    // 绘制云朵路径
    drawCloudPath() {
        if (this.pathPoints.length < 2) return;
        if (!this.rainbowTexture) {
            console.warn('☁️ 没有设置云朵纹理');
            return;
        }
        
        // 计算路径总长度，并沿路径均匀放置云朵
        let totalLength = 0;
        const segments = [];
        
        for (let i = 0; i < this.pathPoints.length - 1; i++) {
            const p1 = this.pathPoints[i];
            const p2 = this.pathPoints[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            segments.push({
                start: p1,
                end: p2,
                length: length,
                startDist: totalLength
            });
            
            totalLength += length;
        }
        
        // 沿路径每隔 cloudSpacing 距离放置一朵云
        let currentDist = 0;
        
        while (currentDist <= totalLength) {
            // 找到当前距离对应的位置
            const pos = this.getPositionAtDistance(segments, currentDist);
            if (pos) {
                this.createCloud(pos);
            }
            
            currentDist += this.cloudSpacing;
        }
        
        console.log('☁️ 生成云朵数量:', this.cloudNodes.length);
    },
    
    // 根据距离获取路径上的位置
    getPositionAtDistance(segments, distance) {
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const segEndDist = seg.startDist + seg.length;
            
            if (distance >= seg.startDist && distance <= segEndDist) {
                // 在这个段内
                const t = (distance - seg.startDist) / seg.length;
                const x = seg.start.x + (seg.end.x - seg.start.x) * t;
                const y = seg.start.y + (seg.end.y - seg.start.y) * t;
                return cc.v2(x, y);
            }
        }
        
        // 超出范围，返回最后一个点
        if (segments.length > 0) {
            return segments[segments.length - 1].end;
        }
        
        return null;
    },
    
    // 创建一朵云
    createCloud(pos) {
        const cloudNode = new cc.Node('Cloud');
        cloudNode.parent = this.container;
        
        // 添加 Sprite 组件
        const sprite = cloudNode.addComponent(cc.Sprite);
        sprite.spriteFrame = this.rainbowTexture;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.type = cc.Sprite.Type.SIMPLE;
        
        // 设置大小（使用实际宽高）
        cloudNode.width = this.cloudWidth;
        cloudNode.height = this.cloudHeight;
        
        // 设置位置
        cloudNode.x = pos.x;
        cloudNode.y = pos.y;
        
        // 保存引用
        this.cloudNodes.push(cloudNode);
    },

    // 清除所有云朵
    clearClouds() {
        for (let i = 0; i < this.cloudNodes.length; i++) {
            if (this.cloudNodes[i] && this.cloudNodes[i].isValid) {
                this.cloudNodes[i].destroy();
            }
        }
        this.cloudNodes = [];
    },

    // 清除路径
    clear() {
        this.clearClouds();
        this.pathPoints = [];
        this.isVisible = false;
        console.log('☁️ 云朵路径已清除');
    },

    
    // 世界左移时调用
    shiftLeft(distance) {
        // 更新路径点
        for (let i = 0; i < this.pathPoints.length; i++) {
            this.pathPoints[i].x -= distance;
        }
        
        // 更新所有云朵的位置
        for (let i = 0; i < this.cloudNodes.length; i++) {
            if (this.cloudNodes[i] && this.cloudNodes[i].isValid) {
                this.cloudNodes[i].x -= distance;
            }
        }
    }
});