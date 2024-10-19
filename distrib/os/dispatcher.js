var TSOS;
(function (TSOS) {
    class Dispatcher {
        constructor() { }
        //Calls Scheduler.next() and updates the CPU with the new currPCB.
        //Returns whether a switch was made.
        contextSwitch() {
            if (!_Scheduler.next()) {
                return false;
            }
            _CPU.IR = _Scheduler.currPCB.IR;
            _CPU.PC = _Scheduler.currPCB.PC;
            _CPU.Acc = _Scheduler.currPCB.Acc;
            _CPU.Xreg = _Scheduler.currPCB.Xreg;
            _CPU.Yreg = _Scheduler.currPCB.Yreg;
            _CPU.Zflag = _Scheduler.currPCB.Zflag;
            _CPU.isExecuting = true;
            TSOS.Control.updatePcbDisplay();
            return true;
        }
    }
    TSOS.Dispatcher = Dispatcher;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=dispatcher.js.map