var TSOS;
(function (TSOS) {
    class Output {
        exitCode;
        retValue;
        constructor(exitCode, retValue) {
            this.exitCode = exitCode;
            this.retValue = retValue;
        }
    }
    TSOS.Output = Output;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=stream.js.map