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
		connector?: string; // Symbol like || or &&
		redirector?: string;
	}

	export class Shell implements OutStream<string[]>, InStream<string[]>, ErrStream<string[]> {
		// Properties
		public promptStr = "$ ";
		public curses = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
		public apologies = "[sorry]";
		cmdQueue: Queue<Command> = new Queue<Command>();
		ioQueue: Queue<string[]> = new Queue<string[]>();
		processExitQueue: Queue<{exitCode: ExitCode, pid: number}> = new Queue<{exitCode: ExitCode, pid: number}>();
		pidsWaitingOn: {pid: number, connector: string | null}[] = [];

		//The shell is used as I/O when piping the output of one command to the input of another command.
		output(buffer: string[]): void {
			this.ioQueue.enqueue(buffer);
		}
		input(): string[] {
			return this.ioQueue.dequeue();
		}
		error(buffer: string[]) {
			this.ioQueue.enqueue(buffer);
		}

		//Must be used in between two commands.
		connectors: string[] = [
			"||",   //execute second command if and only if the first command fails.
			"&&",   //execute second command if and only if the first command succeeds.
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
		}

		public handleInput(input: string): void {
			_StdOut.advanceLine();
			if (!this.processExitQueue.isEmpty()) {
				while (!this.processExitQueue.isEmpty()) {
					const exit: {exitCode: ExitCode, pid: number} = this.processExitQueue.dequeue();
					_StdOut.output([exit.exitCode.processDesc(exit.pid) + "\n"]);
					const i: number = this.pidsWaitingOn.findIndex((item: {pid: number, connector: string | null}): boolean => {
						return item.pid === exit.pid;
					});
					if (i !== -1) {
						this.pidsWaitingOn.splice(i, 1);
					}
					if (this.pidsWaitingOn.length === 0) {
						_StdIn.inputEnabled = true;
					}
				}
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
		}

		public executeCmdQueue(prevCmd: Command | null = null): void {
			_StdIn.inputEnabled = false;
			if (this.cmdQueue.isEmpty()) {return;}
			let currCmd: Command | null = this.cmdQueue.dequeue();
			let nextCmd: Command | null = this.cmdQueue.peek();
			while (currCmd) {
				const command: ShellCommand | undefined = ShellCommand.COMMAND_LIST.find((item: ShellCommand): boolean => {return item.command === currCmd.name;});
				let stdin: InStream<string[]> = this;
				let stdout: OutStream<string[]> = _StdOut;
				let stderr: ErrStream<string[]> = _StdErr;

				//if the previous command is being piped into this one
				//add the arguments of this command before the output of the previous command
				if (this.ioQueue.isEmpty()) {
					this.ioQueue.enqueue(currCmd.args);
				} else {
					for (let i: number = currCmd.args.length - 1; i >= 0; i--) {
						this.ioQueue.peek().unshift(currCmd.args[i]);
					}
				}
				// if (prevCmd) {
				// 	if (prevCmd.redirector === "|") {
				// 		stdin = this;
				// 		for (let i: number = currCmd.args.length - 1; i >= 0; i--) {
				// 			this.ioQueue.peek().unshift(currCmd.args[i]);
				// 		}
				// 	}
				// } else {
				// 	stdin.input = (): string[] => {return [];};//the first argument shouldn't have any
				// }

				//redirect io
				switch (currCmd.redirector) {
					case ">>":
						//TODO file system not supported yet
						break;
					case ">":
						//TODO file system not supported yet
						break;
					case "2>&1":
						stderr.error = stdout.output;
						break;
					case "2>":
						//TODO file system not supported yet
						break;
					case "<":
						//TODO file system not supported yet
						break;
					case "|":
						if (!nextCmd) {
							//TODO syntax error: expected command after '|'
							return;
						}
						stdout = this;
						break;
				}

				//execute command
				let exitCode: ExitCode | undefined | null;
				if (!command) {
					if (this.curses.indexOf("[" + Utils.rot13(currCmd.name) + "]") >= 0) {// Check for curses.
						exitCode = this.shellCurse(stdin, stdout, stderr);
					} else if (this.apologies.indexOf("[" + currCmd.name + "]") >= 0) {// Check for apologies.
						exitCode = this.shellApology(stdin, stdout, stderr);
					}
					exitCode = ExitCode.COMMAND_NOT_FOUND;
					stderr.error([
						_SarcasticMode
							? "Unbelievable. You, [subject name here],\nmust be the pride of [subject hometown here]."
							: "Type 'help' for, well... help."
					]);
				} else {
					exitCode = command.func(stdin, stdout, stderr);
				}

				//if we are executing a process,
				//add the pid and connector to the queue so we can wait for it to finish.
				//then keep executing remaining chained commands.
				if (command.command === "run") {
					const pid: number = Number.parseInt(currCmd.args[0]);
					if (!Number.isNaN(pid)) {
						if (exitCode === undefined) {//synchronous
							this.pidsWaitingOn.push({pid: pid, connector: currCmd.connector});
						} else if (exitCode === null) {//asynchronous
							this.pidsWaitingOn.push({pid: pid, connector: null});
							_StdIn.inputEnabled = true;
							this.continueExecution();//make a semi-recursive call because the pipeline is broken, even in async processes
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

				prevCmd = currCmd;
				currCmd = nextCmd;
				nextCmd = this.cmdQueue.dequeue();
			}

			//debug:
			if (!this.ioQueue.isEmpty()) {
				console.error("IO queue wasn't cleared and commands are done executing");
			}

			//if everything finished executing, and we aren't waiting on any processes, allow input
			_StdIn.inputEnabled = this.cmdQueue.isEmpty() && this.ioQueue.isEmpty() && this.processExitQueue.isEmpty() && this.pidsWaitingOn.length === 0;
			_StdOut.advanceLine();
			this.putPrompt();
		}

		//Continues shell execution, if need be, after a process finishes
		public continueExecution(): void {
			const process: {exitCode: ExitCode, pid: number} | null = this.processExitQueue.dequeue();
			if (!process) {return;}
			let cmdData: {pid: number, connector: string | null} | undefined = this.pidsWaitingOn.find((item: {pid: number, connector: string | null}): boolean => {
				return item.pid === process.pid;
			});
			if (!cmdData) {return;}
			const prevCmd: Command = {
				name: "",
				args: [],
				connector: cmdData.connector
			};
			this.executeCmdQueue(prevCmd);
		}

		public shellCurse(_stdin: InStream<string[]>, stdout: OutStream<string[]>, _stderr: ErrStream<string[]>): ExitCode {
			stdout.output(["Oh, so that's how it's going to be, eh? Fine.\nBitch."]);
			_SarcasticMode = true;
			return ExitCode.SUCCESS;
		}

		public shellApology(_stdin: InStream<string[]>, stdout: OutStream<string[]>, _stderr: ErrStream<string[]>): ExitCode {
			if (_SarcasticMode) {
				stdout.output(["I think we can put our differences behind us.\nFor science . . . You monster."]);
				_SarcasticMode = false;
			} else {
				stdout.output(["For what?"]);
			}
			return ExitCode.SUCCESS;
		}
	}
}