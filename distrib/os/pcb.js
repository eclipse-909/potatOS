var TSOS;
(function (TSOS) {
    let Status;
    (function (Status) {
        //process is loaded into memory but not ready for execution
        Status[Status["resident"] = 0] = "resident";
        //ready to be executed by scheduler
        Status[Status["ready"] = 1] = "ready";
        //currently being executed
        Status[Status["running"] = 2] = "running";
        //process was killed
        Status[Status["terminated"] = 3] = "terminated";
    })(Status = TSOS.Status || (TSOS.Status = {}));
    class ProcessControlBlock {
        pid;
        status;
        base;
        limit;
        //stdIn: InStream;//programs don't actually have input
        stdOut;
        stdErr;
        IR;
        PC;
        Acc;
        Xreg;
        Yreg;
        Zflag;
        static highestPID = 0;
        constructor() { }
        //BTW this syntax for making new objects is objectively better than having a special function for a constructor.
        //Takes in the program's binary and creates a process control block out of it.
        //Returns the process control block if successful, or undefined if it could not allocate enough memory.
        //Allocated memory is freed if aborted, but you must call ProcessControlBlock.free() when deleting the pcb that was returned.
        static new(bin) {
            //init pcb
            let pcb = new ProcessControlBlock();
            pcb.pid = ProcessControlBlock.highestPID;
            ProcessControlBlock.highestPID++;
            pcb.status = Status.resident;
            pcb.stdOut = _StdOut; //default to the console stdout and stderr
            pcb.stdErr = _StdErr;
            pcb.IR = TSOS.OpCode.BRK; //0-initialized
            pcb.PC = 0x0000;
            pcb.Acc = 0x00;
            pcb.Xreg = 0x00;
            pcb.Yreg = 0x00;
            pcb.Zflag = false;
            //allocate memory
            if (_MMU.allocMode === TSOS.AllocMode.Fixed && bin.length > TSOS.MEM_BLOCK_SIZE) {
                //TODO instead of returning undefined, I should use stdErr to print "Binary too large"
                return undefined; //TODO find out if I can make processes span multiple blocks of length 256, like a 512 block for example.
            }
            let alloc = _MMU.malloc(bin.length);
            if (alloc === undefined) {
                //TODO instead of returning undefined, I should use stdErr to print "Out of memory, could not allocate for new process"
                return undefined;
            }
            pcb.base = alloc.base;
            pcb.limit = alloc.limit;
            //write bin to memory
            bin.forEach((value, address) => {
                console.assert(_MMU.write(address, value));
            });
            return pcb;
        }
        //This must be called when a process is killed
        free() {
            _MMU.free(this.base);
        }
    }
    TSOS.ProcessControlBlock = ProcessControlBlock;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=pcb.js.map