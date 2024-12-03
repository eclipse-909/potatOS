module TSOS {
	export class Swapper {
		private roll_in(pcb_in: ProcessControlBlock): void {
			const file_in: string = `.swap${pcb_in.pid}`;
			_FileSystem.read(file_in)
				.and_try_run((stderr: ErrStream<string[]>, params: any[]): void => {
					const bin_in: Uint8Array = _DiskController.encode(params[0]);
					const alloc: {base: number, limit: number} | undefined = _MMU.malloc(bin_in.length);
					if (alloc === undefined) {
						if (_MMU.fixedSegments) {
							_Kernel.krnTrapError("Failed to roll-in on swap. Out of memory.");
						} else {
							stderr.error(["Failed to roll-in on swap. Out of memory."]);
							kill(pcb_in.pid, ExitCode.GENERIC_ERROR);
						}
						return;
					}
					pcb_in.base = alloc.base;
					pcb_in.limit = alloc.limit;
					pcb_in.segment = Math.floor(pcb_in.base / 0x100);
					pcb_in.onDisk = false;
					//write bin to memory
					bin_in.forEach((value: number, vPtr: number): void => {
						//Bypass MMU because the MMU can only read and write to memory for processes that are running
						_MemoryController.write(pcb_in.base + vPtr, value);
					});
					Control.updatePcbDisplay();
				})
				.catch((_stderr: ErrStream<string[]>, err: DiskError): void => {
					_Kernel.krnTrapError(`Failed to roll-in on swap. Could not read swap file. ${err.description}`);
				})
				.execute(_StdErr);

			Control.updatePcbDisplay();
		}

		public swap(pcb_out: ProcessControlBlock, pcb_in: ProcessControlBlock): void {
			//autobots, roll out
			if (pcb_out === null) {
				this.roll_in(pcb_in);
				return;
			}
			let bin_out: Uint8Array = new Uint8Array(pcb_out.limit - pcb_out.base + 1);
			for (let i: number = pcb_out.base; i <= pcb_out.limit; i++) {
				bin_out[i - pcb_out.base] = _MemoryController.read(i);
			}
			const file_out: string = `.swap${pcb_out.pid}`;
			const write_command: FileCommand = _FileSystem.write(file_out, _DiskController.decode(bin_out))
				.and_do_run((_stderr: ErrStream<string[]>, _params: any[]): void => {
					pcb_out.free_mem();
					pcb_out.base = -1;
					pcb_out.limit = -1;
					pcb_out.segment = -1;
					pcb_out.onDisk = true;
					this.roll_in(pcb_in);
				})
				.catch((_stderr: ErrStream<string[]>, err: DiskError): void => {
					_Kernel.krnTrapError(`Failed to roll-out on swap. Could not write to swap file. ${err.description}`);
				});
			if (_DiskController.file_exists(file_out)) {
				if (_FileSystem.open_files.has(file_out)) {
					write_command.execute(_StdErr);
				} else {
					_FileSystem.open(file_out)
						.and_try(write_command)
						.catch((_stderr: ErrStream<string[]>, err: DiskError): void => {
							_Kernel.krnTrapError(`Failed to roll-out on swap. Could not open swap file. ${err.description}`);
						})
						.execute(_StdErr);
				}
			} else {
				_FileSystem.create(file_out)
					.and_try(write_command)
					.catch((_stderr: ErrStream<string[]>, err: DiskError): void => {
						_Kernel.krnTrapError(`Failed to roll-out on swap. Could not create swap file. ${err.description}`);
					})
					.execute(_StdErr);
			}
		}
	}
}