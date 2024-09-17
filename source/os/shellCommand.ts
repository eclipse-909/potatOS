module TSOS {
	export class ShellCommand {
		public func: (stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>) => ExitCode;
		public command: string = "";
		public description: string = "";

		constructor(
			func: (stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>) => ExitCode,
			command: string = "",
			description: string = "",
		) {
			this.func = func;
			this.command = command;
			this.description = description;
		}

		public static COMMAND_LIST: ShellCommand[] = [
			new ShellCommand(ShellCommand.shellVer, "ver", "- Displays the current version data.\n"),
			new ShellCommand(ShellCommand.shellHelp, "help", "- This is the help command. Seek help."),
			new ShellCommand(ShellCommand.shellShutdown, "shutdown", "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.\n"),
			new ShellCommand(ShellCommand.shellCls, "cls", "- Clears the screen and resets the cursor position.\n"),
			new ShellCommand(ShellCommand.shellMan, "man", "<topic> - Displays the MANual page for <topic>.\n"),
			new ShellCommand(ShellCommand.shellTrace, "trace", "<on | off> - Turns the OS trace on or off.\n"),
			new ShellCommand(ShellCommand.shellRot13, "rot13", "<string...> - Does rot13 obfuscation on <string>.\n"),
			new ShellCommand(ShellCommand.shellPrompt, "prompt", "<string...> - Sets the prompt.\n"),
			new ShellCommand(ShellCommand.shellDate, "date", "- Displays the current date and time.\n"),
			new ShellCommand(ShellCommand.shellWhereAmI, "whereami", "- Displays the user's current location.\n"),
			new ShellCommand(ShellCommand.shellEcho, "echo", "- Displays the given text to standard output.\n"),
			new ShellCommand(ShellCommand.shellStatus, "status", "- Displays a message to the task bar.\n"),
			new ShellCommand(ShellCommand.shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message.\n"),
			new ShellCommand(ShellCommand.shellLoad, "load", "- Loads the binary program from the HTML input field to the disk.\n"),
			new ShellCommand(ShellCommand.shellRun, "run", "<process ID> [&] - Run the program in memory with the process ID. Use ampersand to run in background asynchronously.\n")

			// ps  - list the running processes and their IDs
			// kill <id> - kills the specified process id.
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
			let text: string = "Key:\n  <> = required parameter\n  ... = repeatable parameter\n  [] = optional parameter\n  / = either parameter is acceptable\nCommands:\n";
			for (const i in ShellCommand.COMMAND_LIST) {
				text += "  " + ShellCommand.COMMAND_LIST[i].command + " " + ShellCommand.COMMAND_LIST[i].description;
			}
			stdout.output([text + "\n"]);
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
			_StdOut.resetXY();
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
			stdout.output(["You're at your desk trying to steal my source code... STOP IT!!!\n"]);
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
			document.getElementById("footerStatus").innerHTML = args.join(" ");
			return ExitCode.SUCCESS;
		}

		static shellBSOD(stdin: InStream<string[]>, _stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: bsod\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			_Kernel.krnTrapError("Self-induced error via shell command.")
			return ExitCode.SUCCESS;
		}

		static shellLoad(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode {
			const args: string[] = stdin.input();
			if (args.length !== 0) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: load\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			const textArea: HTMLTextAreaElement = document.getElementById("programInput") as HTMLTextAreaElement;
			let input: string = textArea.value;
			input = input.replace(/\s+/g, ' ').trim();
			const hexArray: string[] = input.split(/[\s,]+/);

			// If you're curious why I'm also allowing hex numbers and separators to be formatted as '0xAD, 0x04, 0x00',
			// it's because I made an assembler for this instruction set that outputs the binary this way.

			const numberArray: number[] = hexArray.map(hex => {
				const cleanedHex = hex.startsWith('0x') ? hex.slice(2) : hex;
				let num = parseInt(cleanedHex, 16);
				if (num < 0 || num > 0xff) {
					num = NaN;
				}
				return num;
			});
			//textArea.value = "";//don't clear input area on load
			if (numberArray.some(Number.isNaN)) {
				stderr.error([
					ExitCode.SHELL_MISUSE.shellDesc()
					+ " - Invalid binary syntax. Hex values must range from 0x00-0xFF, have the format of '0xFF' or 'FF', and be separated either by ' ' or ', '\"\n"
				]);
				return ExitCode.GENERIC_ERROR;
			}
			const pcb: ProcessControlBlock = ProcessControlBlock.new(numberArray);
			_Scheduler.idlePcbs.set(pcb.pid, pcb);
			stdout.output([`Program loaded into memory with process ID ${pcb.pid}.\n`]);
			return ExitCode.SUCCESS;
		}

		//@Returns
		// - an exit code if an error occurred before running the process.
		// - undefined if running synchronously
		// - null if running asynchronously
		static shellRun(stdin: InStream<string[]>, stdout: OutStream<string[]>, stderr: ErrStream<string[]>): ExitCode | undefined | null {
			const args: string[] = stdin.input();
			if (!(args.length === 1 || args.length === 2)) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <pid> [&]\n"]);
				return ExitCode.SHELL_MISUSE;
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
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + " - pid must be an integer. Usage: run <pid>\n"]);
				return ExitCode.SHELL_MISUSE;
			}
			const pcb: ProcessControlBlock | undefined = _Scheduler.idlePcbs.get(pid);
			if (!pcb) {
				stderr.error([ExitCode.SHELL_MISUSE.shellDesc() + ` - Could not locate process ${pid}.\n`]);
				return ExitCode.GENERIC_ERROR;
			}
			if (!async) {//console by default if it is async
				pcb.stdOut = stdout;
				pcb.stdErr = stderr;
			}
			_Scheduler.pcbQueue.enqueue(pcb);
			pcb.status = Status.ready;
			//I assume that I unload the program from memory once it finishes running.
			//The program should be loaded from the disk every time you want to run it.
			_Scheduler.idlePcbs.delete(pid);
			return async? null : undefined;
		}
	}
}