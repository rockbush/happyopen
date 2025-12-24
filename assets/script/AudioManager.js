// AudioManager.js
// 通用音频管理器 - 支持微信小游戏分包加载
// 无需挂载到节点，直接调用静态方法即可
//
// 音频文件位置：
//   主包 resources: assets/resources/audio/sea.mp3 （需要把sea.mp3移到resources文件夹）
//   或者直接用路径: assets/loading/sea.mp3
//   分包 Bundle: assets/bundles/audio/
//
// 使用方法：
//   AudioManager.playMusic('sea');                      // 播放主包音乐（从resources）
//   AudioManager.playMusicBundle('background', 'audio'); // 播放分包音乐
//   AudioManager.playSoundBundle('shot', 'audio');       // 播放分包音效
//   AudioManager.stopMusic();                            // 停止背景音乐

window.AudioManager = {
    // 音量设置
    musicVolume: 0.5,
    soundVolume: 0.8,
    
    // 当前背景音乐ID
    currentMusicId: -1,
    
    // 音频缓存
    audioCache: {},
    
    // Bundle缓存
    bundleCache: {},

    // ==================== 主包资源播放（resources文件夹）====================

    /**
     * 播放主包背景音乐（从 resources 文件夹）
     * @param {string} path - 相对于 resources 的路径，如 'audio/sea' 或 'sea'
     * @param {boolean} loop - 是否循环，默认 true
     */
    playMusic(path, loop = true) {
        const cacheKey = `resources/${path}`;
        
        if (this.audioCache[cacheKey]) {
            this.stopMusic();
            this.currentMusicId = cc.audioEngine.play(this.audioCache[cacheKey], loop, this.musicVolume);
            console.log('🎵 播放音乐(缓存):', path);
            return;
        }

        cc.resources.load(path, cc.AudioClip, (err, clip) => {
            if (err) {
                console.error('❌ 主包音频加载失败:', path, err);
                return;
            }
            
            this.audioCache[cacheKey] = clip;
            this.stopMusic();
            this.currentMusicId = cc.audioEngine.play(clip, loop, this.musicVolume);
            console.log('🎵 播放音乐:', path);
        });
    },

    /**
     * 播放主包音效（从 resources 文件夹）
     * @param {string} path - 相对于 resources 的路径
     * @param {boolean} loop - 是否循环，默认 false
     */
    playSound(path, loop = false) {
        const cacheKey = `resources/${path}`;
        
        if (this.audioCache[cacheKey]) {
            cc.audioEngine.play(this.audioCache[cacheKey], loop, this.soundVolume);
            return;
        }

        cc.resources.load(path, cc.AudioClip, (err, clip) => {
            if (err) {
                console.error('❌ 主包音效加载失败:', path, err);
                return;
            }
            
            this.audioCache[cacheKey] = clip;
            cc.audioEngine.play(clip, loop, this.soundVolume);
        });
    },

    // ==================== 通过URL直接加载 ====================

    /**
     * 通过URL播放背景音乐（适用于任意路径）
     * @param {string} url - 完整路径，如 'assets/loading/sea.mp3'
     * @param {boolean} loop - 是否循环，默认 true
     */
    playMusicByUrl(url, loop = true) {
        const cacheKey = `url/${url}`;
        
        if (this.audioCache[cacheKey]) {
            this.stopMusic();
            this.currentMusicId = cc.audioEngine.play(this.audioCache[cacheKey], loop, this.musicVolume);
            console.log('🎵 播放音乐(缓存):', url);
            return;
        }

        cc.assetManager.loadRemote(url, { ext: '.mp3' }, (err, clip) => {
            if (err) {
                console.error('❌ URL音频加载失败:', url, err);
                return;
            }
            
            this.audioCache[cacheKey] = clip;
            this.stopMusic();
            this.currentMusicId = cc.audioEngine.play(clip, loop, this.musicVolume);
            console.log('🎵 播放音乐:', url);
        });
    },

    /**
     * 通过URL播放音效
     * @param {string} url - 完整路径
     * @param {boolean} loop - 是否循环，默认 false
     */
    playSoundByUrl(url, loop = false) {
        const cacheKey = `url/${url}`;
        
        if (this.audioCache[cacheKey]) {
            cc.audioEngine.play(this.audioCache[cacheKey], loop, this.soundVolume);
            return;
        }

        cc.assetManager.loadRemote(url, { ext: '.mp3' }, (err, clip) => {
            if (err) {
                console.error('❌ URL音效加载失败:', url, err);
                return;
            }
            
            this.audioCache[cacheKey] = clip;
            cc.audioEngine.play(clip, loop, this.soundVolume);
        });
    },

    // ==================== 分包资源播放（Bundle）====================

    /**
     * 播放分包背景音乐
     * @param {string} name - 音频文件名（不含扩展名）
     * @param {string} bundleName - Bundle名称，如 'audio'
     * @param {boolean} loop - 是否循环，默认 true
     */
    playMusicBundle(name, bundleName, loop = true) {
        this.loadAudioFromBundle(name, bundleName, (clip) => {
            this.stopMusic();
            this.currentMusicId = cc.audioEngine.play(clip, loop, this.musicVolume);
            console.log('🎵 播放音乐:', name, '| Bundle:', bundleName);
        });
    },

    /**
     * 播放分包音效
     * @param {string} name - 音频文件名（不含扩展名）
     * @param {string} bundleName - Bundle名称
     * @param {boolean} loop - 是否循环，默认 false
     */
    playSoundBundle(name, bundleName, loop = false) {
        this.loadAudioFromBundle(name, bundleName, (clip) => {
            cc.audioEngine.play(clip, loop, this.soundVolume);
        });
    },

    /**
     * 从Bundle加载音频
     */
    loadAudioFromBundle(name, bundleName, callback) {
        const cacheKey = `${bundleName}/${name}`;
        
        // 已缓存
        if (this.audioCache[cacheKey]) {
            if (callback) callback(this.audioCache[cacheKey]);
            return;
        }

        // 加载Bundle
        this.loadBundle(bundleName, (bundle) => {
            if (!bundle) {
                console.error('❌ Bundle加载失败:', bundleName);
                return;
            }

            bundle.load(name, cc.AudioClip, (err, clip) => {
                if (err) {
                    console.error('❌ 音频加载失败:', name, err);
                    return;
                }
                
                this.audioCache[cacheKey] = clip;
                if (callback) callback(clip);
            });
        });
    },

    /**
     * 加载Bundle
     */
    loadBundle(bundleName, callback) {
        // 已缓存
        if (this.bundleCache[bundleName]) {
            if (callback) callback(this.bundleCache[bundleName]);
            return;
        }

        // 检查是否已加载
        const loadedBundle = cc.assetManager.getBundle(bundleName);
        if (loadedBundle) {
            this.bundleCache[bundleName] = loadedBundle;
            if (callback) callback(loadedBundle);
            return;
        }

        // 加载Bundle
        cc.assetManager.loadBundle(bundleName, (err, bundle) => {
            if (err) {
                console.error('❌ Bundle加载失败:', bundleName, err);
                if (callback) callback(null);
                return;
            }
            
            this.bundleCache[bundleName] = bundle;
            console.log('✅ Bundle加载成功:', bundleName);
            if (callback) callback(bundle);
        });
    },

    // ==================== 音乐控制 ====================

    /** 停止背景音乐 */
    stopMusic() {
        if (this.currentMusicId >= 0) {
            cc.audioEngine.stop(this.currentMusicId);
            this.currentMusicId = -1;
        }
    },

    /** 暂停背景音乐 */
    pauseMusic() {
        if (this.currentMusicId >= 0) {
            cc.audioEngine.pause(this.currentMusicId);
        }
    },

    /** 恢复背景音乐 */
    resumeMusic() {
        if (this.currentMusicId >= 0) {
            cc.audioEngine.resume(this.currentMusicId);
        }
    },

    /** 设置背景音乐音量 */
    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.currentMusicId >= 0) {
            cc.audioEngine.setVolume(this.currentMusicId, volume);
        }
    },

    // ==================== 音效控制 ====================

    /** 设置音效音量 */
    setSoundVolume(volume) {
        this.soundVolume = volume;
    },

    /** 停止指定音效 */
    stopSoundById(audioId) {
        if (audioId >= 0) {
            cc.audioEngine.stop(audioId);
        }
    },

    // ==================== 全局控制 ====================

    /** 停止所有音频 */
    stopAll() {
        cc.audioEngine.stopAll();
        this.currentMusicId = -1;
    },

    /** 暂停所有音频 */
    pauseAll() {
        cc.audioEngine.pauseAll();
    },

    /** 恢复所有音频 */
    resumeAll() {
        cc.audioEngine.resumeAll();
    },

    /** 清除缓存 */
    clearCache() {
        this.audioCache = {};
    }
};

cc.AudioManager = window.AudioManager;