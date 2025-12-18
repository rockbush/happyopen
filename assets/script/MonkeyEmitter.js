cc.Class({
    extends: cc.Component,

    properties: {
        // head 下的 EmitPoint 空节点
        emitPoint: { default: null, type: cc.Node }
    },

    /**
     * 发射点世界坐标
     */
    getEmitWorldPos () {
        if (!this.emitPoint) {
            return this.node.convertToWorldSpaceAR(cc.v2(0, 0));
        }
        return this.emitPoint.convertToWorldSpaceAR(cc.v2(0, 0));
    },

    /**
     * 发射点在目标节点（通常是 GameManager 所在节点）下的本地坐标
     */
    getEmitPosIn (targetNode) {
        const wp = this.getEmitWorldPos();
        if (!targetNode) return wp;
        return targetNode.convertToNodeSpaceAR(wp);
    }
});
