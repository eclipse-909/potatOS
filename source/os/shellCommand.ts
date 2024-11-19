module TSOS {
	export class ShellCommand {
		public func: (stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>) => ExitCode;
		public command: string;
		public description: string;
		//Used for autocompletion of the FIRST argument only, not for verifying input
		public validArgs: string[];

		constructor(
			func: (stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>) => ExitCode,
			command: string,
			description: string,
			validArgs: string[] = []
		) {
			this.func = func;
			this.command = command;
			this.description = description;
			this.validArgs = validArgs;
		}

		public static COMMAND_LIST: ShellCommand[] = [
			new ShellCommand(ShellCommand.shellVer, "ver", "- Displays the current version data.\n"),
			new ShellCommand(ShellCommand.shellHelp, "help", "- This is the help command. Seek help."),
			new ShellCommand(ShellCommand.shellShutdown, "shutdown", "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.\n"),
			new ShellCommand(ShellCommand.shellCls, "cls", "- Clears the screen and resets the cursor position.\n"),
			new ShellCommand(ShellCommand.shellMan, "man", "<topic> - Displays the MANual page for <topic>.\n"),
			new ShellCommand(ShellCommand.shellTrace, "trace", "<on | off> - Turns the OS trace on or off.\n", ["on", "off"]),
			new ShellCommand(ShellCommand.shellRot13, "rot13", "<string...> - Does rot13 obfuscation on <string...>.\n"),
			new ShellCommand(ShellCommand.shellPrompt, "prompt", "<string...> - Sets the prompt.\n"),
			new ShellCommand(ShellCommand.shellDate, "date", "- Displays the current date and time.\n"),
			new ShellCommand(ShellCommand.shellWhereAmI, "whereami", "- Displays the user's current location.\n"),
			new ShellCommand(ShellCommand.shellEcho, "echo", "- Displays the given text to standard output.\n"),
			new ShellCommand(ShellCommand.shellStatus, "status", "- Displays a message to the task bar.\n"),
			new ShellCommand(ShellCommand.shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message.\n"),
			new ShellCommand(ShellCommand.shellLoad, "load", "- Loads the binary program from the HTML input field to the disk.\n"),
			new ShellCommand(ShellCommand.shellRun, "run", "<process ID> [&] - Run the program in memory with the process ID. Use ampersand to run in background asynchronously.\n"),
			new ShellCommand(ShellCommand.shellClh, "clh", "- Clears the host log.\n"),
			new ShellCommand(ShellCommand.shellClearMem, "clearmem", "- Clears memory of all resident/terminated processes.\n"),
			new ShellCommand(ShellCommand.shellRunAll, "runall", "- Runs all programs in memory concurrently.\n"),
			new ShellCommand(ShellCommand.shellPs, "ps", "- Displays the PID and status of all processes.\n"),
			new ShellCommand(ShellCommand.shellKill, "kill", "<process ID> - Terminates the process with the given process ID.\n"),
			new ShellCommand(ShellCommand.shellKillAll, "killall", "- Terminates all processes.\n"),
			new ShellCommand(ShellCommand.shellQuantum, "quantum", "<int> - Set the quantum (measured in CPU cycles) for Round-Robin scheduling. Must be non-zero. Negative quantum will reverse the order of execution\n"),
			new ShellCommand(ShellCommand.shellChAlloc, "challoc", "<FirstFit | BestFit | WorstFit> - Set the mode for allocating new processes.\n", ["FirstFit", "BestFit", "WorstFit"]),
			new ShellCommand(ShellCommand.shellChSegment, "chsegment", "<fixed | variable> [<int>] - Change segment allocation to fixed or variable size. If fixed, pass the size as a positive integer.\n", ["fixed", "variable"]),
			new ShellCommand(ShellCommand.shellChSched, "chsched", "<RR | NP_FCFS | P_SJF> - Change the CPU scheduling mode.\n", ["RR", "NP_FCFS", "P_SJF"])
		] as const;

		static shellVer(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: ver\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			stdout.output([APP_NAME + " version " + APP_VERSION + "\n"]);
			return ExitCode.SUCCESS;
		}

		static shellHelp(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: help\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			let text: string =
				"Keybindings:\n" +
				"  Arrow Up/Down = previous/next command in history\n" +
				"  CTRL + Shift + Arrow Up/Down = scroll one line\n" +
				"  Mouse Wheel = scroll three lines\n" +
				"  Shift + Page Up/Down = scroll one page\n" +
				"  Shift + Home/End = scroll to top/bottom\n" +
				"Command Syntax:\n" +
				"  <> = parameter type/option\n" +
				"  ... = repeatable parameter\n" +
				"  [] = optional parameter\n" +
				"  | = either parameter is acceptable\n" +
				"Commands:\n";
			for (const i in ShellCommand.COMMAND_LIST) {
				text += "  " + ShellCommand.COMMAND_LIST[i].command + " " + ShellCommand.COMMAND_LIST[i].description;
			}
			stdout.output([text]);
			return ExitCode.SUCCESS;
		}

		public static shellShutdown(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: shutdown\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			// Call Kernel shutdown routine.
			_Kernel.krnShutdown();
			stdout.output(["Shutting down...\n"]);
			return ExitCode.SUCCESS;
		}

		static shellCls(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: cls\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_StdOut.clearScreen();
			_StdOut.putPrompt();
			return ExitCode.SUCCESS;
		}

		static shellMan(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: man <topic>  Please supply a topic.\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			const topic = args[0];
			const cmd: ShellCommand | undefined = ShellCommand.COMMAND_LIST.find((item: ShellCommand) => {return item.command === topic;});
			if (cmd) {
				stdout.output([cmd.description + "\n"]);
				return ExitCode.SUCCESS;
			}
			stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No manual entry for " + args[0] + ".\n"]);
			return ExitCode.GENERIC_ERROR;
		}

		static shellTrace(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: trace <on | off>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			const setting = args[0];
			switch (setting) {
				case "on":
					if (_Trace && _SarcasticMode) {
						stdout.output(["Trace is already on, doofus.\n"]);
						return ExitCode.SUCCESS;
					} else {
						_Trace = true;
						stdout.output(["Trace ON\n"]);
						return ExitCode.SUCCESS;
					}
				case "off":
					_Trace = false;
					stdout.output(["Trace OFF\n"]);
					return ExitCode.SUCCESS;
				default:
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument.  Usage: trace <on | off>.\n"]);
					return ExitCode.SHELL_MISUSE;
			}
		}

		static shellRot13(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length > 0) {
				stdout.output([args.join(' ') + " = '" + Utils.rot13(args.join(' ')) +"'\n"]);
				return ExitCode.SUCCESS;
			} else {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: rot13 <string>  Please supply a string.\n"]);
				return ExitCode.SHELL_MISUSE;
			}
		}

		static shellPrompt(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length > 0) {
				_OsShell.promptStr = args[0];
				return ExitCode.SUCCESS;
			} else {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: prompt <string>  Please supply a string.\n"]);
				return ExitCode.SHELL_MISUSE;
			}
		}

		static shellDate(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: date\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			stdout.output([new Date().toString() + "\n"]);
			return ExitCode.SUCCESS;
		}

		static shellWhereAmI(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: whereami\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			stdout.output(["You're in your office trying to steal my source code... STOP IT!!!\n"]);
			return ExitCode.SUCCESS;
		}

		static shellEcho(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length === 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: echo <string>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			stdout.output([args.join(" ") + "\n"]);
			return ExitCode.SUCCESS;
		}

		static shellStatus(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length === 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: status <string>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			//Is it okay to do GUI stuff here?
			document.getElementById("footerStatus").innerHTML = args.join(" ");
			return ExitCode.SUCCESS;
		}

		static shellBSOD(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: bsod\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_Kernel.krnTrapError("Self-induced error via shell command.");
			return ExitCode.SUCCESS;
		}

		static shellLoad(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: load\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			//Is it okay to do GUI stuff here?
			const textArea: HTMLTextAreaElement = document.getElementById("taProgramInput") as HTMLTextAreaElement;
			let input: string = textArea.value;
			input = input.replace(/\s+/g, ' ').trim();
			const hexArray: string[] = input.split(/[\s,]+/);

			// If you're curious why I'm also allowing hex numbers and separators to be formatted as '0xAD, 0x04, 0x00',
			// it's because I made an assembler for this instruction set that outputs the binary this way.

			const bin: number[] = hexArray.map(hex => {
				const cleanedHex: string = hex.startsWith('0x') ? hex.slice(2) : hex;
				let num: number = parseInt(cleanedHex, 16);
				if (num < 0 || num > 0xff) {
					num = NaN;
				}
				return num;
			});
			//textArea.value = "";//don't clear input area on load
			if (bin.some(Number.isNaN)) {
				stderr.error([
					ExitCode.SHELL_MISUSE.shellDesc()
					+ " - Invalid binary syntax. Hex values must range from 0x00-0xFF, have the format of '0xFF' or 'FF', and be separated either by ' ' or ', '\"\n"
				]);
				return ExitCode.GENERIC_ERROR;
			}
			const pcb: ProcessControlBlock | undefined = ProcessControlBlock.new(bin);
			if (pcb === undefined) {
				//Error message is handled in ProcessControlBlock.new()
				return ExitCode.GENERIC_ERROR;
			}
			_Scheduler.load(pcb);
			stdout.output([`Program loaded into memory with process ID ${pcb.pid}.\n`]);
			Control.updatePcbDisplay();
			Control.updateMemDisplay();
			return ExitCode.SUCCESS;
		}

		//@Returns
		// - An exit code if an error occurred before running the process.
		// - Undefined if running synchronously.
		// - Null if running asynchronously.
		static shellRun(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode | undefined | null {
			const args: string[] = stdin.input();
			if (!(args.length === 1 || args.length === 2)) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <pid> [&]\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			//add support for "run all" with space
			if (args[0].toLowerCase() === "all" && args.length === 1) {
				for (const pcb of _Scheduler.allProcs()) {
					ShellCommand.runHelper(pcb.pid, true, stdout, stderr);
				}
				return null;
			}
			let async: boolean = false;
			if (args.length === 2) {
				if (args[1] === '&') {
					async  = true;
				} else {
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <pid> [&]\n"]);
					return ExitCode.SHELL_MISUSE;
				}
			}
			const pid: number = Number.parseInt(args[0]);
			if (Number.isNaN(pid)) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - pid must be an integer. Usage: run <pid> [&]\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			return ShellCommand.runHelper(pid, async, stdout, stderr);
		}

		private static runHelper(pid: number, async: boolean, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode | undefined | null {
			const pcb: ProcessControlBlock | undefined = _Scheduler.run(pid);
			if (!pcb) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + ` - Could not find process ${pid}.\n`]);
				return ExitCode.GENERIC_ERROR;
			}
			if (!async) {//must print to console if async because piping doesn't work in background. I would have to implement IO waiting and concurrency
				pcb.stdOut = stdout;
				pcb.stdErr = stderr;
			}
			Control.updatePcbDisplay();
			Control.updateCpuDisplay();
			return async? null : undefined;
		}

		static shellClh(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: clh\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			//Is it okay to do GUI stuff here?
			(document.getElementById("hostLog") as HTMLInputElement).value = "";
			return ExitCode.SUCCESS;
		}

		static shellClearMem(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: clearmem\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_Scheduler.clearMem();
			stdout.output(["Resident processes cleared. Running/ready processes were not affected\n"]);
			return ExitCode.SUCCESS;
		}

		//@Returns
		// - An exit code if an error occurred before running the process.
		// - Null if successful.
		static shellRunAll(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: runall\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			for (const pcb of _Scheduler.allProcs()) {
				if (pcb.status === Status.resident) {
					ShellCommand.runHelper(pcb.pid, true, stdout, stderr);
				}
			}
			return ExitCode.SUCCESS;
		}

		static shellPs(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: ps\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			for (const pcb of _Scheduler.allProcs()) {
				stdout.output([`Process: ${pcb.pid} - Status: ${Status[pcb.status]}\n`]);
			}
			return ExitCode.SUCCESS;
		}

		static shellKill(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: kill <pid>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			//add support for "kill all" with space
			if (args[0].toLowerCase() === "all") {
				for (const pcb of _Scheduler.allProcs()) {
					_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [pcb.pid, ExitCode.PROC_KILLED]));
				}
				return ExitCode.SUCCESS;
			}
			const pid: number = Number.parseInt(args[0]);
			if (Number.isNaN(pid)) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-negative integer). Usage: kill <pid>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [pid, ExitCode.PROC_KILLED]));
			return ExitCode.SUCCESS;
		}

		static shellKillAll(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: killall\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			for (const pcb of _Scheduler.allProcs()) {
				_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [pcb.pid, ExitCode.PROC_KILLED]));
			}
			return ExitCode.SUCCESS;
		}

		static shellQuantum(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: quantum <int>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			let pid: number = Number.parseInt(args[0]);
			if (Number.isNaN(pid) || pid === 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-zero integer). Usage: quantum <int>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_Scheduler.quantum = pid;
			return ExitCode.SUCCESS;
		}

		static shellChAlloc(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: challoc <FirstFit | BestFit | WorstFit>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			switch (args[0].toLowerCase()) {
				case "firstfit":
					_MMU.allocMode = AllocMode.FirstFit;
					break;
				case "bestfit":
					_MMU.allocMode = AllocMode.BestFit;
					break;
				case "worstfit":
					_MMU.allocMode = AllocMode.WorstFit;
					break;
				default:
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: challoc <FirstFit | BestFit | WorstFit>\n"]);
					return ExitCode.SHELL_MISUSE;
			}
			return ExitCode.SUCCESS;
		}

		static shellChSegment(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1 && args.length !== 2) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [<int>]\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			switch (args[0].toLowerCase()) {
				case "fixed":
					if (args.length !== 2) {
						stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [<int>]\n"]);
						return ExitCode.SHELL_MISUSE;
					}
					_MMU.fixedSegments = true;
					const size: number = Number.parseInt(args[1]);
					if (Number.isNaN(size) || size <= 0) {
						stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Size must be a positive integer. Usage: chsegment <fixed | variable> [<int>]\n"]);
						return ExitCode.SHELL_MISUSE;
					}
					_MMU.segmentSize = size;
					break;
				case "variable":
					if (args.length !== 1) {
						stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Cannot use a specific size for variable-sized segments. Usage: chsegment <fixed | variable> [<int>]\n"]);
						return ExitCode.SHELL_MISUSE;
					}
					_MMU.fixedSegments = false;
					break;
				default:
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [<int>]\n"]);
					return ExitCode.SHELL_MISUSE;
			}
			return ExitCode.SUCCESS;
		}

		static shellChSched(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | NP_FCFS | P_SJF>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			switch (args[0].toUpperCase()) {
				case "RR":
					_Scheduler.scheduleMode = ScheduleMode.RR;
					break;
				case "NP_FCFS":
					_Scheduler.scheduleMode = ScheduleMode.NP_FCFS;
					break;
				case "P_SJF":
					_Scheduler.scheduleMode = ScheduleMode.P_SJF;
					break;
				default:
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | NP_FCFS | P_SJF>\n"]);
					return ExitCode.SHELL_MISUSE;
			}
			Control.updatePcbMeta()
			return ExitCode.SUCCESS;
		}

		static shellFormat(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO format
			return
		}

		static shellCreate(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO create
			return
		}

		static shellRead(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO read
			return
		}

		static shellWrite(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO write
			return
		}

		static shellDelete(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO delete
			return
		}

		static shellCopy(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO copy
			return
		}

		static shellRename(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO rename
			return
		}

		static shellLs(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO ls
			return
		}

		static shellGrep(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			//TODO grep
			return
		}
	}
}