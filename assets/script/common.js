cc.Class({
    extends: cc.Component,

    properties: {
    },

    onLoad: function () {
        var canvas = this.node.getComponent(cc.Canvas);
        var orientation = cc.macro.ORIENTATION_PORTRAIT;
        if (canvas) {
            var frameSize = cc.view.getFrameSize();
            var designSize = canvas.designResolution;

            // 设置适配模式
            if (orientation == cc.macro.ORIENTATION_PORTRAIT) {
                //竖屏
                if (cc.sys.OS_ANDROID == cc.sys.os || cc.sys.OS_IOS == cc.sys.os || true) {
                    if ((frameSize.width / frameSize.height) == (2436 / 1125)) {
                        this.isIphoneX = true;
                    } else {
                        this.isIphoneX = false;
                    }

                    if ((frameSize.width / frameSize.height) >= (designSize.width / designSize.height)) {
                        //宽度超出
                        var width = frameSize.width * (designSize.height / frameSize.height);
                        cc.view.setDesignResolutionSize(width, designSize.height, cc.ResolutionPolicy.FIXED_HEIGHT);
                    } else {
                        //高度超出
                        var height = frameSize.height * (designSize.width / frameSize.width);
                        cc.view.setDesignResolutionSize(designSize.width, height, cc.ResolutionPolicy.FIXED_WIDTH);
                    }
                } else {
                    cc.view.setDesignResolutionSize(designSize.width, designSize.height, cc.ResolutionPolicy.EXACT_FIT);
                }

                if (this.isIphoneX) {
                    //单独处理
                }
            } else if (orientation == cc.macro.ORIENTATION_LANDSCAPE) {
                //横屏
            }
        }

    },

});
