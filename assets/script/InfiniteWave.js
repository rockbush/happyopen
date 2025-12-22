// InfiniteWave.js
// 海浪无限循环背景 - 放在屏幕最下方
// 参考 InfiniteBackground 实现方式
//
// 使用方法：
// 1. 创建一个空节点 InfiniteWave
// 2. 挂载此脚本
// 3. 在属性面板设置 waveSprite（海浪图片 256×128）

cc.Class({
    extends: cc.Component,

    properties: {
        // 海浪图片
        waveSprite: {
            default: null,
            type: cc.SpriteFrame,
            tooltip: '海浪图片（256×128）'
        },
        
        // 海浪宽度
        waveWidth: {
            default: 256,
            tooltip: '海浪图片宽度'
        },
        
        // 海浪高度
        waveHeight: {
            default: 128,
            tooltip: '海浪图片高度'
        },
        
        // 海浪Y位置（相对于屏幕底部的偏移）
        waveOffsetY: {
            default: 0,
            tooltip: '海浪Y位置偏移（0表示贴底）'
        },
        
        // 自动滚动速度（像素/秒，0表示不自动滚动）
        autoScrollSpeed: {
            default: 30,
            tooltip: '自动滚动速度（向左为正）'
        }
    },

    onLoad() {
        this.screenHalfWidth = cc.winSize.width / 2;
        this.screenHalfHeight = cc.winSize.height / 2;
        
        // 设置节点层级
        this.node.zIndex = 50;
        
        this.waves = [];
        this.initWaves();
        
        console.log('🌊 海浪背景初始化完成');
    },
    
    initWaves() {
        if (!this.waveSprite) {
            console.warn('🌊 未设置海浪图片');
            return;
        }
        
        // 计算需要多少个海浪（覆盖3倍屏幕宽度，确保足够）
        const totalWidth = cc.winSize.width * 3;
        const count = Math.ceil(totalWidth / this.waveWidth) + 2;
        
        // 计算Y位置（屏幕底部）
        const baseY = -this.screenHalfHeight + this.waveHeight / 2 + this.waveOffsetY;
        
        // 创建海浪节点，从左边屏幕外开始
        const startX = -this.screenHalfWidth - this.waveWidth;
        
        for (let i = 0; i < count; i++) {
            const wave = this.createWaveNode('wave_' + i);
            wave.x = startX + i * this.waveWidth;
            wave.y = baseY;
            this.waves.push(wave);
        }
        
        console.log('🌊 创建了', count, '个海浪节点');
    },
    
    // 创建海浪节点
    createWaveNode(name) {
        const node = new cc.Node(name);
        node.parent = this.node;
        
        const sprite = node.addComponent(cc.Sprite);
        sprite.spriteFrame = this.waveSprite;
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        sprite.trim = false;
        
        return node;
    },
    
    update(dt) {
        // 自动滚动
        if (this.autoScrollSpeed !== 0) {
            for (let i = 0; i < this.waves.length; i++) {
                this.waves[i].x -= this.autoScrollSpeed * dt;
            }
            this.checkLoop();
        }
    },
    
    // 【核心方法】被 GameManager 调用，让海浪跟着世界一起左移
    shiftLeft(distance) {
        for (let i = 0; i < this.waves.length; i++) {
            this.waves[i].x -= distance;
        }
        this.checkLoop();
    },
    
    // 检查海浪是否需要循环
    checkLoop() {
        // 按 x 坐标排序
        this.waves.sort((a, b) => a.x - b.x);
        
        const leftWave = this.waves[0];
        const rightWave = this.waves[this.waves.length - 1];
        
        // 循环检测范围（比屏幕宽一些）
        const leftEdge = -this.screenHalfWidth - this.waveWidth * 2;
        const rightEdge = this.screenHalfWidth + this.waveWidth * 2;
        
        // 如果最左边的海浪完全移出左边界，挪到最右边
        const leftWaveRightEdge = leftWave.x + this.waveWidth / 2;
        if (leftWaveRightEdge < leftEdge) {
            leftWave.x = rightWave.x + this.waveWidth;
        }
        
        // 如果最右边的海浪完全移出右边界，挪到最左边
        const rightWaveLeftEdge = rightWave.x - this.waveWidth / 2;
        if (rightWaveLeftEdge > rightEdge) {
            rightWave.x = leftWave.x - this.waveWidth;
        }
    },
    
    // 重置位置
    reset() {
        const startX = -this.screenHalfWidth - this.waveWidth;
        for (let i = 0; i < this.waves.length; i++) {
            this.waves[i].x = startX + i * this.waveWidth;
        }
    }
});