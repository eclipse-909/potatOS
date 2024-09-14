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
        shellDesc() {
            return this.description ? `${this.description}\n` : "";
        }
        processDesc(pid) {
            switch (this.code) {
                case 0:
                    return `Process ${pid} exited successfully.`;
                case 1:
                case 2:
                case 126:
                case 127:
                    return `Error in process ${pid}: ${this.description} - exit code ${this.code}`;
                case 132:
                case 139:
                case 130:
                    return `Fatal error - process ${pid} exited abnormally: ${this.description} - exit code ${this.code}`;
            }
        }
        static SUCCESS = new ExitCode(0, "");
        static GENERIC_ERROR = new ExitCode(1, "generic error");
        static SHELL_MISUSE = new ExitCode(2, "invalid command or arguments");
        static CANNOT_EXECUTE_COMMAND = new ExitCode(126, "cannot execute command");
        static COMMAND_NOT_FOUND = new ExitCode(127, "command not found");
        static TERMINATED_BY_CTRL_C = new ExitCode(130, "terminated by CTRL + C");
        static ILLEGAL_INSTRUCTION = new ExitCode(132, "illegal instruction");
        static SEGMENTATION_FAULT = new ExitCode(139, "segmentation fault");
    }
    TSOS.ExitCode = ExitCode;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=exitCode.js.map