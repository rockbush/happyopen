// GameOver.js
// 游戏结束预制体脚本
// 
// 预制体结构：
// gameover (根节点，挂载此脚本)
//   ├── bg
//   ├── gameover (标题图片)
//   ├── gameover2
//   ├── text
//   │     ├── highestsocre (最高分Label)
//   │     ├── fenshu (文字"分数:")
//   │     └── score (当前得分Label)
//   ├── again (再玩一次按钮)
//   │     ├── Background
//   │     └── Label
//   └── share (分享按钮)
//         ├── Background
//         └── Label
//
// 使用方法：
// 1. 在GameManager中加载预制体并实例化
// 2. 调用 setScore(score) 设置分数
// 3. 按钮点击会自动处理

cc.Class({
    extends: cc.Component,

    properties: {
        // 最高分Label
        highestScoreLabel: {
            default: null,
            type: cc.Label,
            tooltip: '最高分显示Label (highestsocre节点)'
        },

        // 当前得分Label
        scoreLabel: {
            default: null,
            type: cc.Label,
            tooltip: '当前得分显示Label (score节点)'
        },

        // 再玩一次按钮
        againButton: {
            default: null,
            type: cc.Node,
            tooltip: '再玩一次按钮节点 (again)'
        },

        // 分享按钮
        shareButton: {
            default: null,
            type: cc.Node,
            tooltip: '分享按钮节点 (share)'
        },

        // 弹出动画时长
        popupDuration: {
            default: 0.3,
            tooltip: '弹出动画时长（秒）'
        }
    },

    onLoad() {
        // 自动查找节点（如果没有在编辑器中设置）
        this.autoFindNodes();

        // 绑定按钮事件
        this.bindButtonEvents();

        // 初始状态：缩放为0，准备弹出动画
        this.node.scale = 0;

        console.log('🎮 GameOver 预制体初始化完成');
    },

    // 自动查找子节点
    autoFindNodes() {
        // 查找 text 节点下的 Label
        const textNode = this.node.getChildByName('text');
        if (textNode) {
            // 最高分
            const highestNode = textNode.getChildByName('highestsocre');
            if (highestNode && !this.highestScoreLabel) {
                this.highestScoreLabel = highestNode.getComponent(cc.Label);
            }

            // 当前得分
            const scoreNode = textNode.getChildByName('score');
            if (scoreNode && !this.scoreLabel) {
                this.scoreLabel = scoreNode.getComponent(cc.Label);
            }
        }

        // 查找按钮节点
        if (!this.againButton) {
            this.againButton = this.node.getChildByName('again');
        }

        if (!this.shareButton) {
            this.shareButton = this.node.getChildByName('share');
        }
    },

    // 绑定按钮点击事件
    bindButtonEvents() {
        // 再玩一次按钮
        if (this.againButton) {
            this.againButton.on(cc.Node.EventType.TOUCH_END, this.onAgainButtonClick, this);

            // 添加按钮缩放效果
            this.addButtonEffect(this.againButton);
        }

        // 分享按钮
        if (this.shareButton) {
            this.shareButton.on(cc.Node.EventType.TOUCH_END, this.onShareButtonClick, this);

            // 添加按钮缩放效果
            this.addButtonEffect(this.shareButton);
        }
    },

    // 添加按钮点击缩放效果
    addButtonEffect(buttonNode) {
        buttonNode.on(cc.Node.EventType.TOUCH_START, () => {
            buttonNode.runAction(cc.scaleTo(0.1, 0.9));
        });

        buttonNode.on(cc.Node.EventType.TOUCH_END, () => {
            buttonNode.runAction(cc.scaleTo(0.1, 1.0));
        });

        buttonNode.on(cc.Node.EventType.TOUCH_CANCEL, () => {
            buttonNode.runAction(cc.scaleTo(0.1, 1.0));
        });
    },

    /**
     * 设置分数显示
     * @param {Number} score - 玩家得分
     * @param {Number} highestScore - 最高分（可选，默认与score相同）
     */
    setScore(score, highestScore) {
        // 如果没有传入最高分，尝试从本地存储读取
        if (highestScore === undefined) {
            highestScore = this.getHighestScore();

            // 如果当前分数超过最高分，更新最高分
            if (score > highestScore) {
                highestScore = score;
                this.saveHighestScore(highestScore);
            }
        }


        // 更新最高分显示
        if (this.highestScoreLabel) {
            this.highestScoreLabel.string = "个人最高得分：" + score.toString();
        }

        // 更新当前得分显示
        if (this.scoreLabel) {
            this.scoreLabel.string = score.toString();
        }

        console.log('🏆 设置分数 - 当前:', score, '最高:', highestScore);
    },

    /**
     * 获取本地存储的最高分
     */
    getHighestScore() {
        const saved = cc.sys.localStorage.getItem('monkey_highest_score');
        return saved ? parseInt(saved) : 0;
    },

    /**
     * 保存最高分到本地存储
     */
    saveHighestScore(score) {
        cc.sys.localStorage.setItem('monkey_highest_score', score.toString());
        console.log('💾 保存最高分:', score);
    },

    /**
     * 播放弹出动画
     * @param {Function} callback - 动画完成回调
     */
    show(callback) {
        this.node.scale = 0;
        this.node.runAction(cc.sequence(
            cc.scaleTo(this.popupDuration, 1.0).easing(cc.easeBackOut()),
            cc.callFunc(() => {
                if (callback) callback();
            })
        ));
    },

    /**
     * 播放关闭动画
     * @param {Function} callback - 动画完成回调
     */
    hide(callback) {
        this.node.runAction(cc.sequence(
            cc.scaleTo(this.popupDuration, 0).easing(cc.easeBackIn()),
            cc.callFunc(() => {
                if (callback) callback();
                this.node.destroy();
            })
        ));
    },

    // ==================== 按钮点击事件 ====================

    /**
     * 再玩一次按钮点击
     */
    onAgainButtonClick() {
        console.log('🔄 点击再玩一次');

        // 播放点击音效
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSoundBundle('drift', 'audio');
        }

        // 停止所有音频
        if (typeof AudioManager !== 'undefined') {
            AudioManager.stopMusic();
        }

        // 重新加载当前场景（游戏场景）
        // 如果你想回到开始场景，改成 'begin'
        cc.director.loadScene('begin');
    },

    /**
     * 分享按钮点击
     */
    onShareButtonClick() {
        console.log('📤 点击分享');

        // 播放点击音效
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSoundBundle('drift', 'audio');
        }

        // 分享功能（根据平台实现）
        this.doShare();
    },

    /**
     * 加载场景
     * @param {String} sceneName - 场景名称
     */
    loadScene(sceneName) {
        // 先播放关闭动画，再切换场景
        this.hide(() => {
            cc.director.loadScene(sceneName);
        });
    },

    /**
     * 分享功能（根据平台自行实现）
     */
    doShare() {
        // 微信小游戏分享示例
        if (typeof wx !== 'undefined') {
            wx.shareAppMessage({
                title: '我在猴子跳跳中获得了' + (this.scoreLabel ? this.scoreLabel.string : 0) + '分！',
                imageUrl: '', // 分享图片URL
                query: ''
            });
        } else {
            console.log('📤 分享功能（非微信平台）');
            // 其他平台的分享实现
        }
    },

    onDestroy() {
        // 移除按钮事件监听
        if (this.againButton) {
            this.againButton.off(cc.Node.EventType.TOUCH_END, this.onAgainButtonClick, this);
            this.againButton.off(cc.Node.EventType.TOUCH_START);
            this.againButton.off(cc.Node.EventType.TOUCH_CANCEL);
        }

        if (this.shareButton) {
            this.shareButton.off(cc.Node.EventType.TOUCH_END, this.onShareButtonClick, this);
            this.shareButton.off(cc.Node.EventType.TOUCH_START);
            this.shareButton.off(cc.Node.EventType.TOUCH_CANCEL);
        }
    }
});
