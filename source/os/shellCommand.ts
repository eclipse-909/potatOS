module TSOS {
	export class ShellCommand {
		public func: (stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>) => ExitCode;
		public command: string;
		public description: string;
		//Used for autocompletion of the arguments only, not for verifying input
		public validArgs: string[][];
		public aliases: string[];

		constructor(
			func: (stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>) => ExitCode,
			command: string,
			description: string,
			validArgs: string[][] = [],
			aliases: string[] = []
		) {
			this.func = func;
			this.command = command;
			this.description = description;
			this.validArgs = validArgs;
			this.aliases = aliases;
		}

		public static COMMAND_LIST: ShellCommand[] = [
			new ShellCommand(ShellCommand.shellVer, "ver", "- Displays the current version data.\n"),
			new ShellCommand(ShellCommand.shellHelp, "help", "- This is the help command. Seek help."),
			new ShellCommand(ShellCommand.shellShutdown, "shutdown", "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.\n"),
			new ShellCommand(ShellCommand.shellCls, "cls", "- Clears the screen and resets the cursor position.\n", [], ["clear"]),
			new ShellCommand(ShellCommand.shellMan, "man", "<TOPIC> - Displays the MANual page for <TOPIC>.\n"),
			new ShellCommand(ShellCommand.shellTrace, "trace", "<on | off> - Turns the OS trace on or off.\n", [["on", "off"]]),
			new ShellCommand(ShellCommand.shellRot13, "rot13", "<TEXT>... - Does rot13 obfuscation on TEXT.\n"),
			new ShellCommand(ShellCommand.shellPrompt, "prompt", "<TEXT>... - Sets the prompt to TEXT.\n"),
			new ShellCommand(ShellCommand.shellDate, "date", "- Displays the current date and time.\n"),
			new ShellCommand(ShellCommand.shellWhereAmI, "whereami", "- Displays the user's current location.\n"),
			new ShellCommand(ShellCommand.shellEcho, "echo", "- Displays the given text to standard output.\n"),
			new ShellCommand(ShellCommand.shellStatus, "status", "- Displays a message to the task bar.\n"),
			new ShellCommand(ShellCommand.shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message.\n"),
			new ShellCommand(ShellCommand.shellLoad, "load", "- Loads the binary program from the HTML input field to the disk.\n"),
			new ShellCommand(ShellCommand.shellRun, "run", "<PROCESS_ID> [&] - Run the program in memory with the PROCESS_ID. Use ampersand to run in background asynchronously.\n"),
			new ShellCommand(ShellCommand.shellClh, "clh", "- Clears the host log.\n"),
			new ShellCommand(ShellCommand.shellClearMem, "clearmem", "- Clears memory of all resident/terminated processes.\n"),
			new ShellCommand(ShellCommand.shellRunAll, "runall", "- Runs all programs in memory concurrently.\n"),
			new ShellCommand(ShellCommand.shellPs, "ps", "- Displays the PID and status of all processes.\n"),
			new ShellCommand(ShellCommand.shellKill, "kill", "<PROCESS_ID> - Terminates the process with the given PROCESS_ID.\n"),
			new ShellCommand(ShellCommand.shellKillAll, "killall", "- Terminates all processes.\n"),
			new ShellCommand(
				ShellCommand.shellQuantum,
				"quantum",
				"<QUANTUM> - Set the quantum (measured in CPU cycles) for Round-Robin scheduling. Must be non-zero. Negative quantum will reverse the order of execution\n"
			),
			new ShellCommand(
				ShellCommand.shellChAlloc,
				"challoc",
				"<FirstFit | BestFit | WorstFit> - Set the mode for allocating new processes.\n",
				[["FirstFit", "BestFit", "WorstFit"]]
			),
			new ShellCommand(
				ShellCommand.shellChSegment,
				"chsegment",
				"<fixed | variable> [SIZE] - Change segment allocation to fixed or variable size. If fixed, pass the SIZE as a positive integer.\n",
				[["fixed", "variable"]]
			),
			new ShellCommand(
				ShellCommand.shellChSched,
				"chsched",
				"<RR | FCFS | P_SJF | NP_P> - Change the CPU scheduling mode.\n",
				[["RR", "FCFS", "P_SJF", "NP_P"]],
				["setschedule"]
			),
			new ShellCommand(ShellCommand.shellFormat, "format", "- Formats the disk. This is done automatically during bootstrap.\n"),
			new ShellCommand(ShellCommand.shellCreate, "create", "<FILE> - Creates FILE if it does not exist.\n", [["FILE"]], ["touch"]),
			new ShellCommand(ShellCommand.shellRead, "read", "<FILE> - Output the contents of FILE if it exists.\n", [["FILE"]], ["cat"]),
			new ShellCommand(ShellCommand.shellWrite, "write", "<FILE> <TEXT>... - Write TEXT to FILE if it exists.\n", [["FILE"], []]),
			new ShellCommand(ShellCommand.shellDelete, "delete", "<FILE>... - Delete FILEs if they exists.\n", [["FILE"], ["REPEAT"]], ["rm"]),
			new ShellCommand(
				ShellCommand.shellCopy,
				"copy", "<FILE> <COPY_FILE> - Creates a file with the copy name and copies the contents of the file to it if it exists.\n",
				[["FILE"], ["FILE"]],
				["cp"]
			),
			new ShellCommand(
				ShellCommand.shellRename,
				"rename",
				"<FILE> <NEW_FILE> - Renames the file, if it exists, to the new name, if it does not exist.\n",
				[["FILE"], ["FILE"]],
				["mv"]
			),
			new ShellCommand(
				ShellCommand.shellLs,
				"ls",
				"[-la] - Outputs a list of open_files in the directory.\n   -a Show hidden open_files.\n   -l Separate files with a new line.\n",
				[["-a", "-l", "-la", "-al"]]
			),
			new ShellCommand(ShellCommand.shellClearDisk, "cleardisk", "- Erases the entire disk and un-formats it.\n"),
			new ShellCommand(ShellCommand.shellShell, "shell", "<FILE.sh> - Executes the shell file.\n", [["FILE"]]),
			new ShellCommand(ShellCommand.shellGrep, "grep", "<PATTERN> <FILE>... - Search for PATTERN in each FILE or standard input.\n", [[], ["FILE"], ["REPEAT"]]),
			new ShellCommand(ShellCommand.shellGetSchedule, "getschedule", "- Print the current CPU scheduling mode.\n"),
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: man <TOPIC>  Please supply a topic.\n"]);
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: rot13 <TEXT>...  Please supply a string.\n"]);
				return ExitCode.SHELL_MISUSE;
			}
		}

		static shellPrompt(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length > 0) {
				_OsShell.promptStr = args[0];
				return ExitCode.SUCCESS;
			} else {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: prompt <TEXT>...  Please supply a string.\n"]);
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: echo <TEXT>...\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			stdout.output([args.join(" ") + "\n"]);
			return ExitCode.SUCCESS;
		}

		static shellStatus(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length === 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: status <TEXT>...\n"]);
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

			const bin: Uint8Array = Uint8Array.from(hexArray.map(hex => {
				const cleanedHex: string = hex.startsWith('0x') ? hex.slice(2) : hex;
				let num: number = parseInt(cleanedHex, 16);
				if (num < 0 || num > 0xff) {
					num = NaN;
				}
				return num;
			}));
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <PROCESS_ID> [&]\n"]);
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
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <PROCESS_ID> [&]\n"]);
					return ExitCode.SHELL_MISUSE;
				}
			}
			const pid: number = Number.parseInt(args[0]);
			if (Number.isNaN(pid)) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - pid must be an integer. Usage: run <PROCESS_ID> [&]\n"]);
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: kill <PROCESS_ID>\n"]);
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-negative integer). Usage: kill <PROCESS_ID>\n"]);
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: quantum <QUANTUM>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			let pid: number = Number.parseInt(args[0]);
			if (Number.isNaN(pid) || pid === 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-zero integer). Usage: quantum <QUANTUM>\n"]);
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [SIZE]\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			switch (args[0].toLowerCase()) {
				case "fixed":
					if (args.length !== 2) {
						stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [SIZE]\n"]);
						return ExitCode.SHELL_MISUSE;
					}
					_MMU.fixedSegments = true;
					const size: number = Number.parseInt(args[1]);
					if (Number.isNaN(size) || size <= 0) {
						stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Size must be a positive integer. Usage: chsegment <fixed | variable> [SIZE]\n"]);
						return ExitCode.SHELL_MISUSE;
					}
					_MMU.segmentSize = size;
					break;
				case "variable":
					if (args.length !== 1) {
						stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Cannot use a specific size for variable-sized segments. Usage: chsegment <fixed | variable> [SIZE]\n"]);
						return ExitCode.SHELL_MISUSE;
					}
					_MMU.fixedSegments = false;
					break;
				default:
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [QUANTUM]\n"]);
					return ExitCode.SHELL_MISUSE;
			}
			return ExitCode.SUCCESS;
		}

		static shellChSched(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | FCFS | P_SJF | NP_P>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			switch (args[0].toUpperCase()) {
				case "RR":
					_Scheduler.scheduleMode = ScheduleMode.RR;
					break;
				case "FCFS":
					_Scheduler.scheduleMode = ScheduleMode.FCFS;
					break;
				case "P_SJF":
					_Scheduler.scheduleMode = ScheduleMode.P_SJF;
					break;
				case "NP_P":
					_Scheduler.scheduleMode = ScheduleMode.NP_P;
					break;
				default:
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | FCFS | P_SJF | NP_P>\n"]);
					return ExitCode.SHELL_MISUSE;
			}
			Control.updatePcbMeta()
			return ExitCode.SUCCESS;
		}

		static shellFormat(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {//TODO allow -quick and -full arguments
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: format\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.Format, stderr]));
			return ExitCode.SUCCESS;
		}

		static shellCreate(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: create <FILE>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.Create, stderr, args[0]]));
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.Close, null, args[0]]));
			return ExitCode.SUCCESS;
		}

		static shellRead(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: read <FILE.sh>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.OpenReadClose, stderr, (content: string): void => {stdout.output([content]);}, args[0]]));
			return ExitCode.SUCCESS;
		}

		static shellWrite(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 2) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: write <FILE> <TEXT>...\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.OpenWriteClose, stderr, args[0], args[1]]));
			return ExitCode.SUCCESS;
		}

		static shellDelete(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length === 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: delete <FILE>...\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			for (const arg of args) {
				_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.Delete, stderr, arg]));
			}
			return ExitCode.SUCCESS;
		}

		static shellCopy(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 2) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: copy <FILE> <COPY_FILE>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.Copy, stderr, args[0], args[1]]));
			return ExitCode.SUCCESS;
		}

		static shellRename(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 2) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: rename <FILE> <NEW_FILE>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.Rename, stderr, args[0], args[1]]));
			return ExitCode.SUCCESS;
		}

		static shellLs(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			let sh_hidden: boolean = false;
			let list: boolean = false;
			if (args.length == 1) {
				if (args[0] === "-a") {
					sh_hidden = true;
				} else if (args[0] === "-l") {
					list = true;
				} else if (args[0] === "-la") {
					sh_hidden = true;
					list = true;
				} else if (args[0] === "-al") {
					sh_hidden = true;
					list = true;
				} else {
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: ls [-la]\n"]);
					return ExitCode.SHELL_MISUSE;
				}
			} else if (args.length == 2) {
				if ((args[0] === "-a" && args[1] === "-l") || (args[0] === "-l" && args[1] === "-a")) {
					sh_hidden = true;
					list = true;
				} else {
					stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: ls [-la]\n"]);
					return ExitCode.SHELL_MISUSE;
				}
			} else if (args.length > 2) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: ls [-la]\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.Ls, stderr, stdout, sh_hidden, list]));
			return ExitCode.SUCCESS;
		}

		static shellClearDisk(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: cleardisk\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [DiskAction.ClearDisk, stderr]));
			return ExitCode.SUCCESS;
		}

		static shellShell(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 1) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: shell <FILE.sh>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			if (!args[0].match(/^.+\.sh$/)) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - The provided file is not a .sh (shell) file.\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [
				DiskAction.OpenReadClose,
				stderr,
				(content: string): void => {
					_OsShell.handleInput(content)
					_Console.redrawCanvas();
				},
				args[0]
			]));
			return ExitCode.SUCCESS;
		}

		static shellGrep(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length < 2) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: grep <PATTERN> <FILE>...\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			for (let i: number = 1; i < args.length; i++) {
				_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [
					DiskAction.OpenReadClose,
					stderr,
					(content: string): void => {
						const lines: string[] = content.split(/(\r?\n)+/);
						let matches: string[] = [];
						for (const line of lines) {
							if (line.match(args[0])) {
								matches.push(line);
							}
						}
						if (matches.length > 0) {
							stdout.output([matches.join("\n") + (i === args.length - 1 ? "" : "\n")]);
						}
					},
					args[i]
				]));
			}
			return ExitCode.SUCCESS;
		}

		static shellGetSchedule(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: getschedule\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			let mode: string = "";
			switch (_Scheduler.scheduleMode) {
				case ScheduleMode.RR:
					mode = "Round Robin";
					break;
				case TSOS.ScheduleMode.FCFS:
					mode = "First Come First Served";
					break;
				case TSOS.ScheduleMode.P_SJF:
					mode = "Preemptive Shortest Job First";
					break;
				case TSOS.ScheduleMode.NP_P:
					mode = "Non-Preemptive Priority";
					break;
			}
			stdout.output([mode + "\n"]);
			return ExitCode.SUCCESS;
		}
	}
}