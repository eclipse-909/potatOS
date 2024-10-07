// System Call API
// Contains the drivers for system calls and software interrupts

module TSOS {
	//
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

	//Kills the process with the given process ID.
	//@param params - [process ID, exit code].
	export function kill(params: any[]): void {
		if (params.length !== 2) {return /*TODO what happens when the system call arguments are invalid?*/;}
		const pid: number = params[0];
		if (_Scheduler.currPCB.pid === pid) {
			_Scheduler.currPCB.status = Status.terminated;
			_Scheduler.currPCB.free();
			_Scheduler.currPCB = null;
		} else if (!_Scheduler.residentPcbs.delete(pid)) {
			let queue: Queue<ProcessControlBlock> = new Queue<ProcessControlBlock>();
			while (!_Scheduler.pcbQueue.isEmpty()) {
				let pcb: ProcessControlBlock = _Scheduler.pcbQueue.dequeue();
				if (pcb.pid === pid) {
					pcb.status = Status.terminated;
					pcb.free();
				} else {
					queue.enqueue(pcb);
				}
			}
			while (!queue.isEmpty()) {
				_Scheduler.pcbQueue.enqueue(queue.dequeue());
			}
		}
		Control.updatePcbDisplay();
		_OsShell.processExitQueue.enqueue({exitCode: params[1] as ExitCode, pid: pid});
		_OsShell.onProcessFinished();
	}

	//Writes the byte in the Y-register to the standard output as an integer.
	//@params params - [output handle, the byte in the Y-register].
	export function writeIntStdOut(params: any[]): void {
		if (params.length !== 2) {return /*TODO what happens when the system call arguments are invalid?*/;}
		(params[0] as OutStream<string[]>).output([(params[1] as number).toString(16).toUpperCase()]);
	}

	//Writes the null-terminated-string at the pointer to the standard output given by the indirect address in the Y-register.
	//@params params - [output handle, a pointer to the null-terminated-string in memory].
	export function writeStrStdOut(params: any[]): void {
		if (params.length !== 2) {return /*TODO what happens when the system call arguments are invalid?*/;}
		let buffer: string = "";
		let strPtr: number = params[1];
		let char: number | undefined = undefined;
		while (char !== 0) {
			char = _MMU.read(strPtr);
			if (char === undefined) {return /*TODO what happens when the system call arguments are invalid?*/;}
			buffer += String.fromCharCode(char);
			strPtr++;
		}
		(params[0] as OutStream<string[]>).output([buffer]);
	}
}