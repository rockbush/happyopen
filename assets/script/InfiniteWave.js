// InfiniteWave.js
// 海浪无限循环背景 - 放在屏幕最下方
//
// 使用方法：
// 1. 创建一个空节点 InfiniteWave
// 2. 挂载此脚本
// 3. 在属性面板设置 waveSprite（海浪图片 256×128）
// 4. 脚本会自动创建足够数量的海浪铺满屏幕并循环

cc.Class({
    extends: cc.Component,

    properties: {
        // 海浪图片
        waveSprite: {
            default: null,
            type: cc.SpriteFrame,
            tooltip: '海浪图片（256×128）'
        },
        
        // 海浪Y位置（相对于屏幕底部的偏移）
        waveOffsetY: {
            default: 0,
            tooltip: '海浪Y位置偏移（0表示最底部）'
        },
        
        // 自动滚动速度（像素/秒，0表示不自动滚动）
        autoScrollSpeed: {
            default: 30,
            tooltip: '自动滚动速度（向左为正）'
        }
    },

    onLoad() {
        this.waves = [];
        this.waveWidth = 256;
        this.waveHeight = 128;
        this.totalShiftX = 0;
        
        this.initWaves();
        
        console.log('🌊 海浪背景初始化完成');
    },
    
    initWaves() {
        if (!this.waveSprite) {
            console.warn('🌊 未设置海浪图片');
            return;
        }
        
        // 计算需要多少个海浪铺满屏幕（多加2个用于循环）
        const screenWidth = cc.winSize.width;
        const screenHeight = cc.winSize.height;
        const count = Math.ceil(screenWidth / this.waveWidth) + 2;
        
        // 计算Y位置（屏幕底部）
        const baseY = -screenHeight / 2 + this.waveHeight / 2 + this.waveOffsetY;
        
        // 创建海浪节点
        for (let i = 0; i < count; i++) {
            const wave = new cc.Node('wave_' + i);
            wave.parent = this.node;
            
            const sprite = wave.addComponent(cc.Sprite);
            sprite.spriteFrame = this.waveSprite;
            sprite.sizeMode = cc.Sprite.SizeMode.RAW;
            sprite.trim = false;
            
            // 设置位置
            wave.x = -screenWidth / 2 + this.waveWidth / 2 + i * this.waveWidth;
            wave.y = baseY;
            
            // 确保在最前面显示
            wave.zIndex = 50;
            
            this.waves.push(wave);
        }
        
        console.log('🌊 创建了', count, '个海浪节点');
    },
    
    update(dt) {
        // 自动滚动
        if (this.autoScrollSpeed !== 0) {
            this.shiftLeft(this.autoScrollSpeed * dt);
        }
    },
    
    // 向左移动（与世界同步）
    shiftLeft(distance) {
        this.totalShiftX += distance;
        
        const screenWidth = cc.winSize.width;
        const leftBound = -screenWidth / 2 - this.waveWidth;
        const rightBound = screenWidth / 2 + this.waveWidth;
        
        for (let i = 0; i < this.waves.length; i++) {
            const wave = this.waves[i];
            wave.x -= distance;
            
            // 如果超出左边界，移动到右边
            if (wave.x < leftBound) {
                // 找到最右边的海浪
                let maxX = wave.x;
                for (let j = 0; j < this.waves.length; j++) {
                    if (this.waves[j].x > maxX) {
                        maxX = this.waves[j].x;
                    }
                }
                wave.x = maxX + this.waveWidth;
            }
            
            // 如果超出右边界，移动到左边
            if (wave.x > rightBound) {
                // 找到最左边的海浪
                let minX = wave.x;
                for (let j = 0; j < this.waves.length; j++) {
                    if (this.waves[j].x < minX) {
                        minX = this.waves[j].x;
                    }
                }
                wave.x = minX - this.waveWidth;
            }
        }
    },
    
    // 重置位置
    reset() {
        const screenWidth = cc.winSize.width;
        for (let i = 0; i < this.waves.length; i++) {
            this.waves[i].x = -screenWidth / 2 + this.waveWidth / 2 + i * this.waveWidth;
        }
        this.totalShiftX = 0;
    }
});
