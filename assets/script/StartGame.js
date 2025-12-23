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
        cc.assetManager.loadBundle('ui', (err) => {
            if (err) return console.error(err);

            cc.assetManager.loadBundle('game', (err2) => {
                if (err2) return console.error(err2);

            });
        });

        console.log('frameSize', cc.view.getFrameSize());
        console.log('visibleSize', cc.view.getVisibleSize());
        console.log('design', cc.view.getDesignResolutionSize());

        //音乐
        // const AudioUtil = require('AudioUtil');
        // AudioUtil.playMusic('bgm01');
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