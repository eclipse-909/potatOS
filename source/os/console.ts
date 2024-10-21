/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

module TSOS {
	export class Console implements OutStream<string[]>, InStream<string[]>, ErrStream<string[]> {
		constructor(public currentFont: string = _DefaultFontFamily,
		            public currentFontSize: number = _DefaultFontSize,
		            public currentXPosition = 0,
		            public currentYPosition: number = _DefaultFontSize,
		            public buffer = "",
		            public shellHistory: string[] = [],
					public shellHistoryIndex: number = 0,
		            public inputEnabled = true) {
		}

		public init(): void {
			this.clearScreen();
			this.resetXY();
		}

		public clearScreen(): void {
			_Canvas.height = CANVAS_HEIGHT;
		}

		public resetXY(): void {
			this.currentXPosition = 0;
			this.currentYPosition = this.currentFontSize;
		}

		//Clears the text of the current prompt, but doesn't remove the prompt
		clearPrompt(): void {
			const xSize = _DrawingContext.measureText(this.currentFont, this.currentFontSize, this.buffer);
			const xStartPos: number = this.currentXPosition - xSize;
			_DrawingContext.clearRect(xStartPos, this.currentYPosition - _DefaultFontSize, xSize, _DefaultFontSize + 5);
			this.currentXPosition = xStartPos;
			this.buffer = "";
		}

		public handleInput(): string {
			while (_KernelInputQueue.getSize() > 0) {
				// Get the next character from the kernel input queue.
				const chr: string = _KernelInputQueue.dequeue();
				//only handle the input if it's enabled. all characters entered will be discarded
				if (!this.inputEnabled && chr !== String.fromCharCode(3)) {continue;}
				// Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
				switch (chr) {
					case String.fromCharCode(-1): // up arrow
						if (this.shellHistoryIndex === 0) {break;}
						this.shellHistoryIndex--;
						this.clearPrompt();
						this.buffer = this.shellHistory[this.shellHistoryIndex];
						this.putText(this.buffer);
						break;
					case String.fromCharCode(-2): // down arrow
						if (this.shellHistoryIndex === this.shellHistory.length) {break;}
						this.shellHistoryIndex++;
						this.clearPrompt();
						if (this.shellHistoryIndex === this.shellHistory.length) {break;}
						this.buffer = this.shellHistory[this.shellHistoryIndex];
						this.putText(this.buffer);
						break;
					case String.fromCharCode(3): // ctrl + c
						if (_Scheduler.currPCB && _OsShell.pidsWaitingOn.some((item: {pid: number, connector: string | null}): boolean => {
							return _Scheduler.currPCB.pid === item.pid;
						})) {
							_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, ExitCode.TERMINATED_BY_CTRL_C]));
						}
						break;
					case String.fromCharCode(8): // backspace
						if (this.currentXPosition <= 0.00001 /*floating point shenanigans*/) {
							this.currentXPosition = _DrawingContext.measureText(this.currentFont, this.currentFontSize, _OsShell.promptStr + this.buffer);
							this.currentYPosition -= _DefaultFontSize +
								_DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
								_FontHeightMargin;
						}
						const xSize = _DrawingContext.measureText(this.currentFont, this.currentFontSize, this.buffer.charAt(this.buffer.length - 1));
						const xStartPos = this.currentXPosition - xSize;
						_DrawingContext.clearRect(xStartPos, this.currentYPosition - _DefaultFontSize, xSize, _DefaultFontSize + 5);
						this.currentXPosition = xStartPos;
						this.buffer = this.buffer.slice(0, -1);
						break;
					case String.fromCharCode(9): // tab
						//Use the last command/argument
						let lastIndex: number = -1;
						let matchedDelimiter: string = "";
						for (const connector of _OsShell.connectors) {
							const index: number = this.buffer.lastIndexOf(connector);
							if (index > lastIndex) {
								lastIndex = index;
								matchedDelimiter = connector;
							}
						}
						for (const redirector of _OsShell.redirectors) {
							const index: number = this.buffer.lastIndexOf(redirector);
							if (index > lastIndex) {
								lastIndex = index;
								matchedDelimiter = redirector;
							}
						}
						const tokens: string[] = (lastIndex === -1
							? this.buffer
							: this.buffer.substring(lastIndex + matchedDelimiter.length)
						).trim().split(/\s+/);//split by 1 or more spaces
						if (tokens.length == 1) {
							this.autocompleteCmd(tokens[0]);
						} else if (tokens.length === 2) {
							this.autocompleteArg1(tokens[0], tokens[1]);
						}
						break;
					case String.fromCharCode(13): // the Enter key (carriage return)
						// The enter key marks the end of a console command, so ...
						// ... tell the shell ...
						_OsShell.handleInput(this.buffer);
						this.shellHistory.push(this.buffer);
						this.shellHistoryIndex = this.shellHistory.length;
						// ... and reset our buffer.
						this.buffer = "";
						break;
					default: // normal character
						this.putText(chr);
						this.buffer += chr;
						break;
				}
			}
			return this.buffer;
		}

		private autocompleteCmd(cmdToken: string): void {
			cmdToken = cmdToken.toLowerCase();
			const possCmds: string[] = [];
			for (const cmd of ShellCommand.COMMAND_LIST) {
				if (cmd.command.substring(0, cmdToken.length).toLowerCase() === cmdToken) {
					possCmds.push(cmd.command);
				}
			}
			if (possCmds.length === 1) { // fill the command
				const remainder: string = possCmds[0].substring(cmdToken.length) + " ";
				//if you start writing the command in the wrong case, that's okay, but this won't correct the case you were using.
				//it will just fill in the rest of the command in the correct case
				this.putText(remainder);
				this.buffer += remainder;
			} else if (possCmds.length > 1) { // print all possible commands
				this.advanceLine();
				for (const cmd of possCmds) {
					this.putText(cmd);
					this.advanceLine();
				}
				_OsShell.putPrompt();
				this.putText(this.buffer); // preserve the input for the next prompt
			}
		}

		private autocompleteArg1(cmdToken: string, argToken: string): void {
			const cmd: ShellCommand | undefined = ShellCommand.COMMAND_LIST.find(c => {return c.command === cmdToken;});
			if (cmd === undefined || cmd.validArgs.length === 0) {return;}
			argToken = argToken.toLowerCase();
			const possArgs: string[] = [];
			for (const arg of cmd.validArgs) {
				if (arg.substring(0, argToken.length).toLowerCase() === argToken) {
					possArgs.push(arg);
				}
			}
			if (possArgs.length === 1) { // fill the argument
				const remainder: string = possArgs[0].substring(argToken.length) + " ";
				//if you start writing the argument in the wrong case, that's okay, but this won't correct the case you were using.
				//it will just fill in the rest of the argument in the correct case
				this.putText(remainder);
				this.buffer += remainder;
			} else if (possArgs.length > 1) { // print all possible arguments
				this.advanceLine();
				for (const arg of possArgs) {
					this.putText(arg);
					this.advanceLine();
				}
				_OsShell.putPrompt();
				this.putText(this.buffer); // preserve the input for the next prompt
			}
		}

		//REMEMBER THIS DOES NOT ADD THE TEXT TO THE BUFFER!!!!!!!!!!!!!!!
		public putText(text: string): void {
			if (text !== "") {
				const lines: string[] = text.split(/\r?\n/);//The thing being printed might contain a carriage return or new line
				for (let i: number = 0; i < lines.length; i++) {
					_DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, lines[i]);
					if (i !== lines.length - 1) {
						this.advanceLine();
					}
				}
			}
		}

		//Alternatively, you can output "\n" to the console.
		public advanceLine(): void {
			this.currentXPosition = 0;
			this.currentYPosition += _DefaultFontSize +
				_DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
				_FontHeightMargin;
			if (this.currentYPosition > _Canvas.height) {
				let screenData = _DrawingContext.getImageData(0, 0, _Canvas.width, this.currentYPosition + _FontHeightMargin);
				_Canvas.height = this.currentYPosition + _FontHeightMargin;
				_DrawingContext.putImageData(screenData, 0, 0);
				//Is it okay to do GUI stuff here?
				document.getElementById("display").scrollIntoView({ behavior: 'instant', block: 'end' });
			}
		}

		//I/O interface functions
		output(buffer: string[]): void {this.putText(buffer[0]);}
		input(): string[] {return [this.handleInput()];}
		error(buffer: string[]): void {this.putText(buffer[0]);}
	}
}