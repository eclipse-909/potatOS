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
		IR: OpCode;
		PC: number;
		Acc: number;
		Xreg: number;
		Yreg: number;
		Zflag: boolean;
		//stdIn: InStream;//programs don't actually have input
		stdOut: OutStream<string[]>;
		stdErr: ErrStream<string[]>;
		timeEstimate: number;
		cpuTime: number;
		waitTime: number;
		priority: number;
		onDisk: boolean;
		segment: number;

		static highestPID: number = 0;

		private constructor() {}

		//BTW this syntax for making new objects is objectively better than having a special function for a constructor.

		//Takes in the program's binary and creates a process control block out of it.
		//Returns the process control block if successful, or prints to stdErr and returns undefined if unsuccessful.
		//Allocated memory is freed if aborted, but you must call ProcessControlBlock.free() when deleting the pcb that was returned.
		public static new(bin: number[]): ProcessControlBlock | undefined {
			//init pcb
			let pcb: ProcessControlBlock = new ProcessControlBlock();

			//allocate memory
			if (_MMU.fixedSegments && bin.length > _MMU.segmentSize) {
				pcb.stdErr.error(["Binary too large, could not load\n"]);
				return undefined;
			}
			const alloc: {base: number, limit: number} | undefined = _MMU.malloc(bin.length);
			if (alloc === undefined) {
				pcb.stdErr.error(["Out of memory, could not allocate for new process\n"]);
				return undefined;
			}
			pcb.base = alloc.base;
			pcb.limit = alloc.limit;

			//write bin to memory
			bin.forEach((value: number, vPtr: number): void => {
				//Bypass MMU because the MMU can only read and write to memory for processes that are running
				_MemoryController.write(pcb.base + vPtr, value);
			});

			pcb.pid = ProcessControlBlock.highestPID;
			ProcessControlBlock.highestPID++;
			pcb.status = Status.resident;
			pcb.IR = OpCode.BRK;//0-initialized
			pcb.PC = 0x0000;
			pcb.Acc = 0x00;
			pcb.Xreg = 0x00;
			pcb.Yreg = 0x00;
			pcb.Zflag = false;
			pcb.stdOut = _StdOut;//default to the console stdout and stderr
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
		public free(): void {
			_MMU.free(this.base);
		}

		//Uses the length of the binary and the number of branch instructions, and sets this.timeEstimate
		private estimateTime(bin: number[]): void {
			let branches: number = 0;
			for (let i: number = 0; i < bin.length; i++) {
				if (!Object.values(OpCode).includes(bin[i])) {return;}//We must be in the data section
				switch (bin[i] as OpCode) {
					case OpCode.LDAi | OpCode.LDXi | OpCode.LDYi | OpCode.BNEr:
						i++;
						break;
					case OpCode.LDAa | OpCode.STAa | OpCode.LDXa | OpCode.LDYa | OpCode.ADCa | OpCode.CPXa | OpCode.INCa:
						i += 2;
						break;
					case OpCode.SYS:
						if (i < bin.length - 1 && !Object.values(OpCode).includes(bin[i+1])) {
							i += 2;
						}
						break;
				}
			}
			this.timeEstimate = bin.length * (1 + Math.log(1 + branches));//arbitrary equation
		}
	}
}