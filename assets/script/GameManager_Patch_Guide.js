/**
 * GameManager.js 补丁说明
 * ========================
 * 
 * 为了集成猴子发射器功能，需要在现有 GameManager.js 中进行以下最小改动：
 * 
 * 【改动1】在 createMonkey() 方法末尾添加获取 launcher 引用
 * 位置：createMonkey() 方法最后
 * 
 * 原代码：
 *     this.monkeyScript = this.monkey.getComponent('Monkey');
 *     console.log('🐵 猴子创建完成，位置:', this.monkey.position);
 * 
 * 改为：
 *     this.monkeyScript = this.monkey.getComponent('Monkey');
 *     this.monkeyLauncher = this.monkey.getComponent('MonkeyLauncher');
 *     console.log('🐵 猴子创建完成，位置:', this.monkey.position);
 * 
 * 
 * 【改动2】修改 onTouchMove() 中的拖拽处理，添加头部旋转
 * 位置：onTouchMove() 方法中，在 this.drawPreviewTrajectory(offset) 之前
 * 
 * 原代码：
 *     // 绘制预览轨迹
 *     this.drawPreviewTrajectory(offset);
 * 
 * 改为：
 *     // 【新增】设置猴子头部旋转
 *     if (this.monkeyLauncher) {
 *         this.monkeyLauncher.setHeadRotationByDrag(offset);
 *     }
 *     // 绘制预览轨迹
 *     this.drawPreviewTrajectory(offset);
 * 
 * 
 * 【改动3】修改 onTouchEnd() 重置头部
 * 位置：onTouchEnd() 方法中，在 this.launchWaterDrop() 之后
 * 
 * 原代码：
 *     // 发射水滴
 *     this.launchWaterDrop();
 * 
 * 改为：
 *     // 发射水滴
 *     this.launchWaterDrop();
 *     // 【新增】重置猴子头部
 *     if (this.monkeyLauncher) {
 *         this.monkeyLauncher.resetHeadRotation();
 *     }
 * 
 * 
 * 【改动4】修改 drawPreviewTrajectory() 使用猴子发射点
 * 位置：drawPreviewTrajectory() 方法中
 * 
 * 原代码：
 *     let pos = cc.v2(this.monkey.x, this.monkey.y - 50);
 * 
 * 改为：
 *     // 【修改】使用猴子发射点位置
 *     let pos;
 *     if (this.monkeyLauncher) {
 *         pos = this.monkeyLauncher.getFirePosition();
 *     } else {
 *         pos = cc.v2(this.monkey.x, this.monkey.y - 50);
 *     }
 * 
 * 
 * 【改动5】修改 launchWaterDrop() 使用猴子发射点
 * 位置：launchWaterDrop() 方法中
 * 
 * 原代码：
 *     waterDrop.position = this.slingshotNode.position.clone();
 * 
 * 改为：
 *     // 【修改】使用猴子发射点位置
 *     if (this.monkeyLauncher) {
 *         waterDrop.position = this.monkeyLauncher.getFirePosition();
 *     } else {
 *         waterDrop.position = this.slingshotNode.position.clone();
 *     }
 * 
 * 
 * 【改动6】修改 recordTrajectory() 使用猴子发射点
 * 位置：recordTrajectory() 方法中
 * 
 * 原代码：
 *     this.pathPoints.push(this.slingshotNode.position.clone());
 * 
 * 改为：
 *     // 【修改】使用猴子发射点位置
 *     if (this.monkeyLauncher) {
 *         this.pathPoints.push(this.monkeyLauncher.getFirePosition());
 *     } else {
 *         this.pathPoints.push(this.slingshotNode.position.clone());
 *     }
 * 
 * 
 * 【改动7】在 moveMonkeyAlongPath() 添加行走动画
 * 位置：moveMonkeyAlongPath() 方法中，在 this.isMonkeyMoving = true; 之后
 * 
 * 原代码：
 *     this.isMonkeyMoving = true;
 * 
 * 改为：
 *     this.isMonkeyMoving = true;
 *     // 【新增】播放行走动画
 *     if (this.monkeyLauncher) {
 *         this.monkeyLauncher.playWalkAnimation();
 *     }
 * 
 * 
 * 【改动8】在 onMonkeyArrived() 停止行走动画
 * 位置：onMonkeyArrived() 方法中，在 this.isMonkeyMoving = false; 之后
 * 
 * 原代码：
 *     this.isMonkeyMoving = false;
 * 
 * 改为：
 *     this.isMonkeyMoving = false;
 *     // 【新增】停止行走动画
 *     if (this.monkeyLauncher) {
 *         this.monkeyLauncher.stopWalkAnimation();
 *     }
 * 
 * 
 * 【可选】如果要完全移除弹弓节点依赖，可以删除 slingshotNode 相关代码
 * 但为了兼容性，建议保留，只是不再使用它的位置
 */
