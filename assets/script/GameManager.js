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
        minPillarDistance: 200,  // 最小柱子间距
        maxPillarDistance: 500,  // 最大柱子间距
        minPillarHeight: 100,    // 最小柱子高度
        maxPillarHeight: 300,    // 最大柱子高度
        pillarWidth: 80,         // 柱子宽度
        
        // 发射参数
        launchPower: 14,         // 发射力量
        
        // 猴子在屏幕左侧的固定位置（距离屏幕左边的像素）
        monkeyScreenOffsetX: 100,
        
        // UI
        shotCountLabel: cc.Label,
        scoreLabel: cc.Label,
        
        // 【新增】无限背景节点
        infiniteBackground: cc.Node,
        
        // 【新增】彩虹路径节点
        rainbowPath: cc.Node,
        
        // 【新增】调试模式：允许拖拽查看场景
        debugCameraDrag: {
            default: true,
            tooltip: '开启后可以拖拽查看整个场景'
        },
        
        // 【新增】初始柱子数量
        initialPillarCount: {
            default: 8,
            tooltip: '游戏开始时生成多少根柱子'
        },
        
        // 【新增】摄像机拖拽灵敏度
        cameraDragSensitivity: {
            default: 0.6,
            tooltip: '摄像机拖拽灵敏度，越小移动越慢'
        },
        
        // 【新增】惯性衰减系数（越小惯性越大）
        cameraInertiaDecay: {
            default: 0.92,
            tooltip: '惯性衰减系数，0.9-0.98之间，越大滑动越远'
        }
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
        
        // 计算屏幕宽度的一半
        this.screenHalfWidth = cc.winSize.width / 2;
        this.screenHalfHeight = cc.winSize.height / 2;
        
        // 初始化变量
        this.pillars = [];
        this.currentShotCount = 0;
        this.score = 0;
        this.isDragging = false;
        this.isWaterDropFlying = false;
        this.isMonkeyMoving = false;
        this.pathPoints = [];
        
        // 【新增】摄像机拖拽相关变量
        this.isCameraDragging = false;
        this.cameraDragStartPos = null;
        this.cameraStartX = 0;
        this.cameraStartY = 0;
        this.cameraVelocity = cc.v2(0, 0);  // 摄像机速度（用于惯性）
        this.lastTouchPos = null;
        this.lastTouchTime = 0;
        
        // 把 Graphics 节点挂在 GameManager(this.node) 下
        if (!this.previewLine) {
            const previewNode = new cc.Node('PreviewLine');
            previewNode.parent = this.node;
            this.previewLine = previewNode.addComponent(cc.Graphics);
        }
        
        if (!this.pathLine) {
            const pathNode = new cc.Node('PathLine');
            pathNode.parent = this.node;
            this.pathLine = pathNode.addComponent(cc.Graphics);
        }
        
        // 初始化游戏
        this.initGame();
        
        // 获取 Canvas 节点
        this.canvas = cc.find('Canvas');
        
        // 绑定触摸监听
        this.bindTouchEvents();
        
        // 打印世界信息
        this.printWorldInfo();
    },
    
    // 打印世界信息
    printWorldInfo() {
        console.log('========== 世界信息 ==========');
        console.log('屏幕尺寸:', cc.winSize.width, 'x', cc.winSize.height);
        console.log('柱子数量:', this.pillars.length);
        console.log('调试摄像机拖拽:', this.debugCameraDrag ? '开启' : '关闭');
        console.log('💡 提示: 在远离弹弓的地方拖拽可以移动摄像机');
        console.log('💡 提示: 按 R 键重置摄像机位置');
        console.log('===============================');
    },
    
    bindTouchEvents() {
        if (!this.canvas) {
            this.canvas = cc.find('Canvas');
        }
        
        // 先移除旧的监听
        this.canvas.off(cc.Node.EventType.TOUCH_START);
        this.canvas.off(cc.Node.EventType.TOUCH_MOVE);
        this.canvas.off(cc.Node.EventType.TOUCH_END);
        this.canvas.off(cc.Node.EventType.TOUCH_CANCEL);
        
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
        
        // 键盘事件
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },
    
    // 键盘按下
    onKeyDown(event) {
        // 按 R 键重置摄像机
        if (event.keyCode === cc.macro.KEY.r) {
            this.resetCameraPosition();
        }
    },
    
    // 重置摄像机位置（带动画）
    resetCameraPosition() {
        console.log('📷 重置摄像机位置');
        this.cameraVelocity = cc.v2(0, 0);
        
        // 平滑移动回初始位置
        this.cameraNode.stopAllActions();
        this.cameraNode.runAction(
            cc.moveTo(0.3, this.initialCameraX, 0).easing(cc.easeOut(2.0))
        );
    },
    
    // 【新增】每帧更新，处理摄像机惯性
    update(dt) {
        // 如果有惯性速度，继续移动摄像机（只处理X轴）
        if (!this.isCameraDragging && Math.abs(this.cameraVelocity.x) > 0.5) {
            this.cameraNode.x += this.cameraVelocity.x;
            
            // 衰减速度
            this.cameraVelocity.x *= this.cameraInertiaDecay;
            
            // 限制摄像机范围
            this.clampCameraPosition();
        }
    },
    
    // 限制摄像机位置范围（只限制X轴）
    clampCameraPosition() {
        // 找到最远的柱子
        let maxX = 0;
        for (let i = 0; i < this.pillars.length; i++) {
            if (this.pillars[i] && this.pillars[i].x > maxX) {
                maxX = this.pillars[i].x;
            }
        }
        
        // 限制范围：左边不能超过初始位置太多，右边不能超过最远柱子
        const minCameraX = this.initialCameraX - this.screenHalfWidth;
        const maxCameraX = maxX + this.screenHalfWidth;
        
        if (this.cameraNode.x < minCameraX) {
            this.cameraNode.x = minCameraX;
            this.cameraVelocity.x = 0;
        }
        if (this.cameraNode.x > maxCameraX) {
            this.cameraNode.x = maxCameraX;
            this.cameraVelocity.x = 0;
        }
    },

    initGame() {
        this.createMonkey();
        this.generatePillars();
        this.updateUI();
    },

    createMonkey() {
        if (this.monkey) {
            this.monkey.destroy();
        }
        
        this.monkey = cc.instantiate(this.monkeyPrefab);
        this.monkey.parent = this.node;
        
        const initialMonkeyX = -this.screenHalfWidth + this.monkeyScreenOffsetX;
        this.monkeyStartPos = cc.v2(initialMonkeyX, 0);
        this.monkey.position = this.monkeyStartPos;
        
        this.slingshotNode.position = this.monkeyStartPos.add(cc.v2(0, -50));
        
        let monkeyRigidBody = this.monkey.getComponent(cc.RigidBody);
        if (!monkeyRigidBody) {
            monkeyRigidBody = this.monkey.addComponent(cc.RigidBody);
        }
        monkeyRigidBody.type = cc.RigidBodyType.Kinematic;
        monkeyRigidBody.enabledContactListener = false;
        
        this.monkeyScript = this.monkey.getComponent('Monkey');
        
        console.log('🐵 猴子创建完成，位置:', this.monkey.position);
    },

    generatePillars() {
        let lastX = this.monkey.x;
        
        console.log('========== 开始生成柱子 ==========');
        
        for (let i = 0; i < this.initialPillarCount; i++) {
            // 【修改】第一根柱子距离固定较近，后面的随机
            let distance;
            if (i === 0) {
                // 第一根柱子距离猴子 250-350 像素，确保在屏幕内
                distance = 250 + Math.random() * 100;
            } else {
                distance = this.minPillarDistance + 
                           Math.random() * (this.maxPillarDistance - this.minPillarDistance);
            }
            
            const height = this.minPillarHeight + 
                         Math.random() * (this.maxPillarHeight - this.minPillarHeight);
            
            const pillar = cc.instantiate(this.pillarPrefab);
            pillar.parent = this.node;
            
            const x = lastX + distance;
            const y = -300;
            pillar.position = cc.v2(x, y);
            
            const pillarScript = pillar.getComponent('Pillar');
            pillarScript.setHeight(height);
            pillarScript.gameManager = this;
            
            this.pillars.push(pillar);
            
            const isOnScreen = x >= -this.screenHalfWidth && x <= this.screenHalfWidth;
            console.log('🏛️ 柱子', i + 1, '| X:', x.toFixed(0), '| 间距:', distance.toFixed(0), '|', isOnScreen ? '📺 屏幕内' : '🔭 屏幕外');
            
            lastX = x;
        }
        
        console.log('========== 柱子生成完成，最远:', lastX.toFixed(0), '==========');
    },

    // 判断触摸点是否在弹弓附近
    isTouchNearSlingshot(touchPos) {
        const slingshotPos = cc.v2(this.monkey.x, this.monkey.y - 50);
        const distance = touchPos.sub(slingshotPos).mag();
        return distance < 150;
    },

    onTouchStart(event) {
        // 停止惯性
        this.cameraVelocity = cc.v2(0, 0);
        this.cameraNode.stopAllActions();
        
        const touchPos = this.getTouchPosInWorld(event);
        
        // 记录触摸信息（用于计算惯性）
        this.lastTouchPos = event.getLocation();
        this.lastTouchTime = Date.now();
        
        // 如果在弹弓附近，并且游戏状态允许，则开始拖拽弹弓
        if (!this.isWaterDropFlying && !this.isMonkeyMoving && this.isTouchNearSlingshot(touchPos)) {
            this.isDragging = true;
            this.isCameraDragging = false;
            this.dragStartPos = touchPos;
            console.log('🎯 开始拖拽弹弓');
        } 
        // 否则，如果调试模式开启，开始拖拽摄像机
        else if (this.debugCameraDrag) {
            this.isCameraDragging = true;
            this.isDragging = false;
            this.cameraDragStartPos = event.getLocation();
            this.cameraStartX = this.cameraNode.x;
            this.cameraStartY = this.cameraNode.y;
            console.log('📷 开始拖拽摄像机');
        }
    },

    onTouchMove(event) {
        const currentPos = event.getLocation();
        const currentTime = Date.now();
        
        // 拖拽摄像机
        if (this.isCameraDragging && this.debugCameraDrag) {
            const deltaX = (this.cameraDragStartPos.x - currentPos.x) * this.cameraDragSensitivity;
            // 【修改】只允许水平移动，不改变Y轴
            
            this.cameraNode.x = this.cameraStartX + deltaX;
            // this.cameraNode.y 保持不变
            
            // 计算速度（用于惯性），只计算X轴
            if (this.lastTouchPos && currentTime - this.lastTouchTime > 0) {
                const dt = (currentTime - this.lastTouchTime) / 1000;
                this.cameraVelocity.x = (this.lastTouchPos.x - currentPos.x) * this.cameraDragSensitivity / dt * 0.016;
                this.cameraVelocity.y = 0;  // Y轴速度始终为0
            }
            
            this.lastTouchPos = currentPos;
            this.lastTouchTime = currentTime;
            
            this.clampCameraPosition();
            return;
        }
        
        // 拖拽弹弓
        if (!this.isDragging) return;
        if (this.isWaterDropFlying || this.isMonkeyMoving) return;
        
        const touchPos = this.getTouchPosInWorld(event);
        const slingshotPos = cc.v2(this.monkey.x, this.monkey.y - 50);
        
        let offset = touchPos.sub(slingshotPos);
        
        const maxDistance = 150;
        if (offset.mag() > maxDistance) {
            offset.normalizeSelf().mulSelf(maxDistance);
        }
        
        if (offset.x > 0) offset.x = 0;
        
        this.currentDragOffset = offset;
        this.currentDragPos = slingshotPos.add(offset);
        
        this.drawPreviewTrajectory(offset);
    },
    
    getTouchPosInWorld(event) {
        const touchScreenPos = event.getLocation();
        const canvas = cc.find('Canvas');
        
        let touchPos = canvas.convertToNodeSpaceAR(touchScreenPos);
        
        // 加上摄像机偏移
        touchPos.x += this.cameraNode.x;
        touchPos.y += this.cameraNode.y;
        
        return touchPos;
    },

    onTouchEnd(event) {
        // 结束摄像机拖拽（惯性会在 update 中继续处理）
        if (this.isCameraDragging) {
            console.log('📷 结束摄像机拖拽，惯性速度:', this.cameraVelocity.x.toFixed(1), this.cameraVelocity.y.toFixed(1));
            this.isCameraDragging = false;
            this.cameraDragStartPos = null;
            return;
        }
        
        if (!this.isDragging) return;
        
        console.log('🚀 松手，准备发射');
        
        this.isDragging = false;
        this.previewLine.clear();
        
        this.launchWaterDrop();
    },

    drawPreviewTrajectory(dragOffset) {
        this.previewLine.clear();
        this.previewLine.strokeColor = cc.color(0, 191, 255);
        this.previewLine.lineWidth = 3;
        
        const velocity = dragOffset.mul(-this.launchPower);
        let pos = cc.v2(this.monkey.x, this.monkey.y - 50);
        
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
            
            if (pos.y < -350) break;
        }
        
        this.previewLine.stroke();
    },

    launchWaterDrop() {
        console.log('🚀 发射水滴');
        
        // 【新增】发射时重置摄像机到初始位置
        this.cameraVelocity = cc.v2(0, 0);
        this.cameraNode.stopAllActions();
        this.cameraNode.runAction(
            cc.moveTo(0.2, this.initialCameraX, 0).easing(cc.easeOut(2.0))
        );
        
        this.pathLine.clear();
        this.pathPoints = [];
        
        this.isWaterDropFlying = true;
        this.currentShotCount++;
        
        const waterDrop = cc.instantiate(this.waterDropPrefab);
        waterDrop.parent = this.node;
        waterDrop.position = this.slingshotNode.position.clone();
        
        const dragOffset = this.currentDragOffset || cc.v2(-50, 50);
        const velocity = dragOffset.mul(-this.launchPower);
        
        const rigidBody = waterDrop.getComponent(cc.RigidBody);
        if (rigidBody) {
            rigidBody.linearVelocity = velocity;
        }
        
        this.currentWaterDrop = waterDrop;
        const waterDropScript = waterDrop.getComponent('WaterDrop');
        if (waterDropScript) {
            waterDropScript.gameManager = this;
        }
        
        this.recordTrajectory(waterDrop);
        
        this.updateUI();
    },

    recordTrajectory(waterDrop) {
        if (this.trajectoryTimer) {
            this.unschedule(this.trajectoryTimer);
            this.trajectoryTimer = null;
        }
        
        this.pathPoints.push(this.slingshotNode.position.clone());
        
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
        
        if (this.trajectoryTimer) {
            this.unschedule(this.trajectoryTimer);
            this.trajectoryTimer = null;
        }
        
        console.log('💧 水滴落地，命中柱子:', landedOnPillar);
        
        if (landedOnPillar) {
            this.score += 100;
            this.updateUI();
            
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
                const topNodeY = targetPillar.y + pillarScript.pillarHeight;
                const topNodeHalfHeight = 10;
                const monkeyHalfHeight = 100;
                const targetY = topNodeY + topNodeHalfHeight + monkeyHalfHeight;
                const finalTargetPos = cc.v2(targetPillar.x, targetY);
                
                console.log('🎯 目标位置:', finalTargetPos);
                
                this.drawPath();
                
                this.scheduleOnce(() => {
                    this.moveMonkeyAlongPath(finalTargetPos);
                }, 0.1);
            }
        } else {
            console.log('❌ 未命中，再试一次');
            this.pathPoints = [];
        }
    },

    drawPath() {
        console.log('🛤️ 绘制路径，点数:', this.pathPoints.length);
        
        // 使用彩虹路径绘制
        if (this.rainbowPath) {
            const rainbowScript = this.rainbowPath.getComponent('RainbowPath');
            if (rainbowScript) {
                rainbowScript.setPath(this.pathPoints);
                return;
            }
        }
        
        // 如果没有彩虹路径，使用原来的绿色线条
        if (!this.pathLine) return;
        
        this.pathLine.clear();
        this.pathLine.strokeColor = cc.Color.GREEN;
        this.pathLine.lineWidth = 8;
        
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
        
        const monkeyStartX = this.monkey.x;
        const moveDistance = targetPos.x - monkeyStartX;
        
        console.log('移动距离:', moveDistance.toFixed(0));
        
        // 【新增】摄像机跟随猴子移动
        if (this.cameraNode) {
            this.cameraNode.stopAllActions();
            const cameraTargetX = this.cameraNode.x + moveDistance;
            const cameraAction = cc.moveTo(duration, cameraTargetX, this.cameraNode.y).easing(cc.easeInOut(2.0));
            this.cameraNode.runAction(cameraAction);
        }
        
        const moveAction = cc.sequence(
            cc.spawn(
                this.createPathFollowAction(duration),
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
                this.shiftWorldLeft(moveDistance, targetPos);
            })
        );
        
        this.monkey.runAction(moveAction);
    },
    
    shiftWorldLeft(distance, monkeyTargetPos) {
        console.log('🌍 移动世界，距离:', distance.toFixed(0));
        
        this.monkey.x -= distance;
        
        for (let i = 0; i < this.pillars.length; i++) {
            if (this.pillars[i] && this.pillars[i].isValid) {
                this.pillars[i].x -= distance;
            }
        }
        
        this.slingshotNode.x -= distance;
        
        for (let i = 0; i < this.pathPoints.length; i++) {
            this.pathPoints[i].x -= distance;
        }
        
        // 【新增】通知背景也左移
        if (this.infiniteBackground) {
            const bgScript = this.infiniteBackground.getComponent('InfiniteBackground');
            if (bgScript) {
                bgScript.shiftLeft(distance);
            }
        }
        
        // 【新增】通知彩虹路径也左移
        if (this.rainbowPath) {
            const rainbowScript = this.rainbowPath.getComponent('RainbowPath');
            if (rainbowScript) {
                rainbowScript.shiftLeft(distance);
            }
        }
        
        if (this.cameraNode) {
            this.cameraNode.x = this.initialCameraX;
        }
        
        this.drawPath();
        
        const newMonkeyPos = cc.v2(monkeyTargetPos.x - distance, monkeyTargetPos.y);
        this.onMonkeyArrived(newMonkeyPos);
    },
    
    onMonkeyArrived(targetPos) {
        console.log('🐵 猴子到达:', targetPos.x.toFixed(0), targetPos.y.toFixed(0));
        
        this.monkey.position = targetPos.clone();
        
        this.slingshotNode.position = cc.v2(targetPos.x, targetPos.y - 50);
        
        this.monkeyStartPos = this.monkey.position.clone();
        
        this.isMonkeyMoving = false;
        this.isWaterDropFlying = false;
        this.isDragging = false;
        this.pathPoints = [];
        
        this.scheduleOnce(() => {
            this.pathLine.clear();
            // 清除彩虹路径
            if (this.rainbowPath) {
                const rainbowScript = this.rainbowPath.getComponent('RainbowPath');
                if (rainbowScript) {
                    rainbowScript.clear();
                }
            }
        }, 0.5);
        
        this.updatePillars(targetPos.x);
        
        console.log('✅ 状态重置完成');
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
        
        this.pillars = this.pillars.filter(pillar => {
            if (pillar.x < monkeyX - 500) {
                console.log('🗑️ 删除旧柱子，位置:', pillar.x.toFixed(0));
                pillar.destroy();
                return false;
            }
            return true;
        });
        
        while (this.pillars.length < this.initialPillarCount) {
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
            
            console.log('🏛️ 新柱子 | X:', pillar.x.toFixed(0));
        }
        console.log('========== 柱子更新完成 ==========');
    },

    gameOver() {
        console.log('💀 游戏结束，得分:', this.score);
        
        this.scheduleOnce(() => {
            this.restartGame();
        }, 2);
    },

    restartGame() {
        this.pillars.forEach(p => p.destroy());
        this.pillars = [];
        
        if (this.currentWaterDrop) {
            this.currentWaterDrop.destroy();
        }
        
        this.pathLine.clear();
        this.previewLine.clear();
        
        this.cameraNode.x = this.initialCameraX;
        this.cameraVelocity = cc.v2(0, 0);
        
        this.currentShotCount = 0;
        this.score = 0;
        
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
        if (this.canvas) {
            this.canvas.off(cc.Node.EventType.TOUCH_START);
            this.canvas.off(cc.Node.EventType.TOUCH_MOVE);
            this.canvas.off(cc.Node.EventType.TOUCH_END);
            this.canvas.off(cc.Node.EventType.TOUCH_CANCEL);
        }
        
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }
});