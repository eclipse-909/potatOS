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
        //lowest memory address addressable by this PCB
        base;
        //highest memory address addressable by this PCB
        limit;
        IR;
        PC;
        Acc;
        Xreg;
        Yreg;
        Zflag;
        //stdIn: InStream;//programs don't actually have input
        stdOut;
        stdErr;
        timeEstimate;
        cpuTime;
        waitTime;
        priority;
        onDisk;
        segment;
        static highestPID = 0;
        constructor() { }
        //BTW this syntax for making new objects is objectively better than having a special function for a constructor.
        //Takes in the program's binary and creates a process control block out of it.
        //Returns the process control block if successful, or prints to stdErr and returns undefined if unsuccessful.
        //Allocated memory is freed if aborted, but you must call ProcessControlBlock.free() when deleting the pcb that was returned.
        static new(bin) {
            //init pcb
            let pcb = new ProcessControlBlock();
            //allocate memory
            if (_MMU.fixedSegments && bin.length > _MMU.segmentSize) {
                pcb.stdErr.error(["Binary too large, could not load\n"]);
                return undefined;
            }
            const alloc = _MMU.malloc(bin.length);
            if (alloc === undefined) {
                pcb.stdErr.error(["Out of memory, could not allocate for new process\n"]);
                return undefined;
            }
            pcb.base = alloc.base;
            pcb.limit = alloc.limit;
            //write bin to memory
            bin.forEach((value, vPtr) => {
                //Bypass MMU because the MMU can only read and write to memory for processes that are running
                _MemoryController.write(pcb.base + vPtr, value);
            });
            pcb.pid = ProcessControlBlock.highestPID;
            ProcessControlBlock.highestPID++;
            pcb.status = Status.resident;
            pcb.IR = TSOS.OpCode.BRK; //0-initialized
            pcb.PC = 0x0000;
            pcb.Acc = 0x00;
            pcb.Xreg = 0x00;
            pcb.Yreg = 0x00;
            pcb.Zflag = false;
            pcb.stdOut = _StdOut; //default to the console stdout and stderr
            pcb.stdErr = _StdErr;
            pcb.cpuTime = 0;
            pcb.waitTime = 0;
            pcb.priority = 0;
            pcb.onDisk = false;
            pcb.segment = Math.floor(pcb.base / 0x100);
            //Estimate how long this binary should take
            pcb.estimateTime(bin);
            return pcb;
        }
        //This must be called when a process is killed
        free() {
            _MMU.free(this.base);
        }
        //Uses the length of the binary and the number of branch instructions, and sets this.timeEstimate
        estimateTime(bin) {
            let branches = 0;
            for (let i = 0; i < bin.length; i++) {
                const opcode = TSOS.OpCode[bin[i]];
                if (opcode === undefined) {
                    break;
                } //We must be in the data section
                switch (bin[i]) {
                    case TSOS.OpCode.BNEr:
                        branches++;
                    case TSOS.OpCode.LDAi:
                    case TSOS.OpCode.LDXi:
                    case TSOS.OpCode.LDYi:
                        i++;
                        break;
                    case TSOS.OpCode.LDAa:
                    case TSOS.OpCode.STAa:
                    case TSOS.OpCode.LDXa:
                    case TSOS.OpCode.LDYa:
                    case TSOS.OpCode.ADCa:
                    case TSOS.OpCode.CPXa:
                    case TSOS.OpCode.INCa:
                        i += 2;
                        break;
                    // case OpCode.SYS:
                    // 	if (i < bin.length - 1 && OpCode[bin[i+1] as unknown as keyof typeof OpCode] === undefined) {
                    // 		i += 2;
                    // 	}
                    // 	break;
                }
            }
            this.timeEstimate = bin.length * (1 + Math.log2(branches * 50 + 1)); //arbitrary equation
        }
    }
    TSOS.ProcessControlBlock = ProcessControlBlock;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=pcb.js.map