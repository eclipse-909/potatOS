// System Call API
// Contains the drivers for system calls and software interrupts
var TSOS;
(function (TSOS) {
    //
    // System Calls... that generate software interrupts via tha Application Programming Interface library routines.
    //
    // Some ideas:
    // - ReadConsole - but there's no system call for input at runtime
    // - WriteConsole - done
    // - CreateProcess - implemented directly by shell, TODO maybe I should move it here?
    // - ExitProcess - done
    // - WaitForProcessToExit - implemented directly by shell, TODO maybe I should move it here?
    // - CreateFile
    // - OpenFile
    // - ReadFile
    // - WriteFile
    // - CloseFile
    //User-mode system call functions
    //Kills the process with the given process ID.
    //@param params - [process ID: number, exit code: ExitCode].
    function kill(params) {
        if (params.length !== 2) {
            return /*TODO what happens when the system call arguments are invalid?*/;
        }
        const pid = params[0];
        if (!_Scheduler.remove(pid)) {
            //TODO what happens if it can't find the pcb with the pid?
        }
        TSOS.Control.updatePcbDisplay();
        TSOS.Control.updateMemDisplay();
        _OsShell.processExitQueue.enqueue({ exitCode: params[1], pid: pid });
        _OsShell.onProcessFinished();
    }
    TSOS.kill = kill;
    //Writes the byte in the Y-register to the standard output as an integer.
    //@params params - [output handle: OutStream, byte in Y-register: number].
    function writeIntStdOut(params) {
        if (params.length !== 2) {
            return /*TODO what happens when the system call arguments are invalid?*/;
        }
        params[0].output([params[1].toString(16).toUpperCase()]);
    }
    TSOS.writeIntStdOut = writeIntStdOut;
    //Writes the null-terminated-string at the pointer to the standard output given by the indirect address in the Y-register.
    //@params params - [output handle: OutStream, pointer to null-terminated-string: number].
    function writeStrStdOut(params) {
        if (params.length !== 2) {
            return /*TODO what happens when the system call arguments are invalid?*/;
        }
        let buffer = "";
        let strPtr = params[1];
        let char = undefined;
        while (char !== 0) {
            char = _MMU.read(strPtr);
            if (char === undefined) {
                return /*TODO what happens when the system call arguments are invalid?*/;
            }
            buffer += String.fromCharCode(char);
            strPtr++;
        }
        params[0].output([buffer]);
    }
    TSOS.writeStrStdOut = writeStrStdOut;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=spudAPI.js.map