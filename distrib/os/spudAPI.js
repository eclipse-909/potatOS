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
    //Kills the process with the given process ID.
    //@param params - [process ID, exit code].
    function kill(params) {
        if (params.length !== 2) {
            return;
        }
        const pid = params[0];
        if (_Scheduler.currPCB.pid === pid) {
            _Scheduler.currPCB.free();
            _Scheduler.currPCB = null;
        }
        else if (!_Scheduler.idlePcbs.delete(pid)) {
            let queue = new TSOS.Queue();
            while (!_Scheduler.pcbQueue.isEmpty()) {
                let pcb = _Scheduler.pcbQueue.dequeue();
                if (pcb.pid === pid) {
                    pcb.free();
                }
                else {
                    queue.enqueue(pcb);
                }
            }
            while (!queue.isEmpty()) {
                _Scheduler.pcbQueue.enqueue(queue.dequeue());
            }
        }
        const buffer = _StdIn.buffer;
        _Console.clearLine();
        params[1].processPrintDesc();
        _StdOut.advanceLine();
        _OsShell.putPrompt();
        _StdIn.buffer = buffer;
        _StdOut.putText(buffer);
    }
    TSOS.kill = kill;
    //Writes the byte in the Y-register to the standard output as an integer.
    //@params params - [the byte in the Y-register].
    function writeIntConsole(params) {
        if (params.length !== 1) {
            return;
        }
        _StdOut.putText(params[0].toString(16));
    }
    TSOS.writeIntConsole = writeIntConsole;
    //Writes the null-terminated-string at the pointer to the standard output given by the indirect address in the Y-register.
    //@params params - [a pointer to the null-terminated-string in memory].
    function writeStrConsole(params) {
        if (params.length !== 1) {
            return;
        }
        let buffer = "";
        let strPtr = params[0];
        let char = undefined;
        while (char !== 0) {
            char = _MMU.read(strPtr);
            if (char === undefined) {
                return;
            }
            buffer += String.fromCharCode(char);
            strPtr++;
        }
        _StdOut.putText(buffer);
    }
    TSOS.writeStrConsole = writeStrConsole;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=spudAPI.js.map