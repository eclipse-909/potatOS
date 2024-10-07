var TSOS;
(function (TSOS) {
    class Scheduler {
        currPCB;
        pcbQueue;
        residentPcbs;
        constructor() {
            this.currPCB = null;
            this.pcbQueue = new TSOS.Queue();
            this.residentPcbs = new Map();
        }
    }
    TSOS.Scheduler = Scheduler;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=scheduler.js.map