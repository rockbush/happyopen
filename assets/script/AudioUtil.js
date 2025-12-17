const AudioUtil = {

    _bgmId: -1,
    _musicVolume: 1,
    _effectVolume: 1,

    /** 播放背景音乐 */
    playMusic(name, loop = true) {
        cc.resources.load(
            `res/sound/${name}`,
            cc.AudioClip,
            (err, clip) => {
                if (err) {
                    console.error('🎵 BGM 加载失败:', name, err);
                    return;
                }

                // 先停掉旧的
                if (this._bgmId !== -1) {
                    cc.audioEngine.stop(this._bgmId);
                }

                this._bgmId = cc.audioEngine.play(
                    clip,
                    loop,
                    this._musicVolume
                );
            }
        );
    },

    /** 停止背景音乐 */
    stopMusic() {
        if (this._bgmId !== -1) {
            cc.audioEngine.stop(this._bgmId);
            this._bgmId = -1;
        }
    },

    /** 播放音效 */
    playEffect(name) {
        cc.resources.load(
            `res/sound/${name}`,
            cc.AudioClip,
            (err, clip) => {
                if (err) {
                    console.error('🔊 音效加载失败:', name, err);
                    return;
                }

                cc.audioEngine.play(
                    clip,
                    false,
                    this._effectVolume
                );
            }
        );
    },

    /** 设置背景音乐音量 */
    setMusicVolume(volume) {
        this._musicVolume = volume;
        if (this._bgmId !== -1) {
            cc.audioEngine.setVolume(this._bgmId, volume);
        }
    },

    /** 设置音效音量 */
    setEffectVolume(volume) {
        this._effectVolume = volume;
    }
};

module.exports = AudioUtil;
