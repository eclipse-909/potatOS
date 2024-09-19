module TSOS {
	export enum Status {
		//process is loaded into memory but not ready for execution
		sleeping,
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
		pageTable: Map<number, number>;
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
			let pcb: ProcessControlBlock = new ProcessControlBlock();
			pcb.pid = ProcessControlBlock.highestPID;
			ProcessControlBlock.highestPID++;
			pcb.status = Status.sleeping;
			pcb.pageTable = new Map<number, number>();
			pcb.stdOut = _StdOut;//default to the console stdout and stderr
			pcb.stdErr = _StdErr;
			pcb.IR = OpCode.BRK;
			pcb.Acc = 0x00;
			pcb.Xreg = 0x00;
			pcb.Yreg = 0x00;
			pcb.Zflag = false;

			/*TODO uncomment this after the demo
			//Allocate as many pages as necessary for this program
			let orgPtr: number | undefined = undefined;
			for (let i: number = 0; i < Math.ceil(bin.length / PAGE_SIZE); i++) {
				const pagePtr: number | undefined = _MMU.malloc(pcb.pageTable);
				if (orgPtr === undefined) {
					orgPtr = pagePtr;
				}
				if (pagePtr === undefined) {
					//abort
					pcb.free();
					return undefined;
				}
				for (let ii: number = 0x0000; ii < Math.min(bin.length, PAGE_SIZE); ii++) {
					_MMU.write(pagePtr + ii, bin[ii]);
				}
			}
			pcb.PC = orgPtr;
			*/


			//TODO delete this after the demo
			//bypass the MMU to write to memory
			for (let i: number = 0x0000; i < bin.length; i++) {
				_MemoryController.write(i, bin[i]);
			}
			pcb.PC = 0x0000;


			return pcb;
		}

		//This must be called when a process is killed
		public free(): void {
			_MMU.free(this.pageTable);
		}
	}
}