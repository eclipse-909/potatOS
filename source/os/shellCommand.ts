module TSOS {
	export class ShellCommand {
		constructor(public func: (args: string[]) => {exitCode: ExitCode, retValue: any},
		            public command: string = "",
		            public description: string = "") {
		}
	}

	export const COMMAND_LIST: ShellCommand[] = [
		new ShellCommand(shellVer, "ver", "- Displays the current version data."),
		new ShellCommand(shellHelp, "help", "- This is the help command. Seek help."),
		new ShellCommand(shellShutdown, "shutdown", "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running."),
		new ShellCommand(shellCls, "cls", "- Clears the screen and resets the cursor position."),
		new ShellCommand(shellMan, "man", "<topic> - Displays the MANual page for <topic>."),
		new ShellCommand(shellTrace, "trace", "<on | off> - Turns the OS trace on or off."),
		new ShellCommand(shellRot13, "rot13", "<string> - Does rot13 obfuscation on <string>."),
		new ShellCommand(shellPrompt, "prompt", "<string> - Sets the prompt."),
		new ShellCommand(shellDate, "date", "- Displays the current date and time."),
		new ShellCommand(shellWhereAmI, "whereami", "- Displays the user's current location."),
		new ShellCommand(shellEcho, "echo", "- Displays the given text to standard output."),
		new ShellCommand(shellStatus, "status", "- Displays a message to the task bar."),
		new ShellCommand(shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message."),
		new ShellCommand(shellLoad, "load", "- Loads the binary program from the HTML input field to the disk."),

		// ps  - list the running processes and their IDs
		// kill <id> - kills the specified process id.
	];

	function shellVer(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 0) {
			return {exitCode: SHELL_MISUSE, retValue: undefined};
		}
		return {exitCode: SUCCESS, retValue: APP_NAME + " version " + APP_VERSION};
	}

	function shellHelp(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 0) {
			return {exitCode: SHELL_MISUSE, retValue: undefined};
		}
		let text: string = "Commands:";
		for (const i in COMMAND_LIST) {
			text += "\n  " + COMMAND_LIST[i].command + " " + COMMAND_LIST[i].description;
		}
		return {exitCode: SUCCESS, retValue: text};
	}

	export function shellShutdown(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 0) {
			return {exitCode: SHELL_MISUSE, retValue: undefined};
		}
		// Call Kernel shutdown routine.
		_Kernel.krnShutdown();
		return {exitCode: SUCCESS, retValue: "Shutting down..."};
	}

	function shellCls(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 0) {
			return {exitCode: SHELL_MISUSE, retValue: undefined};
		}
		_StdOut.clearScreen();
		_StdOut.resetXY();
		return {exitCode: SUCCESS, retValue: undefined};
	}

	function shellMan(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 1) {
			return {exitCode: SHELL_MISUSE, retValue: "Usage: man <topic>  Please supply a topic."};
		}
		const topic = args[0];
		const cmd: ShellCommand | undefined = COMMAND_LIST.find((item: ShellCommand) => {return item.command === topic;});
		if (cmd) {
			return {exitCode: SUCCESS, retValue: cmd.description};
		}
		switch (topic) {
			// TODO: Make descriptive MANual page entries for topics other than shell commands.
			default:
				return {exitCode: GENERIC_ERROR, retValue: "No manual entry for " + args[0] + "."};
		}
	}

	function shellTrace(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 1) {
			return {exitCode: SHELL_MISUSE, retValue: "Usage: trace <on | off>"};
		}
		const setting = args[0];
		switch (setting) {
			case "on":
				if (_Trace && _SarcasticMode) {
					return {exitCode: SUCCESS, retValue: "Trace is already on, doofus."};
				} else {
					_Trace = true;
					return {exitCode: SUCCESS, retValue: "Trace ON"};
				}
			case "off":
				_Trace = false;
				return {exitCode: SUCCESS, retValue: "Trace OFF"};
			default:
				return {exitCode: SHELL_MISUSE, retValue: "Invalid argument.  Usage: trace <on | off>."};
		}
	}

	function shellRot13(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length > 0) {
			return {exitCode: SUCCESS, retValue: args.join(' ') + " = '" + Utils.rot13(args.join(' ')) +"'"};
		} else {
			return {exitCode: SHELL_MISUSE, retValue: "Usage: rot13 <string>  Please supply a string."};
		}
	}

	function shellPrompt(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length > 0) {
			_OsShell.promptStr = args[0];
			return {exitCode: SUCCESS, retValue: undefined};
		} else {
			return {exitCode: SHELL_MISUSE, retValue: "Usage: prompt <string>  Please supply a string."};
		}
	}

	function shellDate(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 0) {
			return {exitCode: SHELL_MISUSE, retValue: "No argument required. Usage: date"};
		}
		return {exitCode: SUCCESS, retValue: new Date().toString()};
	}

	function shellWhereAmI(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length !== 0) {
			return {exitCode: SHELL_MISUSE, retValue: "No argument required. Usage: whereami"};
		}
		return {exitCode: SUCCESS, retValue: "You're at your desk trying to steal my source code... STOP IT!!!"};
	}

	function shellEcho(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length === 0) {
			return {exitCode: SHELL_MISUSE, retValue: "Usage: echo <string>"};
		}
		_StdOut.putText(args.join(" "));//echo directly prints to the console and cannot be piped into another command
		return {exitCode: SUCCESS, retValue: undefined};
	}

	function shellStatus(args: string[]): {exitCode: ExitCode, retValue: any} {
		if (args.length === 0) {
			return {exitCode: SHELL_MISUSE, retValue: "Invalid argument. Usage: status <string>"};
		}
		document.getElementById("footerStatus").innerHTML = args.join(" ");
		return {exitCode: SUCCESS, retValue: undefined};
	}

	function shellBSOD(_args: string[]): {exitCode: ExitCode, retValue: any} {
		_Kernel.krnTrapError("Self-induced error via shell command.")
		return {exitCode: SUCCESS, retValue: undefined};
	}

	//UNFINISHED
	//TODO when the disk is set up, this function will load it into storage
	function shellLoad(_args: string[]): {exitCode: ExitCode, retValue: any} {
		const textArea: HTMLTextAreaElement = document.getElementById("taProgramInput") as HTMLTextAreaElement;
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
		textArea.value = "";
		if (numberArray.some(Number.isNaN)) {
			return {exitCode: GENERIC_ERROR, retValue: "Invalid binary syntax. Hex values must range from 0x00-0xFF, have the format of '0xFF' or 'FF', and be separated either by ' ' or ', '"};
		}

		// TODO load numberArray into memory

		return {exitCode: SUCCESS, retValue: undefined};
	}
}