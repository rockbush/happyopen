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

        // 柱子生成参数（1280宽屏幕，一屏2~4个柱子）
        minPillarDistance: 320,  // 最小柱子间距（一屏约4个）
        maxPillarDistance: 640,  // 最大柱子间距（一屏约2个）
        minPillarHeight: 100,    // 最小柱子高度
        maxPillarHeight: 300,    // 最大柱子高度
        pillarWidth: 80,         // 柱子宽度

        // 发射参数
        launchPower: 20,         // 发射力量

        // 猴子在屏幕左侧的固定位置（距离屏幕左边的像素）
        monkeyScreenOffsetX: 180,

        // UI
        scoreLabel: cc.Label,

        // 【新增】无限背景节点
        infiniteBackground: cc.Node,

        // 【新增】彩虹路径节点
        rainbowPath: cc.Node,

        // 【新增】拖拽指示器节点
        dragIndicator: cc.Node,

        // 【新增】弹弓拖拽指示器节点
        slingshotIndicator: cc.Node,

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
        },

        // 【v2新增】拖拽虚线节点
        dragLine: {
            default: null,
            type: cc.Node,
            tooltip: '拖拽虚线节点（挂载DragLine脚本）'
        },

        // 【v3新增】海浪背景节点
        infiniteWave: {
            default: null,
            type: cc.Node,
            tooltip: '海浪背景节点（挂载InfiniteWave脚本）'
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

        // 【v6修复】使用设计分辨率，而不是实际屏幕尺寸
        const designWidth = 1280;
        const designHeight = 720;
        this.designHalfWidth = designWidth / 2;   // 640
        this.designHalfHeight = designHeight / 2; // 360

        // 实际屏幕尺寸（用于某些需要实际尺寸的地方）
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
        this.walkSoundId = -1;  // 【v8新增】走路音效ID

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

        // 摄像机位置：让猴子显示在屏幕左侧 monkeyScreenOffsetX 的位置
        this.initialCameraX = this.monkey.x + this.designHalfWidth - this.monkeyScreenOffsetX;
        this.cameraNode.x = this.initialCameraX;

        // 获取 Canvas 节点
        this.canvas = cc.find('Canvas');

        // 绑定触摸监听
        this.bindTouchEvents();

        // 打印世界信息
        this.printWorldInfo();
        
        // 【v8新增】播放背景音乐
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playMusicBundle('background', 'audio');
        }
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

        this.canvas.on(cc.Node.EventType.TOUCH_START, function (event) {
            self.onTouchStart(event);
        }, this);

        this.canvas.on(cc.Node.EventType.TOUCH_MOVE, function (event) {
            self.onTouchMove(event);
        }, this);

        this.canvas.on(cc.Node.EventType.TOUCH_END, function (event) {
            self.onTouchEnd(event);
        }, this);

        this.canvas.on(cc.Node.EventType.TOUCH_CANCEL, function (event) {
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

    // ==========================
    // 关键改动：初始化时先创建猴子，再创建“起始柱子”，再生成右侧随机柱子
    // ==========================
    initGame() {
        this.createMonkey();

        // 【新增】在猴子正下方生成一根柱子，顶部对齐猴子底部
        this.createStartPillarUnderMonkey();

        // 【修改】右侧生成柱子时，从起始柱子X作为 lastX 开始
        this.generatePillars();

        this.updateUI();
    },

    createMonkey() {
        if (this.monkey) {
            this.monkey.destroy();
        }

        this.monkey = cc.instantiate(this.monkeyPrefab);
        this.monkey.parent = this.node;

        // 猴子位置：离屏幕左边 monkeyScreenOffsetX 像素
        const initialMonkeyX = -this.designHalfWidth + this.monkeyScreenOffsetX;
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

        console.log('🐵 猴子创建完成，位置:', this.monkey.position, '屏幕偏移:', this.monkeyScreenOffsetX);
    },

    // 【新增】起始柱子：让猴子站在standPoint位置
    createStartPillarUnderMonkey() {
        if (!this.pillarPrefab || !this.monkey) return;

        // 避免重复创建（重开/重置时）
        if (this.startPillar && this.startPillar.isValid) {
            this.startPillar.destroy();
            this.startPillar = null;
        }

        const pillar = cc.instantiate(this.pillarPrefab);
        pillar.parent = this.node;

        const pillarScript = pillar.getComponent('Pillar');
        pillarScript.gameManager = this;
        
        // 【v8新增】起始柱子不移动、不随机缩放
        pillarScript.enableMoving = false;
        pillar.scale = 1.0;  // 固定缩放为1

        // 起始柱子高度
        const extra = 200;
        let height = this.minPillarHeight + Math.random() * (this.maxPillarHeight - this.minPillarHeight);
        height += extra;
        pillarScript.setHeight(height);

        const pillarHeight = pillarScript.pillarHeight != null ? pillarScript.pillarHeight : height;

        // 如果有 standPoint，用它来对齐猴子位置
        if (pillarScript.standPoint) {
            // standPoint 在 topNode 下的本地坐标
            const standLocalPos = pillarScript.standPoint.position;
            // topNode 的 Y 位置 = pillarHeight
            // standPoint 世界坐标相对于柱子 = (topNode.x + standPoint.x, topNode.y + standPoint.y)
            // 柱子位置需要满足：猴子位置 = 柱子位置 + standPoint相对柱子的偏移
            // 所以：柱子X = 猴子X - standPoint.x
            //      柱子Y = 猴子Y - (pillarHeight + standPoint.y)
            const pillarX = this.monkey.x - standLocalPos.x;
            const pillarY = this.monkey.y - pillarHeight - standLocalPos.y;
            pillar.position = cc.v2(pillarX, pillarY);
        } else {
            // 兜底：原来的对齐方式
            const monkeyBottomY = this.monkey.y;
            const topNodeHalfHeight = 10;
            const pillarY = monkeyBottomY - pillarHeight - topNodeHalfHeight;
            pillar.position = cc.v2(this.monkey.x, pillarY);
        }

        // 放进 pillars 队列，作为第 0 根柱子
        this.pillars.unshift(pillar);
        this.startPillar = pillar;

        console.log('🏁 起始柱子生成 | x=', pillar.x.toFixed(0), ' y=', pillar.y.toFixed(0), ' height=', pillarHeight.toFixed(0));
    },

    generatePillars() {
        // 【修改】从起始柱子 X 开始往右生成；如果没有起始柱子，则用猴子 X
        let lastX = (this.startPillar && this.startPillar.isValid) ? this.startPillar.x : this.monkey.x;

        console.log('========== 开始生成柱子 ==========');

        // 【修改】由于我们已经有了起始柱子，所以右侧再生成 initialPillarCount-1 根
        const needCount = Math.max(0, this.initialPillarCount - 1);

        for (let i = 0; i < needCount; i++) {
            let distance;
            if (i === 0) {
                // 第一根右侧柱子距离近一点，确保在屏幕内
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
            // 右侧柱子的基准地面仍沿用你的 -360
            const y = -360;
            pillar.position = cc.v2(x, y);

            const pillarScript = pillar.getComponent('Pillar');
            pillarScript.setHeight(height);
            pillarScript.gameManager = this;

            this.pillars.push(pillar);

            const isOnScreen = x >= -this.designHalfWidth && x <= this.designHalfWidth;
            console.log('🏛️ 柱子', (i + 1), '| X:', x.toFixed(0), '| 间距:', distance.toFixed(0), '|', isOnScreen ? '📺 屏幕内' : '🔭 屏幕外');

            lastX = x;
        }

        console.log('========== 柱子生成完成，最远:', lastX.toFixed(0), '==========');
    },

    // 判断触摸点是否在猴子身上
    isTouchOnMonkey(touchPos) {
        if (!this.monkey) return false;

        const monkeyX = this.monkey.x;
        const monkeyY = this.monkey.y;
        const monkeyWidth = 150;
        const monkeyHeight = 200;

        const left = monkeyX - monkeyWidth / 2;
        const right = monkeyX + monkeyWidth / 2;
        const bottom = monkeyY;
        const top = monkeyY + monkeyHeight;

        return touchPos.x >= left && touchPos.x <= right &&
            touchPos.y >= bottom && touchPos.y <= top;
    },

    onTouchStart(event) {
        // 停止惯性
        this.cameraVelocity = cc.v2(0, 0);
        this.cameraNode.stopAllActions();

        const touchPos = this.getTouchPosInWorld(event);

        // 记录触摸信息（用于计算惯性）
        this.lastTouchPos = event.getLocation();
        this.lastTouchTime = Date.now();

        if (!this.isWaterDropFlying && !this.isMonkeyMoving && this.isTouchOnMonkey(touchPos)) {
            this.isDragging = true;
            this.isCameraDragging = false;
            this.dragStartPos = touchPos;

            if (this.slingshotIndicator) {
                const script = this.slingshotIndicator.getComponent('SlingshotIndicator');
                if (script) script.showDragging(touchPos);
            }

            if (this.monkeyScript) {
                this.monkeyScript.startDragging();
            }
            
            // 【v8新增】播放拖拽音效
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSoundBundle('drift', 'audio');
            }
            
            console.log('🎯 开始拖拽');
        }
        else if (this.debugCameraDrag) {
            this.isCameraDragging = true;
            this.isDragging = false;
            this.cameraDragStartPos = event.getLocation();
            this.cameraStartX = this.cameraNode.x;
            this.cameraStartY = this.cameraNode.y;

            if (this.dragIndicator) {
                const script = this.dragIndicator.getComponent('DragIndicator');
                if (script) script.show(this.cameraDragStartPos);
            }
            console.log('📷 开始拖拽摄像机');
        }
    },

    onTouchMove(event) {
        const currentPos = event.getLocation();
        const currentTime = Date.now();

        // 拖拽摄像机
        if (this.isCameraDragging && this.debugCameraDrag) {
            const deltaX = (this.cameraDragStartPos.x - currentPos.x) * this.cameraDragSensitivity;
            this.cameraNode.x = this.cameraStartX + deltaX;

            if (this.lastTouchPos && currentTime - this.lastTouchTime > 0) {
                const dt = (currentTime - this.lastTouchTime) / 1000;
                this.cameraVelocity.x = (this.lastTouchPos.x - currentPos.x) * this.cameraDragSensitivity / dt * 0.016;
                this.cameraVelocity.y = 0;
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

        if (this.slingshotIndicator) {
            const script = this.slingshotIndicator.getComponent('SlingshotIndicator');
            if (script) script.updatePosition(this.currentDragPos);
        }

        if (this.monkeyScript) {
            this.monkeyScript.setHeadDirection(offset);
        }

        if (this.dragLine && this.monkeyScript) {
            const dragLineScript = this.dragLine.getComponent('DragLine');
            if (dragLineScript) {
                const headTop = this.monkeyScript.getHeadTopPosition();
                const headBottom = this.monkeyScript.getHeadBottomPosition();
                dragLineScript.show(headTop, headBottom, this.currentDragPos);
            }
        }

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
        if (this.isCameraDragging) {
            console.log('📷 结束摄像机拖拽，惯性速度:', this.cameraVelocity.x.toFixed(1), this.cameraVelocity.y.toFixed(1));
            this.isCameraDragging = false;
            this.cameraDragStartPos = null;

            if (this.dragIndicator) {
                const script = this.dragIndicator.getComponent('DragIndicator');
                if (script) script.hide();
            }
            return;
        }

        if (!this.isDragging) return;

        console.log('🚀 松手，准备发射');

        if (this.slingshotIndicator && this.currentDragPos) {
            const script = this.slingshotIndicator.getComponent('SlingshotIndicator');
            if (script) script.showRelease(this.currentDragPos);
        }

        this.isDragging = false;
        this.previewLine.clear();

        if (this.dragLine) {
            const dragLineScript = this.dragLine.getComponent('DragLine');
            if (dragLineScript) {
                dragLineScript.hide();
            }
        }

        if (this.monkeyScript) {
            this.monkeyScript.resetHeadDirection();
            this.monkeyScript.stopDragging();
        }

        // 【v8新增】播放发射音效
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSoundBundle('shot', 'audio');
        }

        this.launchWaterDrop();
    },

    drawPreviewTrajectory(dragOffset) {
        this.previewLine.clear();
        this.previewLine.strokeColor = cc.Color.WHITE;
        this.previewLine.lineWidth = 3;

        const velocity = dragOffset.mul(-this.launchPower);
        let pos = this.monkeyScript ? this.monkeyScript.getLaunchPosition() : cc.v2(this.monkey.x, this.monkey.y + 100);

        const steps = 80;
        const dt = 1 / 60;
        const gravity = cc.director.getPhysicsManager().gravity.y;

        let vel = velocity.clone();

        // 虚线参数
        const dashLength = 15;    // 实线段长度
        const gapLength = 10;     // 空隙长度
        let drawDistance = 0;     // 累计绘制距离
        let lastPos = pos.clone();
        let isDrawing = true;     // 当前是否在绘制实线段

        this.previewLine.moveTo(pos.x, pos.y);

        for (let i = 0; i < steps; i++) {
            vel.y += gravity * dt;
            pos.x += vel.x * dt;
            pos.y += vel.y * dt;

            // 计算这一步的距离
            const segmentDist = pos.sub(lastPos).mag();
            drawDistance += segmentDist;

            // 虚线逻辑
            if (isDrawing) {
                this.previewLine.lineTo(pos.x, pos.y);
                if (drawDistance >= dashLength) {
                    drawDistance = 0;
                    isDrawing = false;
                }
            } else {
                this.previewLine.moveTo(pos.x, pos.y);
                if (drawDistance >= gapLength) {
                    drawDistance = 0;
                    isDrawing = true;
                }
            }

            lastPos = pos.clone();

            if (pos.y < -400) break;
        }

        this.previewLine.stroke();
    },

    launchWaterDrop() {
        console.log('🚀 发射水滴');

        // 发射时重置摄像机到初始位置
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
        waterDrop.position = this.monkeyScript ? this.monkeyScript.getLaunchPosition() : this.slingshotNode.position.clone();

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

        const startPos = this.monkeyScript ? this.monkeyScript.getLaunchPosition() : this.slingshotNode.position.clone();
        this.pathPoints.push(startPos);

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
            
            // 【v8新增】播放命中音效
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSoundBundle('bome', 'audio');
            }

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
                
                // 【v8新增】命中后停止topNode移动
                if (pillarScript.stopMoving) {
                    pillarScript.stopMoving();
                }
                
                // 使用 standPoint 计算目标位置
                let finalTargetPos;
                if (pillarScript.standPoint) {
                    // 获取 standPoint 的世界坐标，转换到游戏节点坐标系
                    const standWorldPos = pillarScript.getStandPointWorldPos();
                    finalTargetPos = this.node.convertToNodeSpaceAR(standWorldPos);
                } else {
                    // 兜底：使用原来的计算方式
                    const topNodeY = targetPillar.y + pillarScript.pillarHeight;
                    const topNodeHalfHeight = 10;
                    const monkeyOffsetY = 5;
                    const targetY = topNodeY + topNodeHalfHeight + monkeyOffsetY;
                    finalTargetPos = cc.v2(targetPillar.x, targetY);
                }

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

        if (this.rainbowPath) {
            const rainbowScript = this.rainbowPath.getComponent('RainbowPath');
            if (rainbowScript) {
                rainbowScript.setPath(this.pathPoints);
                return;
            }
        }

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

        if (this.monkeyScript && this.pathPoints && this.pathPoints.length > 0) {
            let cloudHeight = 35;
            if (this.rainbowPath) {
                const rainbowScript = this.rainbowPath.getComponent('RainbowPath');
                if (rainbowScript) {
                    cloudHeight = rainbowScript.cloudHeight;
                }
            }
            const targetY = this.pathPoints[0].y + cloudHeight;

            this.monkeyScript.playJumpAnimation(() => {
                this.startWalkToTarget(targetPos);
            }, targetY);
        } else {
            this.startWalkToTarget(targetPos);
        }
    },

    startWalkToTarget(targetPos) {
        const duration = 2.0;

        const monkeyStartX = this.monkey.x;
        const moveDistance = targetPos.x - monkeyStartX;

        console.log('移动距离:', moveDistance.toFixed(0));

        if (this.monkeyScript) {
            this.monkeyScript.playWalkAnimation();
        }
        
        // 【v8新增】播放走路音效（循环）
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSoundBundle('walk', 'audio', true, (audioId) => {
                this.walkSoundId = audioId;
            });
        }

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

        if (this.infiniteBackground) {
            const bgScript = this.infiniteBackground.getComponent('InfiniteBackground');
            if (bgScript) {
                bgScript.shiftLeft(distance);
            }
        }

        if (this.rainbowPath) {
            const rainbowScript = this.rainbowPath.getComponent('RainbowPath');
            if (rainbowScript) {
                rainbowScript.shiftLeft(distance);
            }
        }

        if (this.infiniteWave) {
            const waveScript = this.infiniteWave.getComponent('InfiniteWave');
            if (waveScript) {
                waveScript.shiftLeft(distance);
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

        if (this.monkeyScript) {
            this.monkeyScript.stopWalkAnimation();
        }
        
        // 【v8新增】停止走路音效
        if (typeof AudioManager !== 'undefined' && this.walkSoundId >= 0) {
            AudioManager.stopSoundById(this.walkSoundId);
            this.walkSoundId = -1;
        }

        this.isWaterDropFlying = false;
        this.isDragging = false;
        this.pathPoints = [];

        this.scheduleOnce(() => {
            this.pathLine.clear();
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
            pillar.position = cc.v2(lastX + distance, -360);

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