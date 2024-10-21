/* ------------
   Shell.ts

   The OS Shell - The "command line interface" (CLI) for the console.

    Note: While fun and learning are the primary goals of all enrichment center activities,
          serious injuries may occur when trying to write your own Operating System.
   ------------ */

// TODO: Write a base class / prototype for system services and let Shell inherit from it.

module TSOS {
	type TokenType = 'WORD' | 'CONNECTOR' | 'REDIRECTOR';
	interface Token {
		type: TokenType;
		value: string;
	}
	interface Command {
		name: string;
		args: string[];
		connector?: string; // Symbol like ||, &&, or ;
		redirector?: string;
	}

	export class Shell implements OutStream<string[]>, InStream<string[]>, ErrStream<string[]> {
		// Properties
		public promptStr = "$ ";
		public curses = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
		public apologies = "[sorry]";
		//command execution queue
		cmdQueue: Queue<Command> = new Queue<Command>();
		//command IO pipeline
		ioBuffer: string[] | null = null;
		//queue of processes that have finished
		processExitQueue: Queue<{exitCode: ExitCode, pid: number}> = new Queue<{exitCode: ExitCode, pid: number}>();
		//PID of synchronous processes
		pidsWaitingOn: {pid: number, connector: string | null}[] = [];

		//The shell is used as I/O when piping the output of one command to the input of another command.
		output(buffer: string[]): void {
			this.ioBuffer = this.ioBuffer === null? buffer : this.ioBuffer.concat(buffer);
		}
		input(): string[] {
			let buffer: string[] = this.ioBuffer ?? [];
			this.ioBuffer = null;
			return buffer;
		}
		error(buffer: string[]) {
			this.ioBuffer = this.ioBuffer === null? buffer : this.ioBuffer.concat(buffer);
		}

		//Must be used in between two commands.
		connectors: string[] = [
			"||",   //execute second command if and only if the first command fails.
			"&&",   //execute second command if and only if the first command succeeds.
			";",    //always executes the next command.
		];
		//Must be used in between a command and an argument that specifies input or output.
		redirectors: string[] = [
			">>",   //stdout to file (append contents).
			">",    //stdout to file (overwrite contents).
			"2>&1", //stderr to stdout.
			"2>",   //stderr to file.
			"<",    //file to stdin.
			"|",    //pipe stdout of first command to stdin of second command.
		];

		constructor() {}

		public init() {
			// Display the initial prompt.
			this.putPrompt();
		}

		public putPrompt() {
			_StdOut.putText(this.promptStr);
			_StdIn.inputEnabled = true;
		}

		public handleInput(input: string): void {
			_StdOut.advanceLine();
			//check if an async process has finished before starting a new command
			let process: {exitCode: ExitCode, pid: number} | null = this.processExitQueue.dequeue();
			while (process) {
				if (process) {
					_StdOut.output([process.exitCode.processDesc(process.pid) + "\n"]);
				}
				process = this.processExitQueue.dequeue();
			}
			if (input === "") {
				return this.putPrompt();
			}
			const tokens: Token[] = this.tokenize(input);
			const commands: Command[] | undefined = this.parseTokens(tokens);
			if (!commands) {return;}
			this.executeCommands(commands);
		}

		tokenize(input: string): Token[] {
			const tokens: Token[] = [];
			let buffer = '';
			for (let i = 0; i < input.length; i++) {
				const char = input[i];
				// Skip spaces
				if (char === ' ') {
					if (buffer) {
						tokens.push({type: 'WORD', value: buffer});
						buffer = '';
					}
					continue;
				}
				// Check if the current and next character form a connector
				let pushed: boolean = false;
				for (const connector of this.connectors) {
					if (input.slice(i, i + connector.length) === connector) {
						if (buffer) {
							tokens.push({type: 'WORD', value: buffer});
							buffer = '';
						}
						tokens.push({type: 'CONNECTOR', value: connector});
						i += connector.length - 1; // Move index to the end of connector
						pushed = true;
						break;
					}
				}
				if (pushed) {continue;}
				// Check if the current and next character form a redirector
				for (const redirector of this.redirectors) {
					if (input.slice(i, i + redirector.length) === redirector) {
						if (buffer) {
							tokens.push({type: 'WORD', value: buffer});
							buffer = '';
						}
						tokens.push({type: 'REDIRECTOR', value: redirector});
						i += redirector.length - 1; // Move index to the end of symbol
						pushed = true;
						break;
					}
				}
				if (pushed) {continue;}
				// Otherwise, add to buffer
				buffer += char;
			}
			// Add remaining buffer as a word
			if (buffer) {
				tokens.push({type: 'WORD', value: buffer});
			}
			return tokens;
		}

		parseTokens(tokens: Token[]): Command[] | undefined {
			const commands: Command[] = [];
			let currentCommand: Command | null = null;
			let unexpectedToken: Token = null;
			if (tokens[0].type !== 'WORD') {
				unexpectedToken = tokens[0];
			} else if (tokens[tokens.length - 1].type !== 'WORD') {
				unexpectedToken = tokens[tokens.length - 1];
			}
			if (unexpectedToken) {
				_StdOut.putText(`Invalid token: '${unexpectedToken.value}', expected command or argument.`);
				_StdOut.advanceLine();
				this.putPrompt();
				return undefined;
			}
			for (const token of tokens) {
				if (token.type === 'WORD') {
					if (!currentCommand) {
						currentCommand = {name: token.value, args: []};//set current command
					} else {
						currentCommand.args.push(token.value);//add argument to current command
					}
				} else if (token.type === 'CONNECTOR') {
					if (currentCommand) {
						currentCommand.connector = token.value;//add connector to current command
						commands.push(currentCommand);
						currentCommand = null;
					} else {
						_StdOut.putText(`Invalid token: '${token.value}', expected command or argument.`);
						_StdOut.advanceLine();
						this.putPrompt();
						return undefined;
					}
				} else if (token.type === 'REDIRECTOR') {
					if (currentCommand) {
						currentCommand.redirector = token.value;//add connector to current command
						commands.push(currentCommand);
						currentCommand = null;
					} else {
						_StdOut.putText(`Invalid token: '${token.value}', expected command or argument.`);
						_StdOut.advanceLine();
						this.putPrompt();
						return undefined;
					}
				}
			}
			if (currentCommand) {
				commands.push(currentCommand);
			}
			return commands;
		}

		executeCommands(commands: Command[]): void {
			for (const cmd of commands) {
				this.cmdQueue.enqueue(cmd);
			}
			this.executeCmdQueue();
			this.tryEnableInput();
		}

		public executeCmdQueue(): void {
			if (this.cmdQueue.isEmpty()) {return;}
			_StdIn.inputEnabled = false;
			let currCmd: Command | null = this.cmdQueue.dequeue();
			let nextCmd: Command | null = this.cmdQueue.peek();
			while (currCmd) {
				const command: ShellCommand | undefined = ShellCommand.COMMAND_LIST.find((item: ShellCommand): boolean => {
					return item.command === currCmd.name;
				});
				let stdin: InStream<string[]> = this;
				let stdout: OutStream<string[]> = _StdOut;
				let stderr: ErrStream<string[]> = _StdErr;

				//if the previous command is being piped into this one
				//add the arguments of this command before the output of the previous command.
				//The output of the previous command should already be in the buffer
				if (this.ioBuffer === null) {
					this.ioBuffer = currCmd.args;
				} else {
					for (let i: number = currCmd.args.length - 1; i >= 0; i--) {
						this.ioBuffer.unshift(currCmd.args[i]);
					}
				}

				//verify command
				let exitCode: ExitCode | undefined | null;
				if (!command) {
					if (this.curses.indexOf("[" + Utils.rot13(currCmd.name) + "]") >= 0) {// Check for curses.
						exitCode = this.shellCurse(stdin, stdout, stderr);
					} else if (this.apologies.indexOf("[" + currCmd.name + "]") >= 0) {// Check for apologies.
						exitCode = this.shellApology(stdin, stdout, stderr);
					} else {
						exitCode = ExitCode.COMMAND_NOT_FOUND;
						stderr.error([
							_SarcasticMode
								? "Unbelievable. You, [subject name here],\nmust be the pride of [subject hometown here]."
								: "Type 'help' for, well... help.\n"
						]);
						return;
					}
				}

				if (currCmd.redirector && command.command === "run" && currCmd.args[1] === "&") {
					_StdErr.error([`Syntax error - asynchronous redirection: ${currCmd.redirector} with & - file redirection is not supported for asynchronous processes.\n`])
					return;
				}

				//redirect io
				switch (currCmd.redirector) {
					case ">>":
						_StdErr.error(["Syntax error - unimplemented operator: >> - file redirection is not supported yet.\n"]);
						return;
					case ">":
						_StdErr.error(["Syntax error - unimplemented operator: > - file redirection is not supported yet.\n"]);
						return;
					case "2>&1":
						stderr.error = stdout.output;
						break;
					case "2>":
						_StdErr.error(["Syntax error - unimplemented operator: 2> - file redirection is not supported yet.\n"]);
						return;
					case "<":
						_StdErr.error(["Syntax error - unimplemented operator: < - file redirection is not supported yet.\n"]);
						return;
					case "|":
						if (!nextCmd) {
							_StdErr.error(["Syntax error - token expected: | <command> - expected command.\n"]);
							return;
						}
						stdout = this;
						break;
				}

				//execute command
				exitCode = command.func(stdin, stdout, stderr);

				//if we are executing a process,
				//add the pid and connector to the queue so we can wait for it to finish.
				//then keep executing remaining chained commands.
				if (command.command === "runall") {
					this.putPrompt();
					this.executeCmdQueue();
					this.tryEnableInput();
					return;
				}
				if (command.command === "run" && !(exitCode instanceof ExitCode)) {
					const pid: number = Number.parseInt(currCmd.args[0]);
					if (!Number.isNaN(pid)) {
						if (exitCode === undefined) {//synchronous
							this.pidsWaitingOn.push({pid: pid, connector: currCmd.connector});
						} else if (exitCode === null) {//asynchronous
							this.putPrompt();
							this.executeCmdQueue();
							this.tryEnableInput();
						}
						return;
					}
				}

				//use || or && to determine if we should keep going
				switch (currCmd.connector) {
					case "||":
						if (exitCode.isSuccess()) {
							this.cmdQueue.clear();
							return;
						}
						break;
					case "&&":
						if (!exitCode.isSuccess()) {
							this.cmdQueue.clear();
							return;
						}
						break;
				}

				currCmd = this.cmdQueue.dequeue();
				nextCmd = this.cmdQueue.peek();
			}

			//if everything finished executing, and we aren't waiting on any processes, allow input
			this.putPrompt();
		}

		//Called when a process is killed to determine how the shell should react
		onProcessFinished(): void {
			//see if a process has finished
			const process: {exitCode: ExitCode, pid: number} | null = this.processExitQueue.peek();
			if (!process) {return;}
			let pidIndex: number = this.pidsWaitingOn.findIndex((item: {pid: number, connector: string | null}): boolean => {
				return item.pid === process.pid;
			});
			//we don't care about async processes
			if (pidIndex === -1) {return;}
			this.processExitQueue.dequeue();
			this.pidsWaitingOn.splice(pidIndex, 1);
			_StdOut.output(["\n" + process.exitCode.processDesc(process.pid) + "\n"]);
			if (this.cmdQueue.isEmpty()) {
				this.putPrompt();
				return;
			}
			this.executeCmdQueue();
			this.tryEnableInput();
		}

		//enables input if and only if we are not waiting for commands or synchronous processes to finish
		tryEnableInput(): void {
			_StdIn.inputEnabled = this.cmdQueue.isEmpty() && this.pidsWaitingOn.length === 0;
		}

		public shellCurse(_stdin: InStream<string[]>, stdout: OutStream<string[]>, _stderr: ErrStream<string[]>): ExitCode {
			stdout.output(["Oh, so that's how it's going to be, eh? Fine.\nBitch.\n"]);
			_SarcasticMode = true;
			return ExitCode.SUCCESS;
		}

		public shellApology(_stdin: InStream<string[]>, stdout: OutStream<string[]>, _stderr: ErrStream<string[]>): ExitCode {
			if (_SarcasticMode) {
				stdout.output(["I think we can put our differences behind us.\nFor science . . . You monster.\n"]);
				_SarcasticMode = false;
			} else {
				stdout.output(["For what?\n"]);
			}
			return ExitCode.SUCCESS;
		}
	}
}