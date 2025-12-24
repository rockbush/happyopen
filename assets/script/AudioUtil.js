// assets/script/AudioUtil.js
const AudioUtil = {
  _bgmId: -1,
  _musicVolume: 1,
  _effectVolume: 1,

  _bundles: Object.create(null),
  _clips: Object.create(null),

  _getBundle(bundleName) {
    return new Promise((resolve, reject) => {
      if (!bundleName) return resolve(null);

      const existed = cc.assetManager.getBundle(bundleName);
      if (existed) {
        this._bundles[bundleName] = existed;
        return resolve(existed);
      }

      if (this._bundles[bundleName]) return resolve(this._bundles[bundleName]);

      cc.assetManager.loadBundle(bundleName, (err, bundle) => {
        if (err) return reject(err);
        this._bundles[bundleName] = bundle;
        resolve(bundle);
      });
    });
  },

  async _loadFromBundle(bundleName, pathInBundle) {
    const cacheKey = `${bundleName}|${pathInBundle}`;
    if (this._clips[cacheKey]) return this._clips[cacheKey];

    const bundle = await this._getBundle(bundleName);
    if (!bundle) throw new Error(`Bundle not found: ${bundleName}`);

    const clip = await new Promise((resolve, reject) => {
      bundle.load(pathInBundle, cc.AudioClip, (err, asset) => {
        if (err) return reject(err);
        resolve(asset);
      });
    });

    this._clips[cacheKey] = clip;
    return clip;
  },

  async _loadFromRawUrl(rawPathWithExt) {
    const cacheKey = `raw|${rawPathWithExt}`;
    if (this._clips[cacheKey]) return this._clips[cacheKey];

    const url = cc.url.raw(rawPathWithExt);

    const clip = await new Promise((resolve, reject) => {
      // 2.4 微信环境下可用：从 url 直接加载 AudioClip
      cc.loader.load(url, (err, asset) => {
        if (err) return reject(err);
        resolve(asset);
      });
    });

    this._clips[cacheKey] = clip;
    return clip;
  },

  // 由于你“路径不能改”，主包音频固定在 assets/loading 下
  // 这里做一个小兜底：依次尝试常见扩展名
  async _loadFromLoading(name) {
    const exts = ['.mp3', '.m4a', '.ogg', '.wav'];
    let lastErr = null;

    for (let i = 0; i < exts.length; i++) {
      const raw = `assets/loading/${name}${exts[i]}`;
      try {
        return await this._loadFromRawUrl(raw);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error(`Cannot load loading audio: ${name}`);
  },

  async _loadClipAuto(name, bundleName) {
    // 1) 指定 bundle（你的 audio 分包：assets/bundles/audio/ 根目录）
    if (bundleName) {
      return await this._loadFromBundle(bundleName, name);
    }

    // 2) 先尝试 resources（如果未来你有 resources 音频，也兼容）
    {
      const path = `res/sound/${name}`;
      const cacheKey = `resources|${path}`;
      if (this._clips[cacheKey]) return this._clips[cacheKey];

      const clip = await new Promise((resolve) => {
        cc.resources.load(path, cc.AudioClip, (err, asset) => {
          if (err) return resolve(null);
          resolve(asset);
        });
      });

      if (clip) {
        this._clips[cacheKey] = clip;
        return clip;
      }
    }

    // 3) 回退：主包 assets/loading/{name}.xxx
    return await this._loadFromLoading(name);
  },

  async playMusic(name, loop = true, bundleName = null) {
    try {
      const clip = await this._loadClipAuto(name, bundleName);

      if (this._bgmId !== -1) cc.audioEngine.stop(this._bgmId);
      this._bgmId = cc.audioEngine.play(clip, loop, this._musicVolume);

      if (this._bgmId === undefined || this._bgmId === null || this._bgmId < 0) {
        console.warn('[AudioUtil] invalid audioId:', this._bgmId, { name, bundleName });
      }
    } catch (err) {
      console.error('[AudioUtil] playMusic failed:', { name, bundleName }, err);
    }
  },

  stopMusic() {
    if (this._bgmId !== -1) {
      cc.audioEngine.stop(this._bgmId);
      this._bgmId = -1;
    }
  },

  async playEffect(name, bundleName = null) {
    try {
      const clip = await this._loadClipAuto(name, bundleName);
      cc.audioEngine.play(clip, false, this._effectVolume);
    } catch (err) {
      console.error('[AudioUtil] playEffect failed:', { name, bundleName }, err);
    }
  },

  setMusicVolume(volume) {
    this._musicVolume = volume;
    if (this._bgmId !== -1) cc.audioEngine.setVolume(this._bgmId, volume);
  },

  setEffectVolume(volume) {
    this._effectVolume = volume;
  }
};

module.exports = AudioUtil;

// 如果你项目里很多地方没有 require，想继续用全局 AudioUtil，打开这一行：
// window.AudioUtil = AudioUtil;
