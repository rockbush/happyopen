// Pillar.js
// 柱子预制体脚本
// 结构：
//   Pillar (根节点)
//     - top       (顶部装饰，固定大小图片)
//     - topNode   (平台，固定大小图片，用于碰撞检测)
//         - standPoint (猴子站立点，空节点)
//     - bodyNode  (柱身，slice拉伸图片)
//
// 功能：
//   - topNode 在 bodyNode顶部 和 top图片一半高度之间 来回移动
//   - 每个 Pillar 的 scale 在 0.5-1.0 之间随机（0.1递进）
//   - 被击中后停止移动

cc.Class({
    extends: cc.Component,

    properties: {
        // 顶部装饰节点
        top: cc.Node,
        // 平台节点（碰撞检测用）
        topNode: cc.Node,
        // 柱身节点
        bodyNode: cc.Node,
        // 猴子站立点（在topNode下的子节点）
        standPoint: {
            default: null,
            type: cc.Node,
            tooltip: '猴子站立点，放在topNode右侧位置'
        },
        // GameManager 引用
        gameManager: null,
        
        // ========== 移动参数 ==========
        // topNode 移动速度
        topNodeMoveSpeed: {
            default: 80,
            tooltip: 'topNode上下移动速度（像素/秒）'
        },
        
        // 是否启用移动（起始柱子不移动）
        enableMoving: {
            default: true,
            tooltip: '是否启用topNode上下移动'
        }
    },

    onLoad() {
        this.pillarHeight = 200;
        this.node.zIndex = -1;
        
        // 移动相关状态
        this.isMoving = false;       // 是否正在移动
        this.isHit = false;          // 是否被击中
        this.moveDirection = 1;      // 1=向上，-1=向下
        this.topNodeMinY = 0;        // topNode最低Y位置
        this.topNodeMaxY = 0;        // topNode最高Y位置
    },
    
    start() {
        // 只有启用移动的柱子才随机缩放和移动
        if (this.enableMoving) {
            // 随机缩放（0.5-1.0，0.1递进）
            this.randomizeScale();
            // 开始移动
            this.startMoving();
        }
    },
    
    // 随机设置缩放
    randomizeScale() {
        // 0.5, 0.6, 0.7, 0.8, 0.9, 1.0 中随机选一个
        const scaleOptions = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
        const randomIndex = Math.floor(Math.random() * scaleOptions.length);
        const scale = scaleOptions[randomIndex];
        this.node.scale = scale;
    },

    // 设置柱子高度
    setHeight(height) {
        this.pillarHeight = height;
        
        // ========== 调整柱身 bodyNode ==========
        if (this.bodyNode) {
            this.bodyNode.height = height;
            this.bodyNode.y = 0;
        }
        
        // ========== 调整顶部装饰 top ==========
        // top 固定在 bodyNode 顶部，不随 topNode 移动
        if (this.top) {
            // top 锚点在底部中心(0.5, 0)，所以 y = bodyNode顶部 = height
            this.top.y = height;
        }
        
        // ========== 调整平台 topNode ==========
        if (this.topNode) {
            // topNode 初始位置在 bodyNode 顶部
            this.topNode.y = height;
        }
        
        // ========== 计算移动范围 ==========
        this.calculateMoveRange();
        
        // ========== 更新碰撞体（如果有的话）==========
        const collider = this.node.getComponent(cc.PhysicsBoxCollider);
        if (collider) {
            collider.size.height = height;
            collider.offset.y = height / 2;
            collider.apply();
        }
    },
    
    // 计算 topNode 移动范围
    calculateMoveRange() {
        // 最低位置：bodyNode 顶部
        this.topNodeMinY = this.pillarHeight;
        
        // 最高位置：top 图片一半高度处
        // top 的 Y 位置在 pillarHeight，如果 top 高度为 H，则一半高度处为 pillarHeight + H/2
        if (this.top) {
            const topHeight = this.top.height || 200;  // 假设 top 高度
            this.topNodeMaxY = this.pillarHeight + topHeight / 2;
        } else {
            // 没有 top 节点，默认移动范围 100 像素
            this.topNodeMaxY = this.pillarHeight + 100;
        }
        
        console.log('📏 移动范围: ', this.topNodeMinY.toFixed(0), '~', this.topNodeMaxY.toFixed(0));
    },
    
    // 开始移动
    startMoving() {
        if (this.isHit) return;
        this.isMoving = true;
        // 随机初始方向
        this.moveDirection = Math.random() > 0.5 ? 1 : -1;
    },
    
    // 停止移动（被击中时调用）
    stopMoving() {
        this.isMoving = false;
        this.isHit = true;
    },
    
    // 每帧更新
    update(dt) {
        if (!this.isMoving || this.isHit || !this.topNode || !this.enableMoving) return;
        
        // 移动 topNode（独立移动，不带动 top）
        const moveAmount = this.topNodeMoveSpeed * dt * this.moveDirection;
        this.topNode.y += moveAmount;
        
        // 边界检测，反向
        if (this.topNode.y >= this.topNodeMaxY) {
            this.topNode.y = this.topNodeMaxY;
            this.moveDirection = -1;
        } else if (this.topNode.y <= this.topNodeMinY) {
            this.topNode.y = this.topNodeMinY;
            this.moveDirection = 1;
        }
    },

    // 获取站立点的世界坐标
    getStandPointWorldPos() {
        if (this.standPoint) {
            return this.standPoint.convertToWorldSpaceAR(cc.v2(0, 0));
        }
        if (this.topNode) {
            return this.topNode.convertToWorldSpaceAR(cc.v2(0, 0));
        }
        return this.node.convertToWorldSpaceAR(cc.v2(0, this.pillarHeight));
    },

    // 检查水滴是否落在柱子顶部区域
    checkIfOnTop(waterDropPos) {
        const topY = this.node.y + this.pillarHeight;
        const topThreshold = 30;
        
        const isInXRange = Math.abs(waterDropPos.x - this.node.x) < 40;
        const isInYRange = Math.abs(waterDropPos.y - topY) < topThreshold;
        
        return isInXRange && isInYRange;
    }
});