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
        maxPillarDistance: 400,  // 最大柱子间距
        minPillarHeight: 100,    // 最小柱子高度
        maxPillarHeight: 300,    // 最大柱子高度
        pillarWidth: 80,         // 柱子宽度
        
        // 发射参数
        launchPower: 10,         // 降低发射力量（原来是20，现在10）
        previewShotCount: 999,   // 增加到999，基本上每次都有预览线
        
        // UI
        shotCountLabel: cc.Label,
        scoreLabel: cc.Label
    },

    onLoad() {
        // 启用物理系统
        cc.director.getPhysicsManager().enabled = true;
        cc.director.getPhysicsManager().gravity = cc.v2(0, -500);  // 降低重力（原来是-980）
        
        // 启用碰撞系统
        cc.director.getCollisionManager().enabled = true;
        // cc.director.getCollisionManager().enabledDebugDraw = true;
        
        // 获取摄像机
        this.camera = cc.find('Canvas/Main Camera').getComponent(cc.Camera);
        if (!this.camera) {
            this.camera = cc.Camera.main;
        }
        this.cameraNode = this.camera.node;
        this.initialCameraX = this.cameraNode.x;  // 保存初始摄像机位置
        this.shouldFollowMonkey = false;  // 第一次移动后才开始跟随
        
        // 初始化变量
        this.pillars = [];
        this.currentShotCount = 0;
        this.score = 0;
        this.isDragging = false;
        this.isWaterDropFlying = false;
        this.isMonkeyMoving = false;
        this.pathPoints = [];
        
        // 如果没有 PreviewLine 和 PathLine，自动创建在 Canvas 节点下（不是 GameManager 下）
        const canvas = cc.find('Canvas');
        
        if (!this.previewLine) {
            console.log('🎨 自动创建 PreviewLine（在 Canvas 下）');
            const previewNode = new cc.Node('PreviewLine');
            previewNode.parent = canvas;  // 挂在 Canvas 下
            this.previewLine = previewNode.addComponent(cc.Graphics);
        }
        
        if (!this.pathLine) {
            console.log('🎨 自动创建 PathLine（在 Canvas 下）');
            const pathNode = new cc.Node('PathLine');
            pathNode.parent = canvas;  // 挂在 Canvas 下
            this.pathLine = pathNode.addComponent(cc.Graphics);
        }
        
        console.log('📍 PreviewLine 父节点:', this.previewLine.node.parent.name);
        console.log('📍 PathLine 父节点:', this.pathLine.node.parent.name);
        
        // 初始化游戏
        this.initGame();
        
        // 获取 Canvas 节点
        this.canvas = cc.find('Canvas');
        
        // 绑定触摸监听
        this.bindTouchEvents();
    },
    
    bindTouchEvents() {
        console.log('🔧 绑定触摸事件');
        
        if (!this.canvas) {
            this.canvas = cc.find('Canvas');
        }
        
        if (this.canvas) {
            // 先移除旧的监听
            this.canvas.off(cc.Node.EventType.TOUCH_START);
            this.canvas.off(cc.Node.EventType.TOUCH_MOVE);
            this.canvas.off(cc.Node.EventType.TOUCH_END);
            this.canvas.off(cc.Node.EventType.TOUCH_CANCEL);
            
            console.log('旧监听已移除');
            
            // 使用 bind 确保 this 指向正确
            const touchStartHandler = this.onTouchStart.bind(this);
            const touchMoveHandler = this.onTouchMove.bind(this);
            const touchEndHandler = this.onTouchEnd.bind(this);
            
            // 保存引用，方便后续移除
            this._touchStartHandler = touchStartHandler;
            this._touchMoveHandler = touchMoveHandler;
            this._touchEndHandler = touchEndHandler;
            
            // 重新添加监听
            this.canvas.on(cc.Node.EventType.TOUCH_START, touchStartHandler);
            this.canvas.on(cc.Node.EventType.TOUCH_MOVE, touchMoveHandler);
            this.canvas.on(cc.Node.EventType.TOUCH_END, touchEndHandler);
            this.canvas.on(cc.Node.EventType.TOUCH_CANCEL, touchEndHandler);
            
            console.log('✅ 所有触摸事件已重新绑定（使用 bind）');
            console.log('- TOUCH_START:', !!touchStartHandler);
            console.log('- TOUCH_MOVE:', !!touchMoveHandler);
            console.log('- TOUCH_END:', !!touchEndHandler);
            
            // 测试：3秒后输出是否还能接收触摸
            this.scheduleOnce(() => {
                console.log('⏰ 3秒测试：Canvas节点是否有效:', !!this.canvas);
                console.log('⏰ 3秒测试：触摸监听数量:', this.canvas._touchListener ? '有' : '无');
            }, 3);
        } else {
            console.error('❌ 找不到 Canvas 节点！');
        }
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
        
        // 给猴子添加刚体（Kinematic 类型，不受重力影响，不会碰撞反弹）
        let monkeyRigidBody = this.monkey.getComponent(cc.RigidBody);
        if (!monkeyRigidBody) {
            monkeyRigidBody = this.monkey.addComponent(cc.RigidBody);
        }
        monkeyRigidBody.type = cc.RigidBodyType.Kinematic;  // 关键：Kinematic 类型
        monkeyRigidBody.enabledContactListener = false;  // 不监听碰撞
        
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
        console.log('👆 TouchMove 触发 - 第', this.currentShotCount + 1, '次准备发射');
        console.log('   - isDragging:', this.isDragging);
        console.log('   - isWaterDropFlying:', this.isWaterDropFlying);
        console.log('   - isMonkeyMoving:', this.isMonkeyMoving);
        console.log('   - 摄像机X:', this.cameraNode ? this.cameraNode.x : 'null');
        console.log('   - 猴子X:', this.monkey.x);
        console.log('   - shouldFollowMonkey:', this.shouldFollowMonkey);
        
        // 如果没有 isDragging 但触摸移动了，尝试重新检测
        if (!this.isDragging && !this.isWaterDropFlying && !this.isMonkeyMoving) {
            console.log('⚠️ TouchMove 但未拖拽，尝试启动拖拽');
            
            // 简化：只要不在飞行和移动状态，就允许拖拽
            // 不再检查距离，直接启动
            this.isDragging = true;
            console.log('✅ 强制启动拖拽（无条件）');
        }
        
        if (!this.isDragging) {
            console.log('❌ isDragging = false，跳过处理');
            return;
        }
        
        console.log('💫 开始处理拖拽移动');
        
        // 获取触摸的屏幕坐标
        const touchScreenPos = event.getLocation();
        
        // 关键修复：触摸坐标需要加上摄像机偏移！
        // 因为摄像机移动后，Canvas 的原点相对于屏幕已经偏移了
        const canvas = cc.find('Canvas');
        const cameraOffset = this.cameraNode ? this.cameraNode.x : 0;
        
        // 触摸点在 Canvas 坐标系中的真实位置 = 屏幕坐标 + 摄像机偏移
        const touchPos = canvas.convertToNodeSpaceAR(touchScreenPos);
        touchPos.x += cameraOffset;  // 加上摄像机的偏移量
        
        console.log('📱 触摸屏幕坐标:', touchScreenPos.x.toFixed(1), touchScreenPos.y.toFixed(1));
        console.log('📹 摄像机偏移:', cameraOffset.toFixed(1));
        
        // 弹弓位置转换为 Canvas 坐标系
        const slingshotWorldPos = this.slingshotNode.parent.convertToWorldSpaceAR(this.slingshotNode.position);
        const slingshotCanvasPos = canvas.convertToNodeSpaceAR(slingshotWorldPos);
        
        console.log('🖱️ 修正后触摸(Canvas):', touchPos.x.toFixed(1), touchPos.y.toFixed(1));
        console.log('🎯 弹弓位置(Canvas):', slingshotCanvasPos.x.toFixed(1), slingshotCanvasPos.y.toFixed(1));
        
        // 计算拖拽方向（向左下方拖，发射往右上方）
        let offset = touchPos.sub(slingshotCanvasPos);
        
        console.log('📐 原始偏移:', offset.x.toFixed(1), offset.y.toFixed(1));
        
        // 限制拖拽距离
        const maxDistance = 150;
        if (offset.mag() > maxDistance) {
            offset.normalizeSelf().mulSelf(maxDistance);
        }
        
        // 限制只能向左拖
        if (offset.x > 0) offset.x = 0;
        // 注意：不限制Y，让玩家可以上下调整角度
        
        console.log('📐 限制后偏移:', offset.x.toFixed(1), offset.y.toFixed(1));
        
        // 转回坐标系保存
        const offsetWorld = canvas.convertToWorldSpaceAR(slingshotCanvasPos.add(offset));
        this.currentDragPos = this.slingshotNode.parent.convertToNodeSpaceAR(offsetWorld);
        
        console.log('✅ 拖拽位置已更新:', this.currentDragPos.x.toFixed(1), this.currentDragPos.y.toFixed(1));
        
        // 绘制预览线（前N次）
                   this.drawPreviewTrajectory(offset);

    },

    onTouchEnd(event) {
        console.log('TouchEnd 触发，isDragging:', this.isDragging);
        
        if (!this.isDragging) return;
        
        console.log('松手，准备发射');
        
        this.isDragging = false;
        
        // 清除预览线
        this.previewLine.clear();
        
        // 发射水滴
        this.launchWaterDrop();
    },

    drawPreviewTrajectory(dragOffset) {
        console.log('🎨 开始绘制预览轨迹');
        console.log('🎯 弹弓位置(局部):', this.slingshotNode.position.x, this.slingshotNode.position.y);
        console.log('📏 拖拽偏移:', dragOffset.x, dragOffset.y);
        
        this.previewLine.clear();
        this.previewLine.strokeColor = cc.Color.BLUE.fromHEX('#00BFFF');
        this.previewLine.lineWidth = 3;
        
        // 计算发射速度
        const velocity = dragOffset.mul(-this.launchPower);
        
        console.log('🚀 发射速度:', velocity.x, velocity.y);
        
        // 转换为 Canvas 坐标系（因为 PreviewLine 在 Canvas 下）
        const canvas = cc.find('Canvas');
        const slingshotWorldPos = this.slingshotNode.parent.convertToWorldSpaceAR(this.slingshotNode.position);
        let pos = canvas.convertToNodeSpaceAR(slingshotWorldPos);
        
        console.log('🎯 绘制起点(Canvas):', pos.x, pos.y);
        
        // 模拟轨迹
        const steps = 50;
        const dt = 0.05;
        
        this.previewLine.moveTo(pos.x, pos.y);
        
        let pointCount = 0;
        for (let i = 0; i < steps; i++) {
            velocity.y += cc.director.getPhysicsManager().gravity.y * dt;
            pos.x += velocity.x * dt;
            pos.y += velocity.y * dt;
            
            this.previewLine.lineTo(pos.x, pos.y);
            pointCount++;
            
            // 如果低于地面就停止
            if (pos.y < -300) break;
        }
        
        this.previewLine.stroke();
        console.log('✅ 预览线绘制完成，点数:', pointCount);
    },

    launchWaterDrop() {
        console.log('🚀🚀🚀 准备发射水滴');
        console.log('   - 当前发射次数:', this.currentShotCount);
        console.log('   - 即将成为第', this.currentShotCount + 1, '次发射');
        console.log('   - isWaterDropFlying:', this.isWaterDropFlying);
        console.log('   - isMonkeyMoving:', this.isMonkeyMoving);
        console.log('   - isDragging:', this.isDragging);
        
        // 先清空旧的路径线
        this.pathLine.clear();
        
        this.isWaterDropFlying = true;
        this.currentShotCount++;
        
        // 在发射前彻底清空路径点数组
        this.pathPoints = [];
        
        console.log('发射水滴前清空路径点，数量:', this.pathPoints.length);
        console.log('✅ 发射水滴，当前发射次数:', this.currentShotCount);
        
        // 创建水滴
        const waterDrop = cc.instantiate(this.waterDropPrefab);
        waterDrop.parent = this.node;
        waterDrop.position = this.slingshotNode.position.clone();
        
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
        
        console.log('发射水滴，当前发射次数:', this.currentShotCount);
        
        this.updateUI();
    },

    recordTrajectory(waterDrop) {
        console.log('准备记录轨迹，当前弹弓位置:', this.slingshotNode.position);
        
        // 停止之前的轨迹记录（如果有）
        if (this.trajectoryTimer) {
            this.unschedule(this.trajectoryTimer);
            this.trajectoryTimer = null;
        }
        
        // 手动添加起始点（弹弓位置）
        this.pathPoints.push(this.slingshotNode.position.clone());
        
        // 延迟一小段时间再开始记录，避免第一帧数据异常
        this.scheduleOnce(() => {
            // 定义记录函数
            const recordFunc = () => {
                if (waterDrop && waterDrop.isValid && !this.isMonkeyMoving) {
                    const pos = waterDrop.position.clone();
                    // 过滤异常点（Y坐标过小）
                    if (pos.y > -1000) {
                        this.pathPoints.push(pos);
                    }
                }
            };
            
            // 每帧记录水滴位置
            this.trajectoryTimer = this.schedule(recordFunc, 0.03);
        }, 0.05);  // 延迟 0.05 秒开始记录
    },

    onWaterDropLanded(landedOnPillar, landPos) {
        this.isWaterDropFlying = false;
        
        // 只停止轨迹记录定时器，不停止所有定时器
        if (this.trajectoryTimer) {
            this.unschedule(this.trajectoryTimer);
            this.trajectoryTimer = null;
        }
        
        console.log('水滴落地，命中:', landedOnPillar, '路径点数量:', this.pathPoints.length);
        
        if (landedOnPillar) {
            // 成功落在柱子顶部
            this.score += 100;
            this.updateUI();
            
            // 找到水滴落在哪个柱子上
            let targetPillar = null;
            for (let i = 0; i < this.pillars.length; i++) {
                const pillar = this.pillars[i];
                if (!pillar || !pillar.isValid) continue;
                
                const pillarScript = pillar.getComponent('Pillar');
                if (!pillarScript) continue;
                
                // 检查水滴是否在这个柱子上
                if (Math.abs(landPos.x - pillar.x) < 60) {
                    targetPillar = pillar;
                    break;
                }
            }
            
            if (targetPillar) {
                const pillarScript = targetPillar.getComponent('Pillar');
                // 计算猴子的目标位置：柱子顶部 + 一定高度
                const targetY = targetPillar.y + pillarScript.pillarHeight + 150;  // 站在顶部上方150像素
                const finalTargetPos = cc.v2(landPos.x, targetY);
                
                console.log('目标柱子位置:', targetPillar.position, '高度:', pillarScript.pillarHeight);
                console.log('猴子目标位置:', finalTargetPos);
                
                // 绘制路径
                this.drawPath();
                
                // 延迟一下再移动猴子，确保路径绘制完成
                this.scheduleOnce(() => {
                    this.moveMonkeyAlongPath(finalTargetPos);
                }, 0.1);
            } else {
                console.error('找不到目标柱子！');
            }
        } else {
            // 没有落在柱子顶部，可以继续发射（不算失败）
            console.log('没打中，再试一次！');
            // 清空路径点，准备下一次发射
            this.pathPoints = [];
            // 如果要恢复失败判定，取消下面这行的注释：
            // this.gameOver();
        }
    },

    drawPath() {
        console.log('开始绘制路径，路径点数量:', this.pathPoints.length);
        
        if (!this.pathLine) {
            console.error('PathLine 节点不存在！');
            return;
        }
        
        this.pathLine.clear();
        this.pathLine.strokeColor = cc.Color.GREEN;
        this.pathLine.lineWidth = 8;
        
        if (this.pathPoints.length > 1) {
            // 转换为 Canvas 坐标系（因为 PathLine 在 Canvas 下）
            const canvas = cc.find('Canvas');
            const canvasPoints = [];
            
            for (let i = 0; i < this.pathPoints.length; i++) {
                // pathPoints 是在 GameManager 坐标系下的
                const worldPos = this.node.convertToWorldSpaceAR(this.pathPoints[i]);
                const canvasPos = canvas.convertToNodeSpaceAR(worldPos);
                canvasPoints.push(canvasPos);
            }
            
            console.log('第一个点(Canvas):', canvasPoints[0].x, canvasPoints[0].y);
            console.log('最后一个点(Canvas):', canvasPoints[canvasPoints.length - 1].x, canvasPoints[canvasPoints.length - 1].y);
            
            this.pathLine.moveTo(canvasPoints[0].x, canvasPoints[0].y);
            
            for (let i = 1; i < canvasPoints.length; i++) {
                this.pathLine.lineTo(canvasPoints[i].x, canvasPoints[i].y);
            }
            
            this.pathLine.stroke();
            console.log('路径绘制完成');
        } else {
            console.warn('路径点不足，无法绘制，当前点数:', this.pathPoints.length);
        }
    },

    moveMonkeyAlongPath(targetPos) {
        if (this.pathPoints.length === 0) {
            console.error('没有路径点，无法移动猴子');
            return;
        }
        
        console.log('猴子开始移动，路径点数量:', this.pathPoints.length);
        
        this.isMonkeyMoving = true;
        
        // 计算路径总时间
        const duration = 2.0;
        
        // 计算摄像机需要移动的距离
        const startMonkeyX = this.monkey.x;
        const endMonkeyX = targetPos.x;
        const cameraMoveDistance = endMonkeyX - startMonkeyX;
        
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
                console.log('猴子到达目标位置:', targetPos);
                
                // 更新猴子位置
                this.monkey.position = targetPos.clone();
                
                // 更新弹弓位置到猴子下方
                this.slingshotNode.position = targetPos.clone().add(cc.v2(0, -50));
                
                // 保存新的起始位置
                this.monkeyStartPos = this.monkey.position.clone();
                this.slingshotPos = this.slingshotNode.position.clone();
                
                console.log('新的弹弓位置:', this.slingshotNode.position);
                console.log('重置状态：isMonkeyMoving = false, isWaterDropFlying = false');
                
                // 确保状态重置
                this.isMonkeyMoving = false;
                this.isWaterDropFlying = false;  // 确保这个也重置
                this.isDragging = false;  // 确保拖拽状态重置
                
                // 第一次移动后，开始摄像机跟随
                this.shouldFollowMonkey = true;
                
                // 立即清空路径点，为下一次发射做准备
                this.pathPoints = [];
                
                // 延迟清空路径线的绘制
                this.scheduleOnce(() => {
                    this.pathLine.clear();
                }, 0.5);
                
                // 移除已经过的柱子，生成新柱子
                this.updatePillars(targetPos.x);
                
                // 不再重新绑定触摸事件，避免 TOUCH_START 丢失
                // this.scheduleOnce(() => {
                //     this.bindTouchEvents();
                //     console.log('触摸事件重新绑定完成');
                // }, 0.1);
            })
        );
        
        // 如果已经开始跟随，同时移动摄像机（使用缓动）
        if (this.shouldFollowMonkey && this.cameraNode) {
            const cameraStartX = this.cameraNode.x;
            const cameraEndX = cameraStartX + cameraMoveDistance;
            
            // 使用 easeInOut 缓动，让移动更丝滑
            const cameraAction = cc.moveTo(duration, cameraEndX, this.cameraNode.y).easing(cc.easeInOut(2.0));
            this.cameraNode.runAction(cameraAction);
        }
        
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
        // 删除屏幕外左边很远的柱子（节省性能）
        const cameraX = this.cameraNode ? this.cameraNode.x : 0;
        this.pillars = this.pillars.filter(pillar => {
            if (pillar.x < cameraX - 800) {  // 在摄像机左边800像素外的删除
                pillar.destroy();
                return false;
            }
            return true;
        });
        
        // 生成新柱子（保持前方有足够的柱子）
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
            
            console.log('生成新柱子，总数:', this.pillars.length);
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
        // 移除触摸监听
        if (this.canvas) {
            this.canvas.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.canvas.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.canvas.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.canvas.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
    }
});