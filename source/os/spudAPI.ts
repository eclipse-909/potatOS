// System Call API
// Contains the drivers for system calls and software interrupts

module TSOS {
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
	export function kill(params: any[]): void {
		if (params.length !== 2) {return;}
		const pid: number = params[0];
		if (_Scheduler.currPCB.pid === pid) {
			_Scheduler.currPCB.free();
			_Scheduler.currPCB = null;
		} else {
			let queue: Queue<ProcessControlBlock> = new Queue<ProcessControlBlock>();
			while (!_Scheduler.pcbQueue.isEmpty()) {
				let pcb: ProcessControlBlock = _Scheduler.pcbQueue.dequeue();
				if (pcb.pid === pid) {
					pcb.free();
				} else {
					queue.enqueue(pcb);
				}
			}
			while (!queue.isEmpty()) {
				_Scheduler.pcbQueue.enqueue(queue.dequeue());
			}
		}
		(params[1] as ExitCode).processPrintDesc();
		_StdOut.advanceLine();
		_OsShell.putPrompt();
	}

	//Writes the byte in the Y-register to the standard output as an integer.
	//@params params - [the byte in the Y-register].
	export function writeIntConsole(params: any[]): void {
		if (params.length !== 1) {return;}
		_StdOut.putText((params[0] as number).toString(16));
	}

	//Writes the null-terminated-string at the pointer to the standard output given by the indirect address in the Y-register.
	//@params params - [a pointer to the null-terminated-string in memory].
	export function writeStrConsole(params: any[]): void {
		if (params.length !== 1) {return;}
		let buffer: string = "";
		let strPtr: number = params[0];
		let char: number | undefined = undefined;
		while (char !== 0) {
			char = _MMU.read(strPtr);
			if (char === undefined) {return;}
			buffer += String.fromCharCode(char);
			strPtr++;
		}
		_StdOut.putText(buffer);
	}
}