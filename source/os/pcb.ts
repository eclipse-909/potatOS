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
		//lowest memory address addressable by this PCB
		base: number;
		//highest memory address addressable by this PCB
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
		priority: number;//TODO how do you determine the priority of a process?
		onDisk: boolean;
		segment: number;

		static highestPID: number = 0;

		private constructor() {}

		//BTW this syntax for making new objects is objectively better than having a special function for a constructor.

		//Takes in the program's binary and creates a process control block out of it.
		//Returns the process control block if successful, or prints to stdErr and returns undefined if unsuccessful.
		//Allocated memory is freed if aborted, but you must call ProcessControlBlock.free() when deleting the pcb that was returned.
		public static new(bin: Uint8Array): ProcessControlBlock | undefined {
			//init pcb
			let pcb: ProcessControlBlock = new ProcessControlBlock();

			//allocate memory
			if (_MMU.fixedSegments && bin.length > _MMU.segmentSize) {
				_StdErr.error(["Binary too large, could not load\n"]);
				return undefined;
			}
			pcb.pid = ProcessControlBlock.highestPID;
			ProcessControlBlock.highestPID++;
			const alloc: {base: number, limit: number} | undefined = _MMU.malloc(bin.length);
			if (alloc === undefined) {
				//create swap file
				let bin_clone: Uint8Array;
				if (_MMU.fixedSegments) {
					bin_clone = new Uint8Array(_MMU.segmentSize);
					for (let i: number = 0; i < bin.length; i++) {
						bin_clone[i] = bin[i];
					}
				} else {
					bin_clone = bin;
				}
				const file: string = `.swap${pcb.pid}`;
				const write_command: FileCommand = _FileSystem.write(file, _DiskController.decode(bin_clone))
					.catch((stderr: ErrStream<string[]>, err: DiskError): void => {
						stderr.error([err.description]);
						kill(pcb.pid, ExitCode.GENERIC_ERROR);
					});
				if (_DiskController.file_exists(file)) {
					if (_FileSystem.open_files.has(file)) {
						write_command.execute(_StdErr);
					} else {
						_FileSystem.open(file)
							.and_try(write_command)
							.execute(_StdErr);
					}
				} else {
					_FileSystem.create(file)
						.and_try(write_command)
						.catch((stderr: ErrStream<string[]>, err: DiskError): void => {
							stderr.error([err.description]);
							kill(pcb.pid, ExitCode.GENERIC_ERROR);
						})
						.and_do(_FileSystem.close(file))//will be re-opened when ran and in ready-queue
						.execute(_StdErr);
				}
				pcb.base = -1;
				pcb.limit = -1;
				pcb.segment = -1;
				pcb.onDisk = true;
			} else {
				pcb.base = alloc.base;
				pcb.limit = alloc.limit;
				pcb.segment = Math.floor(pcb.base / 0x100);
				pcb.onDisk = false;
				//write bin to memory
				bin.forEach((value: number, vPtr: number): void => {
					//Bypass MMU because the MMU can only read and write to memory for processes that are running
					_MemoryController.write(pcb.base + vPtr, value);
				});
			}
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

			//Estimate how long this binary should take
			pcb.estimateTime(bin);
			return pcb;
		}

		public free_mem(): void {
			if (!this.onDisk) {
				_MMU.free(this.base);
			}
		}

		//This must be called when a process is killed
		public free(): void {
			this.free_mem();
			//try to delete the associated swap file, and ignore any errors
			const file: string = `.swap${this.pid}`;
			_FileSystem.close(file)
				.and_do(_FileSystem.delete(file))
				.execute(null);
		}

		//Uses the length of the binary and the number of branch instructions, and sets this.timeEstimate
		private estimateTime(bin: Uint8Array): void {
			let branches: number = 0;
			for (let i: number = 0; i < bin.length; i++) {
				const opcode: OpCode | undefined = OpCode[bin[i] as unknown as keyof typeof OpCode];
				if (opcode === undefined) {break;}//We must be in the data section
				switch (bin[i]) {
					case OpCode.BNEr:
						branches++;
					case OpCode.LDAi:
					case OpCode.LDXi:
					case OpCode.LDYi:
						i++;
						break;
					case OpCode.LDAa:
					case OpCode.STAa:
					case OpCode.LDXa:
					case OpCode.LDYa:
					case OpCode.ADCa:
					case OpCode.CPXa:
					case OpCode.INCa:
						i += 2;
						break;
					// case OpCode.SYS:
					// 	if (i < bin.length - 1 && OpCode[bin[i+1] as unknown as keyof typeof OpCode] === undefined) {
					// 		i += 2;
					// 	}
					// 	break;
				}
			}
			this.timeEstimate = bin.length * (1 + Math.log2(branches * 50 + 1));//arbitrary equation
		}
	}
}