// System Call API
// Contains the drivers for system calls and software interrupts
var TSOS;
(function (TSOS) {
    /*
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
    */
    //Kills the process with the given process ID.
    function kill(pid, exitCode) {
        const pcb = _Scheduler.remove(pid);
        if (pcb === null) {
            TSOS.Control.hostLog("Process not found", "Kernel");
            return;
        }
        TSOS.Control.updatePcbDisplay();
        TSOS.Control.updateMemDisplay();
        _OsShell.processExitQueue.enqueue(new TSOS.ShellProcess(pcb.pid, exitCode, pcb.cpuTime + pcb.waitTime, pcb.waitTime));
        if (_Scheduler.currPCB === null) {
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.contextSwitch, []));
        }
        _OsShell.onProcessFinished();
    }
    TSOS.kill = kill;
    //Writes the byte in the Y-register to the standard output as an integer.
    function writeIntStdOut(stdout, yReg) {
        stdout.output([yReg.toString(16).toUpperCase()]);
    }
    TSOS.writeIntStdOut = writeIntStdOut;
    //Writes the null-terminated-string at the absolute-addressed pointer to the standard output.
    function writeStrStdOut(stdout, strPtr) {
        let buffer = "";
        let char = undefined;
        while (char !== 0) {
            char = _MMU.read(strPtr);
            if (char === undefined) {
                return _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.SEGMENTATION_FAULT]));
            }
            buffer += String.fromCharCode(char);
            strPtr++;
        }
        stdout.output([buffer]);
    }
    TSOS.writeStrStdOut = writeStrStdOut;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=spudAPI.js.map