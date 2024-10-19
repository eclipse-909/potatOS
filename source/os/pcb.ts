module TSOS {
	export enum Status {
		//process is loaded into memory but not ready for execution
		resident,
		//ready to be executed by scheduler
		ready,
		//currently being executed
		running,
		//process was killed
		terminated
	}

	export class ProcessControlBlock {
		pid: number;
		status: Status;
		base: number;
		limit: number;
		//stdIn: InStream;//programs don't actually have input
		stdOut: OutStream<string[]>;
		stdErr: ErrStream<string[]>;
		IR: OpCode;
		PC: number;
		Acc: number;
		Xreg: number;
		Yreg: number;
		Zflag: boolean;

		static highestPID: number = 0;

		private constructor() {}

		//BTW this syntax for making new objects is objectively better than having a special function for a constructor.

		//Takes in the program's binary and creates a process control block out of it.
		//Returns the process control block if successful, or undefined if it could not allocate enough memory.
		//Allocated memory is freed if aborted, but you must call ProcessControlBlock.free() when deleting the pcb that was returned.
		public static new(bin: number[]): ProcessControlBlock | undefined {
			//init pcb
			let pcb: ProcessControlBlock = new ProcessControlBlock();
			pcb.pid = ProcessControlBlock.highestPID;
			ProcessControlBlock.highestPID++;
			pcb.status = Status.resident;
			pcb.stdOut = _StdOut;//default to the console stdout and stderr
			pcb.stdErr = _StdErr;
			pcb.IR = OpCode.BRK;//0-initialized
			pcb.PC = 0x0000;
			pcb.Acc = 0x00;
			pcb.Xreg = 0x00;
			pcb.Yreg = 0x00;
			pcb.Zflag = false;

			//allocate memory
			if (_MMU.allocMode === AllocMode.Fixed && bin.length > MEM_BLOCK_SIZE) {
				//TODO instead of returning undefined, I should use stdErr to print "Binary too large"
				return undefined;//TODO find out if I can make processes span multiple blocks of length 256, like a 512 block for example.
			}
			let alloc: {base: number, limit: number} | undefined = _MMU.malloc(bin.length);
			if (alloc === undefined) {
				//TODO instead of returning undefined, I should use stdErr to print "Out of memory, could not allocate for new process"
				return undefined;
			}
			pcb.base = alloc.base;
			pcb.limit = alloc.limit;

			//write bin to memory
			bin.forEach((value: number, address: number): void => {
				console.assert(_MMU.write(address, value));
			});
			return pcb;
		}

		//This must be called when a process is killed
		public free(): void {
			_MMU.free(this.base);
		}
	}
}