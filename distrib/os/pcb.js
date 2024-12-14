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
        priority; //TODO how do you determine the priority of a process?
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
                _StdErr.error(["Binary too large, could not load\n"]);
                return undefined;
            }
            pcb.pid = ProcessControlBlock.highestPID;
            ProcessControlBlock.highestPID++;
            const alloc = _MMU.malloc(bin.length);
            if (alloc === undefined) {
                if (!_DiskController.is_formatted()) {
                    _StdErr.error(["Disk is not formatted, cannot create swap file.\n"]);
                    return undefined;
                }
                //create swap file
                let bin_clone;
                if (_MMU.fixedSegments) {
                    bin_clone = new Uint8Array(_MMU.segmentSize);
                    for (let i = 0; i < bin.length; i++) {
                        bin_clone[i] = bin[i];
                    }
                }
                else {
                    bin_clone = bin;
                }
                const file = `.swap${pcb.pid}`;
                const write_command = _FileSystem.write(file, _DiskController.decode(bin_clone))
                    .catch((stderr, err) => {
                    stderr.error([err.description]);
                    TSOS.kill(pcb.pid, TSOS.ExitCode.GENERIC_ERROR);
                });
                if (_DiskController.file_exists(file)) {
                    if (_FileSystem.open_files.has(file)) {
                        write_command.execute(_StdErr);
                    }
                    else {
                        _FileSystem.open(file)
                            .and_try(write_command)
                            .execute(_StdErr);
                    }
                }
                else {
                    _FileSystem.create(file)
                        .and_try(write_command)
                        .catch((stderr, err) => {
                        stderr.error([err.description]);
                        TSOS.kill(pcb.pid, TSOS.ExitCode.GENERIC_ERROR);
                    })
                        .and_do(_FileSystem.close(file)) //will be re-opened when ran and in ready-queue
                        .execute(_StdErr);
                }
                pcb.base = -1;
                pcb.limit = -1;
                pcb.segment = -1;
                pcb.onDisk = true;
            }
            else {
                pcb.base = alloc.base;
                pcb.limit = alloc.limit;
                pcb.segment = Math.floor(pcb.base / 0x100);
                pcb.onDisk = false;
                //write bin to memory
                bin.forEach((value, vPtr) => {
                    //Bypass MMU because the MMU can only read and write to memory for processes that are running
                    _MemoryController.write(pcb.base + vPtr, value);
                });
            }
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
            //Estimate how long this binary should take
            pcb.estimateTime(bin);
            return pcb;
        }
        free_mem() {
            if (!this.onDisk) {
                _MMU.free(this.base);
            }
        }
        //This must be called when a process is killed
        free() {
            this.free_mem();
            //try to delete the associated swap file, and ignore any errors
            const file = `.swap${this.pid}`;
            _FileSystem.close(file)
                .and_do(_FileSystem.delete(file))
                .execute(null);
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