cc.Class({
    extends: cc.Component,

    properties: {
        // 猴子预制体
        monkeyPrefab: cc.Prefab,
        // 水滴预制体
        waterDropPrefab: cc.Prefab,
        // 柱子预制体
        pillarPrefab: cc.Prefab,
        // 弹弓节点
        slingshotNode: cc.Node,
        // 预览线条节点
        previewLine: cc.Graphics,
        // 道路线条节点
        pathLine: cc.Graphics,
        
        // 柱子生成参数
        minPillarDistance: 200,  // 最小柱子间距
        maxPillarDistance: 400,  // 最大柱子间距
        minPillarHeight: 100,    // 最小柱子高度
        maxPillarHeight: 300,    // 最大柱子高度
        pillarWidth: 80,         // 柱子宽度
        
        // 发射参数
        launchPower: 10,         // 降低发射力量（原来是20，现在10）
        previewShotCount: 3,     // 前N次有预览线
        
        // UI
        shotCountLabel: cc.Label,
        scoreLabel: cc.Label
    },

    onLoad() {
        // 启用物理系统
        cc.director.getPhysicsManager().enabled = true;
        cc.director.getPhysicsManager().gravity = cc.v2(0, -300);  // 降低重力（原来是-980）
        
        // 启用碰撞系统
        cc.director.getCollisionManager().enabled = true;
        // cc.director.getCollisionManager().enabledDebugDraw = true;
        
        // 初始化变量
        this.pillars = [];
        this.currentShotCount = 0;
        this.score = 0;
        this.isDragging = false;
        this.isWaterDropFlying = false;
        this.isMonkeyMoving = false;
        this.pathPoints = [];
        
        // 初始化游戏
        this.initGame();
        
        // 监听触摸事件
       cc.Canvas.instance.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        cc.Canvas.instance.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        cc.Canvas.instance.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        cc.Canvas.instance.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    },

    initGame() {
        // 创建猴子
        this.createMonkey();
        
        // 生成初始柱子
        this.generatePillars();
        
        // 更新UI
        this.updateUI();
    },

    createMonkey() {
        if (this.monkey) {
            this.monkey.destroy();
        }
        
        this.monkey = cc.instantiate(this.monkeyPrefab);
        this.monkey.parent = this.node;
        this.monkeyStartPos = this.slingshotNode.position.add(cc.v2(0, 50));
        this.monkey.position = this.monkeyStartPos;
        
        // 保存猴子脚本引用
        this.monkeyScript = this.monkey.getComponent('Monkey');
    },

    generatePillars() {
        // 生成5根柱子
        let lastX = this.monkeyStartPos.x + 300;
        
        for (let i = 0; i < 5; i++) {
            const distance = this.minPillarDistance + 
                           Math.random() * (this.maxPillarDistance - this.minPillarDistance);
            const height = this.minPillarHeight + 
                         Math.random() * (this.maxPillarHeight - this.minPillarHeight);
            
            const pillar = cc.instantiate(this.pillarPrefab);
            pillar.parent = this.node;
            
            const x = lastX + distance;
            const y = -300; // 地面高度
            pillar.position = cc.v2(x, y);
            
            // 设置柱子高度
            const pillarScript = pillar.getComponent('Pillar');
            pillarScript.setHeight(height);
            pillarScript.gameManager = this;
            
            this.pillars.push(pillar);
            lastX = x;
        }
    },

    onTouchStart(event) {
        if (this.isWaterDropFlying || this.isMonkeyMoving) return;
        
        const touchPos = this.node.convertToNodeSpaceAR(event.getLocation());
        const distance = touchPos.sub(this.slingshotNode.position).mag();
        
        if (distance < 100) {
            this.isDragging = true;
            this.dragStartPos = touchPos;
        }
    },

    onTouchMove(event) {
        if (!this.isDragging) return;
        
        const touchPos = this.node.convertToNodeSpaceAR(event.getLocation());
        
        // 计算拖拽方向（向左下方拖，发射往右上方）
        let offset = touchPos.sub(this.slingshotNode.position);
        
        // 限制拖拽距离
        const maxDistance = 150;
        if (offset.mag() > maxDistance) {
            offset.normalizeSelf().mulSelf(maxDistance);
        }
        
        // 限制只能向左下方拖（这样发射就往右上方）
        if (offset.x > 0) offset.x = 0;  // 只能向左拖
        if (offset.y > 0) offset.y = 0;  // 只能向下拖
        
        this.currentDragPos = this.slingshotNode.position.add(offset);
        
        // 绘制预览线（前N次）
        if (this.currentShotCount < this.previewShotCount) {
            this.drawPreviewTrajectory(offset);
        } else {
            this.previewLine.clear();
        }
    },

    onTouchEnd(event) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.previewLine.clear();
        
        // 发射水滴
        this.launchWaterDrop();
    },

    drawPreviewTrajectory(dragOffset) {
        this.previewLine.clear();
        this.previewLine.strokeColor = cc.Color.BLUE.fromHEX('#00BFFF');
        this.previewLine.lineWidth = 3;
        
        // 计算发射速度
        const velocity = dragOffset.mul(-this.launchPower);
        
        // 模拟轨迹
        const steps = 50;
        const dt = 0.05;
        let pos = this.slingshotNode.position.clone();
        
        this.previewLine.moveTo(pos.x, pos.y);
        
        for (let i = 0; i < steps; i++) {
            velocity.y += cc.director.getPhysicsManager().gravity.y * dt;
            pos.x += velocity.x * dt;
            pos.y += velocity.y * dt;
            
            this.previewLine.lineTo(pos.x, pos.y);
            
            // 如果低于地面就停止
            if (pos.y < -300) break;
        }
        
        this.previewLine.stroke();
    },

    launchWaterDrop() {
        this.isWaterDropFlying = true;
        this.currentShotCount++;
        this.pathPoints = []; // 清空路径点
        
        // 创建水滴
        const waterDrop = cc.instantiate(this.waterDropPrefab);
        waterDrop.parent = this.node;
        waterDrop.position = this.slingshotNode.position;
        
        // 计算发射速度
        const dragOffset = this.currentDragPos.sub(this.slingshotNode.position);
        const velocity = dragOffset.mul(-this.launchPower);
        
        // 获取刚体并施加力
        const rigidBody = waterDrop.getComponent(cc.RigidBody);
        rigidBody.linearVelocity = velocity;
        
        // 保存水滴引用
        this.currentWaterDrop = waterDrop;
        const waterDropScript = waterDrop.getComponent('WaterDrop');
        waterDropScript.gameManager = this;
        
        // 记录轨迹
        this.recordTrajectory(waterDrop);
        
        this.updateUI();
    },

    recordTrajectory(waterDrop) {
        // 每帧记录水滴位置
        this.schedule(() => {
            if (waterDrop && waterDrop.isValid) {
                this.pathPoints.push(waterDrop.position.clone());
            }
        }, 0.05);
    },

    onWaterDropLanded(landedOnPillar, landPos) {
        this.isWaterDropFlying = false;
        this.unscheduleAllCallbacks();
        
        if (landedOnPillar) {
            console.log('落地咯')
            // 成功落在柱子上
            this.score += 100;
            this.drawPath();
            this.moveMonkeyAlongPath(landPos);
        } else {
            // 失败
            this.gameOver();
        }
    },

    drawPath() {
        this.pathLine.clear();
        this.pathLine.strokeColor = cc.Color.GREEN;
        this.pathLine.lineWidth = 8;
        
        if (this.pathPoints.length > 0) {
            this.pathLine.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
            
            for (let i = 1; i < this.pathPoints.length; i++) {
                this.pathLine.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
            }
            
            this.pathLine.stroke();
        }
    },

    moveMonkeyAlongPath(targetPos) {
        if (this.pathPoints.length === 0) return;
        
        this.isMonkeyMoving = true;
        
        // 计算路径总时间
        const duration = 2.0;
        
        // 创建移动动作
        const moveAction = cc.sequence(
            cc.spawn(
                // 沿路径移动
                this.createPathFollowAction(duration),
                // 播放行走动画（如果有）
                cc.repeat(
                    cc.sequence(
                        cc.scaleTo(0.1, 1.1, 0.9),
                        cc.scaleTo(0.1, 0.9, 1.1),
                        cc.scaleTo(0.1, 1, 1)
                    ),
                    Math.floor(duration / 0.3)
                )
            ),
            cc.callFunc(() => {
                this.monkey.position = targetPos;
                this.isMonkeyMoving = false;
                this.slingshotNode.position = targetPos.add(cc.v2(0, -50));
                
                // 清空路径
                this.pathLine.clear();
                
                // 移除已经过的柱子，生成新柱子
                this.updatePillars(targetPos.x);
            })
        );
        
        this.monkey.runAction(moveAction);
    },

    createPathFollowAction(duration) {
        // 创建沿路径移动的动作
        const actions = [];
        const pointCount = this.pathPoints.length;
        
        if (pointCount < 2) {
            return cc.delayTime(0);
        }
        
        const timePerSegment = duration / (pointCount - 1);
        
        for (let i = 1; i < pointCount; i++) {
            actions.push(cc.moveTo(timePerSegment, this.pathPoints[i]));
        }
        
        return cc.sequence(actions);
    },

    updatePillars(monkeyX) {
        // 移除已经过的柱子
        this.pillars = this.pillars.filter(pillar => {
            if (pillar.x < monkeyX - 200) {
                pillar.destroy();
                return false;
            }
            return true;
        });
        
        // 生成新柱子
        if (this.pillars.length < 5) {
            const lastPillar = this.pillars[this.pillars.length - 1];
            const lastX = lastPillar ? lastPillar.x : monkeyX;
            
            const distance = this.minPillarDistance + 
                           Math.random() * (this.maxPillarDistance - this.minPillarDistance);
            const height = this.minPillarHeight + 
                         Math.random() * (this.maxPillarHeight - this.minPillarHeight);
            
            const pillar = cc.instantiate(this.pillarPrefab);
            pillar.parent = this.node;
            pillar.position = cc.v2(lastX + distance, -300);
            
            const pillarScript = pillar.getComponent('Pillar');
            pillarScript.setHeight(height);
            pillarScript.gameManager = this;
            
            this.pillars.push(pillar);
        }
    },

    gameOver() {
        console.log('游戏结束！得分：' + this.score);
        
        // 显示游戏结束UI（可以后续添加）
        this.scheduleOnce(() => {
            this.restartGame();
        }, 2);
    },

    restartGame() {
        // 清理场景
        this.pillars.forEach(p => p.destroy());
        this.pillars = [];
        
        if (this.currentWaterDrop) {
            this.currentWaterDrop.destroy();
        }
        
        this.pathLine.clear();
        this.previewLine.clear();
        
        // 重置变量
        this.currentShotCount = 0;
        this.score = 0;
        this.slingshotNode.position = cc.v2(-400, -200);
        
        // 重新初始化
        this.initGame();
    },

    updateUI() {
        this.shotCountLabel.string = '发射次数: ' + this.currentShotCount;
        this.scoreLabel.string = '得分: ' + this.score;
    },

    onDestroy() {
        this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
});
