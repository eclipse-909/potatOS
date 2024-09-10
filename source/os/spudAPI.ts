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

	//@param params - none.
	//@returns ExitCode | SignalCode - ExitCode; SignalCode if fatal error.
	function kill(params: any[]): ExitCode | SignalCode {
		if (params.length !== 0) {return fatalError(SignalCode.einval);}
		_CPU.isExecuting = false;

		//TODO kill the currently-running process. I might need to pass the process ID as a parameter
		//If it tries to kill the process right before a context switch, the active process ID might change, so I should pass it in before that.

		return ExitCode.success;
	}

	//@params params - the byte in the Y-register.
	//@returns ExitCode | SignalCode - ExitCode; SignalCode if fatal error.
	function writeIntConsole(params: any[]): ExitCode | SignalCode {
		if (params.length !== 1) {return fatalError(SignalCode.einval);}
		_StdOut.putText((params[0] as number).toString(16));
		return ExitCode.success;
	}

	//@params params - a pointer to the null-terminated string in memory, given by the indirect address in the Y-register.
	//@returns ExitCode | SignalCode - ExitCode; SignalCode if fatal error.
	function writeStrConsole(params: any[]): ExitCode | SignalCode {
		if (params.length !== 1) {return fatalError(SignalCode.einval);}
		let buffer: string = "";
		let strPtr: number | undefined = _MMU.toPhysical(params[0]);
		if (strPtr === undefined) {return fatalError(SignalCode.efault);}
		let char: number | undefined = undefined;
		while (char !== 0) {
			char = _MemoryController.read(strPtr);
			buffer += String.fromCharCode(char);
		}
		_StdOut.putText(buffer);
		return ExitCode.success;
	}
}