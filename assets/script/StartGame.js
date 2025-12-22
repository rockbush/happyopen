cc.Class({
    extends: cc.Component,

    properties: {
        audioMng: cc.Node
    },

    // use this for initialization
    onLoad: function () {
        // this.audioMng = this.audioMng.getComponent('AudioMng');
        // this.audioMng.playMusic();
        // cc.director.preloadScene('normalScene', function () {
        //     cc.log('Next scene preloaded');
        // });
        cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, () => {
            try {
                const canvas = cc.game.canvas;
                console.log('[DBG] canvas size:', canvas && canvas.width, canvas && canvas.height);
                console.log('[DBG] frameSize:', cc.view.getFrameSize());
                console.log('[DBG] visibleSize:', cc.view.getVisibleSize());
                console.log('[DBG] renderType:', cc.game.renderType, 'WEBGL=', cc.game.RENDER_TYPE_WEBGL);
            } catch (e) {
                console.error('[DBG] exception:', e);
            }
        });


        //音乐
        const AudioUtil = require('AudioUtil');
        AudioUtil.playMusic('bgm01');
        //AudioUtil.playEffect('click');播放音效
        //AudioUtil.setMusicVolume(0.5);
        //AudioUtil.setEffectVolume(0.7);//AudioUtil.stopMusic();
    },

    playGame: function () {
        cc.director.loadScene('normalScene');
    },

    // called every frame
    update: function (dt) {

    },
});