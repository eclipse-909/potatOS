// System Call API
// Contains the drivers for system calls and software interrupts

module TSOS {
	/*
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
	*/

	//Kills the process with the given process ID.
	export function kill(pid: number, exitCode: ExitCode): void {
		if (!_Scheduler.remove(pid)) {
			//TODO what happens if it can't find the pcb with the pid?
		}
		Control.updatePcbDisplay();
		Control.updateMemDisplay();
		_OsShell.processExitQueue.enqueue({exitCode: exitCode, pid: pid});
		_OsShell.onProcessFinished();
	}

	//Writes the byte in the Y-register to the standard output as an integer.
	export function writeIntStdOut(stdout: OutStream<string[]>, yReg: number): void {
		stdout.output([yReg.toString(16).toUpperCase()]);
	}

	//Writes the null-terminated-string at the absolute-addressed pointer to the standard output.
	export function writeStrStdOut(stdout: OutStream<string[]>, strPtr: number): void {
		let buffer: string = "";
		let char: number | undefined = undefined;
		while (char !== 0) {
			char = _MMU.read(strPtr);
			if (char === undefined) {return /*TODO what happens when the system call arguments are invalid?*/;}
			buffer += String.fromCharCode(char);
			strPtr++;
		}
		stdout.output([buffer]);
	}
}