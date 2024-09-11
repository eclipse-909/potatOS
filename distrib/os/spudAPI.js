// System Call API
// Contains the drivers for system calls and software interrupts
var TSOS;
(function (TSOS) {
    //
    // System Calls... that generate software interrupts via tha Application Programming Interface library routines.
    //
    // Some ideas:
    // - ReadConsole
    // - WriteConsole
    // - CreateProcess
    // - ExitProcess
    // - WaitForProcessToExit
    // - CreateFile
    // - OpenFile
    // - ReadFile
    // - WriteFile
    // - CloseFile
    //User-mode system call functions
    //@param params - process ID, exit code.
    //@returns ExitCode | SignalCode - ExitCode; SignalCode if fatal error.
    function kill(params) {
        if (params.length !== 2) {
            return TSOS.SHELL_MISUSE;
        }
        _CPU.isExecuting = false;
        //TODO kill the currently-running process. I might need to pass the process ID as a parameter
        //If it tries to kill the process right before a context switch, the active process ID might change, so I should pass it in before that.
        const pid = params[0];
        params[0].processPrintDesc();
        return TSOS.SUCCESS;
    }
    //@params params - the byte in the Y-register.
    //@returns ExitCode | SignalCode - ExitCode; SignalCode if fatal error.
    function writeIntConsole(params) {
        if (params.length !== 1) {
            return TSOS.SHELL_MISUSE;
        }
        _StdOut.putText(params[0].toString(16));
        return TSOS.SUCCESS;
    }
    //@params params - a pointer to the null-terminated string in memory, given by the indirect address in the Y-register.
    //@returns ExitCode | SignalCode - ExitCode; SignalCode if fatal error.
    function writeStrConsole(params) {
        if (params.length !== 1) {
            return TSOS.SHELL_MISUSE;
        }
        let buffer = "";
        let strPtr = _MMU.toPhysical(params[0]);
        if (strPtr === undefined) {
            return TSOS.SHELL_MISUSE;
        }
        let char = undefined;
        while (char !== 0) {
            char = _MemoryController.read(strPtr);
            buffer += String.fromCharCode(char);
        }
        _StdOut.putText(buffer);
        return TSOS.SUCCESS;
    }
})(TSOS || (TSOS = {}));
//# sourceMappingURL=spudAPI.js.map