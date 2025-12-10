cc.Class({
    extends: cc.Component,

    properties: {
        gameManager: null
    },

    onLoad() {
        this.hasLanded = false;
        
        // 监听碰撞
        this.node.on('collision-enter', this.onCollisionEnter, this);
    },

    onCollisionEnter(other, self) {
        if (this.hasLanded) return;
        
        if (other.node.group === 'pillar') {
            // 检查是否落在柱子顶部
            const pillarScript = other.node.getComponent('Pillar');
            const isOnTop = pillarScript.checkIfOnTop(this.node.position);
            
            if (isOnTop) {
                this.hasLanded = true;
                this.gameManager.onWaterDropLanded(true, this.node.position);
                
                // 水滴停留一会儿后消失
                this.scheduleOnce(() => {
                    this.node.destroy();
                }, 0.5);
            }
        } else if (other.node.group === 'ground') {
            // 落在地面，游戏失败
            this.hasLanded = true;
            this.gameManager.onWaterDropLanded(false, this.node.position);
            
            this.scheduleOnce(() => {
                this.node.destroy();
            }, 0.5);
        }
    }
});
