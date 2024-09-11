var TSOS;
(function (TSOS) {
    class ExitCode {
        code;
        description;
        constructor(code, desc) {
            this.code = code;
            this.description = desc;
        }
        isSuccess() { return this.code === 0; }
        shellPrintDesc() {
            if (this.description) {
                _StdOut.putText(this.description);
                _StdOut.advanceLine();
            }
        }
        processPrintDesc() {
            switch (this.code) {
                case 0:
                    _StdOut.putText("Process exited successfully.");
                    break;
                case 1:
                case 2:
                case 126:
                case 127:
                    _StdOut.putText(`Error: ${this.description} - exit code ${this.code}`);
                    break;
                case 132:
                case 139:
                case 130:
                    _StdOut.putText(`Fatal error - process exited abnormally: ${this.description} - exit code ${this.code}`);
                    break;
            }
        }
    }
    TSOS.ExitCode = ExitCode;
    TSOS.SUCCESS = new ExitCode(0, "");
    TSOS.GENERIC_ERROR = new ExitCode(1, "generic error");
    TSOS.SHELL_MISUSE = new ExitCode(2, "invalid command or arguments");
    TSOS.CANNOT_EXECUTE_COMMAND = new ExitCode(126, "cannot execute command");
    TSOS.COMMAND_NOT_FOUND = new ExitCode(127, "command not found");
    TSOS.TERMINATED_BY_CTRL_C = new ExitCode(130, "terminated by CTRL + C");
    TSOS.ILLEGAL_INSTRUCTION = new ExitCode(132, "illegal instruction");
    TSOS.SEGMENTATION_FAULT = new ExitCode(139, "segmentation fault");
})(TSOS || (TSOS = {}));
//# sourceMappingURL=exitCode.js.map