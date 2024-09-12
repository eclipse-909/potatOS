var TSOS;
(function (TSOS) {
    class Scheduler {
        currPCB;
        pcbQueue;
        idlePcbs;
        constructor() {
            this.currPCB = null;
            this.pcbQueue = new TSOS.Queue();
            this.idlePcbs = new Map();
        }
    }
    TSOS.Scheduler = Scheduler;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=scheduler.js.map