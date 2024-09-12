/* ------------
   Shell.ts

   The OS Shell - The "command line interface" (CLI) for the console.

    Note: While fun and learning are the primary goals of all enrichment center activities,
          serious injuries may occur when trying to write your own Operating System.
   ------------ */

// TODO: Write a base class / prototype for system services and let Shell inherit from it.

module TSOS {
	type TokenType = 'WORD' | 'CONNECTOR' | 'SYMBOL';
	interface Token {
		type: TokenType;
		value: string;
	}
	interface Command {
		name: string;
		args?: string[];
		next?: Command; // Reference to the next command (for chaining)
		connector?: string; // Symbol like |, &&, ||
	}

	export class Shell {
		// Properties
		public promptStr = "$ ";
		public curses = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
		public apologies = "[sorry]";

		//Must be used in between two commands
		connectors: string[] = [
			"||",   //execute second command if and only if the first command fails.
			"&&",   //execute second command if and only if the first command succeeds.
			"|",    //pipe output of first command into arguments of second.
		];
		//Must be used in between a command and an argument
		symbols: string[] = [
			">>",   //stdout to file (append contents)
			"<",     //file to stdin
			">",    //stdout to file (overwrite contents)
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
			if (input === "") {return this.putPrompt();}
			const tokens: Token[] = this.tokenize(input);
			const firstCommand: Command | undefined = this.parseTokens(tokens);
			if (!firstCommand) {return;}
			this.execute(firstCommand);
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
				/*TODO add this back in when I get the file system working
				// Check if the current and next character form a symbol
				for (const symbol of this.symbols) {
					if (input.slice(i, i + symbol.length) === symbol) {
						if (buffer) {
							tokens.push({type: 'WORD', value: buffer});
							buffer = '';
						}
						tokens.push({type: 'SYMBOL', value: symbol});
						i += symbol.length - 1; // Move index to the end of symbol
						pushed = true;
						break;
					}
				}
				if (pushed) {continue;}
				*/
				// Otherwise, add to buffer
				buffer += char;
			}
			// Add remaining buffer as a token
			if (buffer) {
				tokens.push({ type: 'WORD', value: buffer });
			}
			return tokens;
		}

		parseTokens(tokens: Token[]): Command | undefined {
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
				} else if (token.type === 'SYMBOL') {
					//TODO add this in when I get the file system working
				}
			}
			if (currentCommand) {
				commands.push(currentCommand);
			}
			// Link commands using the connector
			for (let i = 0; i < commands.length - 1; i++) {
				if (commands[i].connector) {
					commands[i].next = commands[i + 1];
				}
			}
			return commands[0];
		}

		executeCommand(command: Command, input: any = []): {exitCode: ExitCode, retValue: any} {
			let cmd: ShellCommand | undefined = undefined;
			for (const c of ShellCommand.COMMAND_LIST) {
				if (c.command === command.name) {
					cmd = c;
					break;
				}
			}
			if (!cmd) {
				// It's not found, so check for curses and apologies before declaring the command invalid.
				if (this.curses.indexOf("[" + Utils.rot13(command.name) + "]") >= 0) {     // Check for curses.
					this.exeFnAsCmd(this.shellCurse, []);
				} else if (this.apologies.indexOf("[" + command.name + "]") >= 0) {        // Check for apologies.
					this.exeFnAsCmd(this.shellApology, []);
				}
				return {
					exitCode: ExitCode.COMMAND_NOT_FOUND,
					retValue: _SarcasticMode
						? "Unbelievable. You, [subject name here],\nmust be the pride of [subject hometown here]."
						: "Type 'help' for, well... help."
				};
			}
			if (Array.isArray(input)) {
				command.args = command.args.concat(input);
			} else {
				command.args.push(input);
			}
			const output: {exitCode: ExitCode, retValue: any} = cmd.func(command.args);
			if (command.next) {
				switch (command.connector) {
					case '|':
						return this.executeCommand(command.next, output.retValue); // Pipe the output as input
					case '||':
						if (!output.exitCode.isSuccess()) {
							return this.executeCommand(command.next);
						}
						break;
					case '&&':
						if (output.exitCode.isSuccess()) {
							return this.executeCommand(command.next);
						}
						break;
					case '>':
						//TODO
						return null;
					case '>>':
						//TODO
						return null;
					case '<':
						//TODO
						return null;
					default:
						//TODO
						return null;
				}
			}
			return output;//always return the output of the last command
		}

		public execute(command: Command): void {
			const output: {exitCode: ExitCode, retValue: any} = this.executeCommand(command);
			output.exitCode.shellPrintDesc();
			if (output.retValue) {
				_StdOut.putText(output.retValue);
			}
			//return early if shutting down the kernel
			let currCommand: Command = command;
			let cmd: ShellCommand | undefined = undefined;
			do {//this is the first legitimate use of a do/while loop I've ever had
				for (const c of ShellCommand.COMMAND_LIST) {
					if (c.command === command.name) {
						cmd = c;
						break;
					}
				}
				if (cmd && cmd.func === ShellCommand.shellShutdown) {
					return;
				}
				currCommand = currCommand.next;
			} while (currCommand);
			if (_StdOut.currentXPosition > 0) {
				_StdOut.advanceLine();
			}
			if (cmd && cmd.func === ShellCommand.shellRun) {
				return;
			}
			this.putPrompt();
		}

		public exeFnAsCmd(func: (args: string[]) => {exitCode: ExitCode, retValue: any}, args: string[]): void {
			const output: {exitCode: ExitCode, retValue: any} = func(args);
			output.exitCode.shellPrintDesc();
			if (output.retValue) {
				_StdOut.putText(output.retValue);
			}
			//return early if shutting down the kernel
			if (func === ShellCommand.shellShutdown) {
				return;
			}
			if (_StdOut.currentXPosition > 0) {
				_StdOut.advanceLine();
			}
			this.putPrompt();
		}

		public shellCurse(_args: string[]): {exitCode: ExitCode, retValue: any} {
			_StdOut.putText("Oh, so that's how it's going to be, eh? Fine.");
			_StdOut.advanceLine();
			_StdOut.putText("Bitch.");
			_SarcasticMode = true;
			return {exitCode: ExitCode.SUCCESS, retValue: undefined};
		}

		public shellApology(_args: string[]): {exitCode: ExitCode, retValue: any} {
			if (_SarcasticMode) {
				_StdOut.putText("I think we can put our differences behind us.");
				_StdOut.advanceLine();
				_StdOut.putText("For science . . . You monster.");
				_SarcasticMode = false;
			} else {
				_StdOut.putText("For what?");
			}
			return {exitCode: ExitCode.SUCCESS, retValue: undefined};
		}
	}
}
