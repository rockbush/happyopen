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
        // 预览线条节点（可选，会自动创建）
        previewLine: cc.Graphics,
        // 道路线条节点（可选，会自动创建）
        pathLine: cc.Graphics,
        
        // 柱子生成参数
        minPillarDistance: 350,  // 【修改】最小柱子间距，从200改为350
        maxPillarDistance: 2000,  // 【修改】最大柱子间距，从400改为550
        minPillarHeight: 100,    // 最小柱子高度
        maxPillarHeight: 300,    // 最大柱子高度
        pillarWidth: 80,         // 柱子宽度
        
        // 发射参数
        launchPower: 14,         // 【修改】发射力量从10改为14
        
        // 【新增】猴子在屏幕左侧的固定位置（距离屏幕左边的像素）
        monkeyScreenOffsetX: 100,
        
        // UI
        shotCountLabel: cc.Label,
        scoreLabel: cc.Label
    },

    onLoad() {
        // 启用物理系统
        cc.director.getPhysicsManager().enabled = true;
        cc.director.getPhysicsManager().gravity = cc.v2(0, -500);
        
        // 启用碰撞系统
        cc.director.getCollisionManager().enabled = true;
        
        // 获取摄像机
        this.camera = cc.find('Canvas/Main Camera').getComponent(cc.Camera);
        if (!this.camera) {
            this.camera = cc.Camera.main;
        }
        this.cameraNode = this.camera.node;
        this.initialCameraX = this.cameraNode.x;
        
        // 【修改】计算屏幕宽度的一半，用于摄像机跟随计算
        this.screenHalfWidth = cc.winSize.width / 2;
        
        // 初始化变量
        this.pillars = [];
        this.currentShotCount = 0;
        this.score = 0;
        this.isDragging = false;
        this.isWaterDropFlying = false;
        this.isMonkeyMoving = false;
        this.pathPoints = [];
        
        // 【修改】把 Graphics 节点挂在 GameManager(this.node) 下
        // 这样它们会跟猴子在同一个坐标系，不需要坐标转换！
        
        if (!this.previewLine) {
            console.log('🎨 自动创建 PreviewLine（挂在 GameManager 下）');
            const previewNode = new cc.Node('PreviewLine');
            previewNode.parent = this.node;  // 【修改】挂在 this.node 下
            this.previewLine = previewNode.addComponent(cc.Graphics);
        }
        
        if (!this.pathLine) {
            console.log('🎨 自动创建 PathLine（挂在 GameManager 下）');
            const pathNode = new cc.Node('PathLine');
            pathNode.parent = this.node;  // 【修改】挂在 this.node 下
            this.pathLine = pathNode.addComponent(cc.Graphics);
        }
        
        // 初始化游戏
        this.initGame();
        
        // 获取 Canvas 节点
        this.canvas = cc.find('Canvas');
        
        // 绑定触摸监听
        this.bindTouchEvents();
    },
    
    bindTouchEvents() {
        console.log('🔧 绑定触摸事件');
        
        // 获取 Canvas 节点
        if (!this.canvas) {
            this.canvas = cc.find('Canvas');
        }
        
        // 先移除旧的监听
        this.canvas.off(cc.Node.EventType.TOUCH_START);
        this.canvas.off(cc.Node.EventType.TOUCH_MOVE);
        this.canvas.off(cc.Node.EventType.TOUCH_END);
        this.canvas.off(cc.Node.EventType.TOUCH_CANCEL);
        
        // 直接绑定，不使用 bind
        const self = this;
        
        this.canvas.on(cc.Node.EventType.TOUCH_START, function(event) {
            self.onTouchStart(event);
        }, this);
        
        this.canvas.on(cc.Node.EventType.TOUCH_MOVE, function(event) {
            self.onTouchMove(event);
        }, this);
        
        this.canvas.on(cc.Node.EventType.TOUCH_END, function(event) {
            self.onTouchEnd(event);
        }, this);
        
        this.canvas.on(cc.Node.EventType.TOUCH_CANCEL, function(event) {
            self.onTouchEnd(event);
        }, this);
        
        console.log('✅ 触摸事件绑定完成');
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
        
        // 【修改】猴子初始位置：屏幕左侧 + 偏移量
        // 摄像机在 x=0 时，屏幕左边缘是 -screenHalfWidth
        // 猴子位置 = -screenHalfWidth + monkeyScreenOffsetX
        const initialMonkeyX = -this.screenHalfWidth + this.monkeyScreenOffsetX;
        this.monkeyStartPos = cc.v2(initialMonkeyX, 0);  // 【修改】Y从-200改为0，猴子位置更高
        this.monkey.position = this.monkeyStartPos;
        
        // 弹弓在猴子下方
        this.slingshotNode.position = this.monkeyStartPos.add(cc.v2(0, -50));
        
        // 给猴子添加刚体（Kinematic 类型）
        let monkeyRigidBody = this.monkey.getComponent(cc.RigidBody);
        if (!monkeyRigidBody) {
            monkeyRigidBody = this.monkey.addComponent(cc.RigidBody);
        }
        monkeyRigidBody.type = cc.RigidBodyType.Kinematic;
        monkeyRigidBody.enabledContactListener = false;
        
        // 保存猴子脚本引用
        this.monkeyScript = this.monkey.getComponent('Monkey');
        
        console.log('🐵 猴子创建完成，位置:', this.monkey.position);
    },

    generatePillars() {
        // 生成初始柱子
        // 【修复】第一根柱子直接从猴子位置 + 固定距离开始
        let lastX = this.monkey.x;
        
        console.log('========== 开始生成柱子 ==========');
        console.log('猴子X位置:', this.monkey.x);
        console.log('minPillarDistance:', this.minPillarDistance);
        console.log('maxPillarDistance:', this.maxPillarDistance);
        
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
            
            const pillarScript = pillar.getComponent('Pillar');
            pillarScript.setHeight(height);
            pillarScript.gameManager = this;
            
            this.pillars.push(pillar);
            
            console.log('🏛️ 柱子', i + 1, '| 上一个X:', lastX.toFixed(0), '| 间距:', distance.toFixed(0), '| 当前X:', x.toFixed(0));
            
            lastX = x;
        }
        console.log('========== 柱子生成完成 ==========');
    },

    onTouchStart(event) {
        console.log('========== onTouchStart ==========');
        console.log('状态检查:');
        console.log('   - isWaterDropFlying:', this.isWaterDropFlying);
        console.log('   - isMonkeyMoving:', this.isMonkeyMoving);
        
        if (this.isWaterDropFlying || this.isMonkeyMoving) {
            console.log('❌ 状态不允许，跳过');
            return;
        }
        
        const touchPos = this.getTouchPosInWorld(event);
        
        // 【简化】弹弓位置 = 猴子位置下方50像素
        const slingshotPos = cc.v2(this.monkey.x, this.monkey.y - 50);
        
        const distance = touchPos.sub(slingshotPos).mag();
        
        console.log('位置信息:');
        console.log('   - 猴子位置:', this.monkey.x.toFixed(0), this.monkey.y.toFixed(0));
        console.log('   - 弹弓位置:', slingshotPos.x.toFixed(0), slingshotPos.y.toFixed(0));
        console.log('   - 触摸位置:', touchPos.x.toFixed(0), touchPos.y.toFixed(0));
        console.log('   - 距离:', distance.toFixed(0));
        
        // 在弹弓附近点击才开始拖拽
        if (distance < 150) {
            this.isDragging = true;
            this.dragStartPos = touchPos;
            console.log('✅ 开始拖拽');
        } else {
            console.log('❌ 点击位置离弹弓太远 (>' + 150 + ')，不开始拖拽');
        }
        console.log('========== onTouchStart 结束 ==========');
    },

    onTouchMove(event) {
        console.log('========== onTouchMove ==========');
        console.log('   - isDragging:', this.isDragging);
        
        if (!this.isDragging) {
            console.log('❌ 未在拖拽状态，跳过');
            return;
        }
        if (this.isWaterDropFlying || this.isMonkeyMoving) {
            console.log('❌ 水滴飞行中或猴子移动中，跳过');
            return;
        }
        
        const touchPos = this.getTouchPosInWorld(event);
        
        // 【简化】弹弓位置 = 猴子位置下方50像素
        const slingshotPos = cc.v2(this.monkey.x, this.monkey.y - 50);
        
        // 计算拖拽偏移
        let offset = touchPos.sub(slingshotPos);
        
        console.log('拖拽计算:');
        console.log('   - 弹弓位置:', slingshotPos.x.toFixed(0), slingshotPos.y.toFixed(0));
        console.log('   - 触摸位置:', touchPos.x.toFixed(0), touchPos.y.toFixed(0));
        console.log('   - 原始偏移:', offset.x.toFixed(0), offset.y.toFixed(0));
        
        // 限制拖拽距离
        const maxDistance = 150;
        if (offset.mag() > maxDistance) {
            offset.normalizeSelf().mulSelf(maxDistance);
        }
        
        // 限制只能向左拖（向右发射）
        if (offset.x > 0) offset.x = 0;
        
        console.log('   - 限制后偏移:', offset.x.toFixed(0), offset.y.toFixed(0));
        
        // 保存当前拖拽位置
        this.currentDragOffset = offset;
        this.currentDragPos = slingshotPos.add(offset);
        
        // 绘制预览轨迹
        this.drawPreviewTrajectory(offset);
        console.log('========== onTouchMove 结束 ==========');
    },
    
    // 触摸坐标转换方法
    getTouchPosInWorld(event) {
        const touchScreenPos = event.getLocation();
        const canvas = cc.find('Canvas');
        
        // 转换到 Canvas 坐标系
        // 【修改】因为不移动摄像机了，不需要加偏移
        let touchPos = canvas.convertToNodeSpaceAR(touchScreenPos);
        
        console.log('📍 触摸坐标:', touchPos.x.toFixed(0), touchPos.y.toFixed(0));
        
        return touchPos;
    },

    onTouchEnd(event) {
        if (!this.isDragging) return;
        
        console.log('🚀 松手，准备发射');
        
        this.isDragging = false;
        this.previewLine.clear();
        
        // 发射水滴
        this.launchWaterDrop();
    },

    drawPreviewTrajectory(dragOffset) {
        console.log('========== drawPreviewTrajectory ==========');
        console.log('   - dragOffset:', dragOffset.x.toFixed(0), dragOffset.y.toFixed(0));
        
        this.previewLine.clear();
        this.previewLine.strokeColor = cc.color(0, 191, 255); // 天蓝色
        this.previewLine.lineWidth = 3;
        
        // 计算发射速度
        const velocity = dragOffset.mul(-this.launchPower);
        
        // 【简化】直接用猴子位置，因为 PreviewLine 和猴子在同一个父节点下
        // 弹弓在猴子下方 50 像素
        let pos = cc.v2(this.monkey.x, this.monkey.y - 50);
        
        console.log('   - 猴子位置:', this.monkey.x.toFixed(0), this.monkey.y.toFixed(0));
        console.log('   - 绘制起点:', pos.x.toFixed(0), pos.y.toFixed(0));
        console.log('   - 发射速度:', velocity.x.toFixed(0), velocity.y.toFixed(0));
        
        // 模拟轨迹
        const steps = 60;
        const dt = 0.05;
        const gravity = cc.director.getPhysicsManager().gravity.y;
        
        let vel = velocity.clone();
        
        this.previewLine.moveTo(pos.x, pos.y);
        
        for (let i = 0; i < steps; i++) {
            vel.y += gravity * dt;
            pos.x += vel.x * dt;
            pos.y += vel.y * dt;
            
            this.previewLine.lineTo(pos.x, pos.y);
            
            // 低于地面停止
            if (pos.y < -350) break;
        }
        
        this.previewLine.stroke();
        console.log('   - 绘制终点:', pos.x.toFixed(0), pos.y.toFixed(0));
        console.log('========== drawPreviewTrajectory 结束 ==========');
    },

    launchWaterDrop() {
        console.log('🚀 发射水滴');
        
        // 清空旧路径
        this.pathLine.clear();
        this.pathPoints = [];
        
        this.isWaterDropFlying = true;
        this.currentShotCount++;
        
        // 创建水滴
        const waterDrop = cc.instantiate(this.waterDropPrefab);
        waterDrop.parent = this.node;
        waterDrop.position = this.slingshotNode.position.clone();
        
        // 计算发射速度
        const dragOffset = this.currentDragOffset || cc.v2(-50, 50);
        const velocity = dragOffset.mul(-this.launchPower);
        
        // 获取刚体并设置速度
        const rigidBody = waterDrop.getComponent(cc.RigidBody);
        if (rigidBody) {
            rigidBody.linearVelocity = velocity;
        }
        
        // 保存水滴引用
        this.currentWaterDrop = waterDrop;
        const waterDropScript = waterDrop.getComponent('WaterDrop');
        if (waterDropScript) {
            waterDropScript.gameManager = this;
        }
        
        // 记录轨迹
        this.recordTrajectory(waterDrop);
        
        this.updateUI();
    },

    recordTrajectory(waterDrop) {
        // 停止之前的轨迹记录
        if (this.trajectoryTimer) {
            this.unschedule(this.trajectoryTimer);
            this.trajectoryTimer = null;
        }
        
        // 添加起始点
        this.pathPoints.push(this.slingshotNode.position.clone());
        
        // 定时记录水滴位置
        this.scheduleOnce(() => {
            const recordFunc = () => {
                if (waterDrop && waterDrop.isValid && !this.isMonkeyMoving) {
                    const pos = waterDrop.position.clone();
                    if (pos.y > -500) {
                        this.pathPoints.push(pos);
                    }
                }
            };
            
            this.trajectoryTimer = this.schedule(recordFunc, 0.03);
        }, 0.05);
    },

    onWaterDropLanded(landedOnPillar, landPos) {
        this.isWaterDropFlying = false;
        
        // 停止轨迹记录
        if (this.trajectoryTimer) {
            this.unschedule(this.trajectoryTimer);
            this.trajectoryTimer = null;
        }
        
        console.log('💧 水滴落地，命中柱子:', landedOnPillar, '路径点数:', this.pathPoints.length);
        
        if (landedOnPillar) {
            // 成功命中柱子顶部
            this.score += 100;
            this.updateUI();
            
            // 找到目标柱子
            let targetPillar = null;
            for (let i = 0; i < this.pillars.length; i++) {
                const pillar = this.pillars[i];
                if (!pillar || !pillar.isValid) continue;
                
                if (Math.abs(landPos.x - pillar.x) < 60) {
                    targetPillar = pillar;
                    break;
                }
            }
            
            if (targetPillar) {
                const pillarScript = targetPillar.getComponent('Pillar');
                // 【修改】猴子目标位置：站在 topNode 上面
                // topNode 的 Y 位置 = pillar.y + pillarHeight
                // topNode 高度是 20，所以顶部是 topNode.y + 10
                // 猴子站在 topNode 顶部，再加上猴子高度的一半（假设猴子高度约50）
                const topNodeY = targetPillar.y + pillarScript.pillarHeight;
                const topNodeHalfHeight = 10;  // topNode 高度20的一半
                const monkeyHalfHeight = 100;   // 【修改】猴子高度的一半，从25改为100
                const targetY = topNodeY + topNodeHalfHeight + monkeyHalfHeight;
                const finalTargetPos = cc.v2(targetPillar.x, targetY);
                
                console.log('🎯 目标位置:', finalTargetPos);
                
                // 绘制路径
                this.drawPath();
                
                // 移动猴子
                this.scheduleOnce(() => {
                    this.moveMonkeyAlongPath(finalTargetPos);
                }, 0.1);
            }
        } else {
            // 没命中，清空路径点，可以继续发射
            console.log('❌ 未命中，再试一次');
            this.pathPoints = [];
        }
    },

    drawPath() {
        console.log('🛤️ 绘制路径，点数:', this.pathPoints.length);
        
        if (!this.pathLine) return;
        
        this.pathLine.clear();
        this.pathLine.strokeColor = cc.Color.GREEN;
        this.pathLine.lineWidth = 8;
        
        // 【简化】PathLine 和 pathPoints 都在 GameManager 坐标系下，直接画
        if (this.pathPoints.length > 1) {
            this.pathLine.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
            
            for (let i = 1; i < this.pathPoints.length; i++) {
                this.pathLine.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
            }
            
            this.pathLine.stroke();
        }
    },

    moveMonkeyAlongPath(targetPos) {
        if (this.pathPoints.length === 0) {
            console.error('没有路径点');
            return;
        }
        
        console.log('🐵 猴子开始移动到:', targetPos.x.toFixed(0), targetPos.y.toFixed(0));
        
        this.isMonkeyMoving = true;
        
        const duration = 2.0;
        
        // 计算需要移动的距离
        const monkeyStartX = this.monkey.x;
        const moveDistance = targetPos.x - monkeyStartX;
        
        console.log('移动距离:', moveDistance.toFixed(0));
        
        // 【新增】摄像机平滑跟随猴子移动
        if (this.cameraNode) {
            const cameraTargetX = this.cameraNode.x + moveDistance;
            const cameraAction = cc.moveTo(duration, cameraTargetX, this.cameraNode.y).easing(cc.easeInOut(2.0));
            this.cameraNode.runAction(cameraAction);
        }
        
        // 创建猴子移动动作（猴子沿路径走）
        const moveAction = cc.sequence(
            cc.spawn(
                this.createPathFollowAction(duration),
                // 行走动画
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
                // 猴子到达后，把整个世界往左移动，让猴子回到屏幕左侧
                this.shiftWorldLeft(moveDistance, targetPos);
            })
        );
        
        this.monkey.runAction(moveAction);
    },
    
    // 把整个世界往左移动
    shiftWorldLeft(distance, monkeyTargetPos) {
        console.log('🌍 移动世界，距离:', distance.toFixed(0));
        
        // 移动猴子
        this.monkey.x -= distance;
        
        // 移动所有柱子
        for (let i = 0; i < this.pillars.length; i++) {
            if (this.pillars[i] && this.pillars[i].isValid) {
                this.pillars[i].x -= distance;
            }
        }
        
        // 移动弹弓节点
        this.slingshotNode.x -= distance;
        
        // 移动路径点
        for (let i = 0; i < this.pathPoints.length; i++) {
            this.pathPoints[i].x -= distance;
        }
        
        // 【关键】把摄像机也移回原位（瞬间移动，因为世界整体左移了，视觉上无变化）
        if (this.cameraNode) {
            this.cameraNode.x = this.initialCameraX;
        }
        
        // 重新绘制路径（因为坐标变了）
        this.drawPath();
        
        // 调用到达处理
        const newMonkeyPos = cc.v2(monkeyTargetPos.x - distance, monkeyTargetPos.y);
        this.onMonkeyArrived(newMonkeyPos);
    },
    
    // 【新增】猴子到达目标后的处理
    onMonkeyArrived(targetPos) {
        console.log('🐵 猴子到达:', targetPos.x.toFixed(0), targetPos.y.toFixed(0));
        
        // 更新猴子位置
        this.monkey.position = targetPos.clone();
        
        // 更新弹弓位置（在猴子下方50像素）
        this.slingshotNode.position = cc.v2(targetPos.x, targetPos.y - 50);
        
        // 保存新位置
        this.monkeyStartPos = this.monkey.position.clone();
        
        // 重置状态
        this.isMonkeyMoving = false;
        this.isWaterDropFlying = false;
        this.isDragging = false;
        this.pathPoints = [];
        
        // 延迟清空路径线
        this.scheduleOnce(() => {
            this.pathLine.clear();
        }, 0.5);
        
        // 更新柱子（删除旧的，生成新的）
        this.updatePillars(targetPos.x);
        
        console.log('✅ 状态重置完成，猴子位置:', this.monkey.x.toFixed(0), this.monkey.y.toFixed(0));
    },

    createPathFollowAction(duration) {
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
        console.log('========== 更新柱子 ==========');
        console.log('猴子X:', monkeyX.toFixed(0));
        console.log('当前柱子数量:', this.pillars.length);
        
        // 【修改】删除猴子左边很远的柱子（因为不移动摄像机了，直接用猴子位置判断）
        this.pillars = this.pillars.filter(pillar => {
            if (pillar.x < monkeyX - 500) {
                console.log('🗑️ 删除旧柱子，位置:', pillar.x.toFixed(0));
                pillar.destroy();
                return false;
            }
            return true;
        });
        
        // 生成新柱子（保持前方有足够柱子）
        while (this.pillars.length < 8) {
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
            
            console.log('🏛️ 新柱子 | 间距:', distance.toFixed(0), '| 位置X:', pillar.x.toFixed(0));
        }
        console.log('========== 柱子更新完成，总数:', this.pillars.length, '==========');
    },

    gameOver() {
        console.log('💀 游戏结束，得分:', this.score);
        
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
        
        // 重置摄像机
        this.cameraNode.x = this.initialCameraX;
        
        // 重置变量
        this.currentShotCount = 0;
        this.score = 0;
        
        // 重新初始化
        this.initGame();
    },

    updateUI() {
        if (this.shotCountLabel) {
            this.shotCountLabel.string = '发射: ' + this.currentShotCount;
        }
        if (this.scoreLabel) {
            this.scoreLabel.string = '得分: ' + this.score;
        }
    },

    onDestroy() {
        // 移除触摸事件
        if (this.canvas) {
            this.canvas.off(cc.Node.EventType.TOUCH_START, this._touchStartHandler);
            this.canvas.off(cc.Node.EventType.TOUCH_MOVE, this._touchMoveHandler);
            this.canvas.off(cc.Node.EventType.TOUCH_END, this._touchEndHandler);
            this.canvas.off(cc.Node.EventType.TOUCH_CANCEL, this._touchEndHandler);
        }
    }
});