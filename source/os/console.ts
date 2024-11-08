/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

module TSOS {
	//TODO remake the entire console
	export class Console implements OutStream<string[]>, InStream<string[]>, ErrStream<string[]> {
		//Index of the character in the input buffer that this cursor precedes in insert mode,
		//or the index of the character that this cursor will replace in type-over mode.
		//0 represents the cursor being at the very beginning.
		//this.inputBuffer.length represents the cursor being at the very end.
		//Line represents the line number of the input buffer.
		public cursorPos: {line: number, charIndex: number};
		//All previous lines of text in the console.
		public prevLines: string[];
		//The buffer for the text being outputted to the console.
		//If it's null, then the outputBuffer doesn't exist yet, and the input line must be redrawn to start outputting text.
		public outputBuffer: string | null;
		//The input buffer for the text being edited in the current line.
		//Each string in the array represents a line. This is because there might be line wrap while entering a command.
		//If it's null, then that means input is disabled and there is no prompt string.
		public inputBuffer: string[] | null;
		//This number represents the line number that is rendered at the top of the canvas
		public scroll: number;
		public shellHistory: string[];
		public shellHistoryIndex: number;
		public inputEnabled: boolean;
		//Insert vs type-over
		public insert: boolean;

		constructor() {
			this.cursorPos = {line: 0, charIndex: 0};
			this.prevLines = [];
			this.outputBuffer = null;
			this.inputBuffer = [""];
			this.scroll = 0;
			this.shellHistory = [];
			this.shellHistoryIndex = 0;
			this.inputEnabled = true;
			this.insert = true;
		}

		public init(): void {
			this.clearScreen();
			this.drawPrompt(CANVAS_MARGIN, CANVAS_MARGIN);
		}

		private getOutputLineNum(): number {return this.prevLines.length;}

		//Gets the line number of the first input line, or where it would be if it exists.
		private getInput0LineNum(): number {return this.prevLines.length + (this.outputBuffer === null? 0 : 1);}

		private getLineYPos(lineNum: number): number {return (lineNum - this.scroll) * (_FontSize + _FontHeightMargin) + CANVAS_MARGIN - _FontHeightMargin;}

		//This erases the inputBuffer and the cursorPos, so save it before calling this function if you need to.
		private eraseInput(): void {
			const y: number = this.getLineYPos(this.getInput0LineNum()) - _FontSize;
			const diff: number = CANVAS_HEIGHT - y;
			if (diff < 0) {return;}
			_DrawingContext.clearRect(0, y, _Canvas.width, diff);
			this.inputBuffer = [""];
			this.cursorPos = {line: 0, charIndex: 0};
		}

		//Positive is right, negative is left
		public moveCursor(chars: number): void {
			this.cursorPos.charIndex += chars;
			while (this.cursorPos.charIndex < 0) {
				this.cursorPos.line--;
				if (this.cursorPos.line < 0) {
					this.cursorPos.line = 0;
					this.cursorPos.charIndex = 0;
				} else {
					this.cursorPos.charIndex += this.inputBuffer[this.cursorPos.line].length;
				}
			}
			while (this.cursorPos.charIndex >= this.inputBuffer[this.cursorPos.line].length && this.cursorPos.line < this.inputBuffer.length) {
				this.cursorPos.line++;
				if (this.cursorPos.line >= this.inputBuffer.length) {
					this.cursorPos.line = this.inputBuffer.length - 1;
					this.cursorPos.charIndex = this.inputBuffer[this.cursorPos.line].length;
				} else {
					this.cursorPos.charIndex -= this.inputBuffer[this.cursorPos.line].length;
				}
			}
		}

		//Positive scrolls down (text moves up), negative scrolls up (text moves down).
		public scrollBy(lines: number): void {
			if (lines === 0) {return;}
			this.scroll += lines;
			if (this.scroll < 0) {
				this.scroll = 0;
			} else if (this.scroll >= this.getOutputLineNum()) {
				this.scroll = this.getOutputLineNum();
			}
			this.redrawCanvas();
		}

		public redrawCanvas(): void {
			//Don't call this.clearScreen() since we want to save buffer and cursor data
			_DrawingContext.clearRect(0, 0, _Canvas.width, CANVAS_HEIGHT);
			//render previous lines
			const lastPrevLine: number = Math.min(CANVAS_NUM_LINES + this.scroll + 1, this.prevLines.length);
			let currLineNum: number = this.scroll;
			for (; currLineNum < lastPrevLine; currLineNum++) {
				const lineYPos: number = this.getLineYPos(currLineNum);
				_DrawingContext.drawText(this.prevLines[currLineNum - this.scroll], CANVAS_MARGIN, lineYPos);
			}
			if (currLineNum - this.scroll > CANVAS_NUM_LINES) {return;}
			if (this.outputBuffer !== null) {
				//render output buffer
				//we can't call this.print() since we don't want to automatically scroll when we draw too much text
				_DrawingContext.drawText(this.outputBuffer, CANVAS_MARGIN, this.getLineYPos(currLineNum));
				currLineNum++;
			}
			if (currLineNum - this.scroll > CANVAS_NUM_LINES || this.inputBuffer === null) {return;}
			//render prompt and first input line
			//we can't call this.printInput() since we don't want to automatically scroll when we draw too much text
			_DrawingContext.drawText(_OsShell.promptStr + (this.inputBuffer.length > 0? this.inputBuffer[0] : ""), CANVAS_MARGIN, this.getLineYPos(currLineNum));
			currLineNum++;
			//render input buffer on next lines
			const lastInputLine: number = Math.min(CANVAS_NUM_LINES + this.scroll + 1, this.inputBuffer.length);
			for (let i: number = 1; currLineNum < lastInputLine && i < this.inputBuffer.length; currLineNum++) {
				const lineYPos: number = this.getLineYPos(currLineNum);
				_DrawingContext.drawText(this.inputBuffer[i], CANVAS_MARGIN, lineYPos);
				i++;
			}
			if (this.cursorPos.charIndex > this.inputBuffer[this.inputBuffer.length - 1].length) {
				this.cursorPos.charIndex = this.inputBuffer[this.inputBuffer.length - 1].length;
			}
		}

		//startXPos should usually be CANVAS_MARGIN + the width of any exising text (like the prompt).
		private static splitText(text: string, startXPos: number): string[] {
			let lines: string[] = [""];
			let xPos: number = startXPos;
			for (const char of text) {
				if (char === '\r' || char === '\n') {
					lines.push("");
					xPos = CANVAS_MARGIN;
					continue;
				}
				const width: number = _DrawingContext.measureText(char);
				if (xPos + width >= _Canvas.width - CANVAS_MARGIN) {
					lines.push(char);
					xPos = CANVAS_MARGIN;
				} else {
					lines[lines.length - 1] += char;
					xPos += width;
				}
			}
			return lines;
		}

		//Returns the new Y position to start drawing from.
		//Scrolls the text up as many lines as necessary.
		private advanceLine(currYPos: number): number {
			let newYPos: number = currYPos + _FontSize + _FontHeightMargin;
			if (newYPos < CANVAS_HEIGHT - CANVAS_MARGIN) {
				return newYPos;
			}
			while (newYPos >= CANVAS_HEIGHT - CANVAS_MARGIN) {
				this.scrollBy(1);
			}
			return currYPos;
		}

		//Print output text only, not used for displaying input text
		public print(text: string): void {
			if (text === "") {return;}
			//Get the coordinates of where we start drawing
			const outputXPos: number = CANVAS_MARGIN + (this.outputBuffer === null? 0 : _DrawingContext.measureText(this.outputBuffer));
			const outputYPos: number = this.getLineYPos(this.getOutputLineNum());
			//split text into the lines by how it will be rendered with line wrap
			const textLines: string[] = Console.splitText(text, outputXPos);
			for (let i: number = 0; i < textLines.length - 1; i++) {
				this.prevLines.push(textLines[i]);
			}
			text = textLines[textLines.length - 1];
			if (this.outputBuffer === null) {
				this.outputBuffer = text;
			} else {
				this.outputBuffer += text;
			}
			if (this.inputBuffer !== null) {
				//save input text and cursor position
				const prevCursor: {line: number, charIndex: number} = this.cursorPos;
				const prevInput: string[] = this.inputBuffer;
				this.eraseInput();
				let xPos: number = outputXPos;
				let yPos: number = outputYPos;
				//Start printing output text
				for (const line of textLines) {
					_DrawingContext.drawText(line, xPos, yPos);
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
				}
				//Put the prompt back
				const newPos: {xPos: number, yPos: number} = this.drawPrompt(xPos, yPos);
				xPos = newPos.xPos;
				yPos = newPos.yPos;
				//Put the input text back
				for (let i: number = 0; i < prevInput.length - 1; i++) {
					_DrawingContext.drawText(prevInput[i], xPos, yPos);
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
				}
				_DrawingContext.drawText(prevInput[prevInput.length - 1], xPos, yPos);
				this.cursorPos = prevCursor;
				this.inputBuffer = prevInput;
			} else {
				let xPos: number = outputXPos;
				let yPos: number = outputYPos;
				//Start printing output text
				for (const line of textLines) {
					_DrawingContext.drawText(line, xPos, yPos);
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
				}
			}
		}

		private printInput(text: string): void {
			const secondHalf: string = this.inputBuffer[this.cursorPos.line].substring(this.cursorPos.charIndex) + this.inputBuffer.slice(this.cursorPos.line + 1).join();
			const newInputText: string[] = Console.splitText(
				this.inputBuffer
					.slice(0, this.cursorPos.line)
					.join() +
					this.inputBuffer[this.cursorPos.line]
					.substring(0, this.cursorPos.charIndex) +
					text +
					(this.insert? secondHalf : secondHalf.substring(text.length)),
				_DrawingContext.measureText(_OsShell.promptStr)
			);
			const cursor: {line: number, charIndex: number} = this.cursorPos;
			this.eraseInput();
			this.inputBuffer = newInputText;
			this.redrawInput();
			this.cursorPos = cursor;
			this.moveCursor(text.length);
			_DrawingContext.drawText();
		}

		private redrawInput(): void {
			let xPos: number = CANVAS_MARGIN;
			let yPos: number = this.getLineYPos(this.getInput0LineNum());
			//Put the prompt back
			const newPos: {xPos: number, yPos: number} = this.drawPrompt(xPos, yPos);
			xPos = newPos.xPos;
			yPos = newPos.yPos;
			//Put the input text back
			for (let i: number = 0; i < this.inputBuffer.length - 1; i++) {
				_DrawingContext.drawText(this.inputBuffer[i], xPos, yPos);
				xPos = CANVAS_MARGIN;
				yPos = this.advanceLine(yPos);
			}
			_DrawingContext.drawText(this.inputBuffer[this.inputBuffer.length - 1], xPos, yPos);
			this.moveCursor(0);//if the cursor is beyond the text area, this will move it back to the end
		}

		private drawPrompt(xPos: number, yPos: number): {xPos: number, yPos: number} {
			const promptLines: string[] = Console.splitText(_OsShell.promptStr, xPos);
			for (let i: number = 0; i < promptLines.length - 1; i++) {
				_DrawingContext.drawText(promptLines[i], xPos, yPos);
				xPos = CANVAS_MARGIN;
				yPos = this.advanceLine(yPos);
			}
			_DrawingContext.drawText(promptLines[promptLines.length - 1], xPos, yPos);
			xPos += _DrawingContext.measureText(promptLines[promptLines.length - 1]);
			return {xPos, yPos};
		}

		public putPrompt(): void {this.drawPrompt(CANVAS_MARGIN, this.getLineYPos(this.getInput0LineNum()));}

		public clearScreen(): void {
			_DrawingContext.clearRect(0, 0, _Canvas.width, CANVAS_HEIGHT);
			this.prevLines = [];
			this.outputBuffer = null;
			this.inputBuffer = null;
			this.cursorPos.line = 0;
			this.cursorPos.charIndex = 0;
		}

		//Clears the input text of the current prompt, but doesn't remove the prompt string
		// clearPrompt(): void {
		// 	const xSize: number = _DrawingContext.measureText(this.inputBuffer);
		// 	const xStartPos: number = this.currentXPosition - xSize;
		// 	_DrawingContext.clearRect(xStartPos, this.currentYPosition, xSize, this.currentYPosition + _DrawingContext.fontDescent());
		// 	this.currentXPosition = xStartPos;
		// 	this.inputBuffer = "";
		// }

		public handleInput(): string[] {
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
						this.eraseInput();
						this.inputBuffer = Console.splitText(this.shellHistory[this.shellHistoryIndex], _DrawingContext.measureText(_OsShell.promptStr));
						this.redrawInput();
						break;
					case String.fromCharCode(-2): // down arrow
						if (this.shellHistoryIndex === this.shellHistory.length) {break;}
						this.shellHistoryIndex++;
						this.eraseInput();
						if (this.shellHistoryIndex === this.shellHistory.length) {
							this.drawPrompt(CANVAS_MARGIN, this.getLineYPos(this.getInput0LineNum()));
							break;
						}
						this.inputBuffer = Console.splitText(this.shellHistory[this.shellHistoryIndex], _DrawingContext.measureText(_OsShell.promptStr));
						this.redrawInput();
						break;
					case String.fromCharCode(-3): // insert
						this.insert = !this.insert;
						break
					case String.fromCharCode(3): // ctrl + c
						//Only kill if synchronous
						if (_Scheduler.currPCB && _OsShell.pidsWaitingOn.some((item: {pid: number, connector: string | null}): boolean => {
							return _Scheduler.currPCB.pid === item.pid;
						})) {
							_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, ExitCode.TERMINATED_BY_CTRL_C]));
						}
						break;
					case String.fromCharCode(8): // backspace
						//unwrap cursor if necessary
						if (this.cursorPos.charIndex === 0) {
							if (this.cursorPos.line === 0) {
								break;
							}
							this.cursorPos.line--;
							this.cursorPos.charIndex = this.inputBuffer[this.cursorPos.line].length;
						}
						//delete character from buffer
						this.inputBuffer[this.cursorPos.line] = this.inputBuffer[this.cursorPos.line].substring(0, this.cursorPos.charIndex - 1) +
							this.inputBuffer[this.cursorPos.line].substring(this.cursorPos.charIndex);
						const input0: string[] = Console.splitText(this.inputBuffer.join(), _DrawingContext.measureText(_OsShell.promptStr));
						//redraw
						this.eraseInput();
						this.inputBuffer = input0;
						this.redrawInput();
						break;
					case String.fromCharCode(9): // tab
						let currLine: string = this.inputBuffer[this.cursorPos.line].substring(0, this.cursorPos.charIndex);
						//Use the last command/argument
						let lastIndex: number = -1;
						let matchedDelimiter: string = "";
						for (const connector of _OsShell.connectors) {
							const index: number = currLine.lastIndexOf(connector);
							if (index > lastIndex) {
								lastIndex = index;
								matchedDelimiter = connector;
							}
						}
						for (const redirector of _OsShell.redirectors) {
							const index: number = currLine.lastIndexOf(redirector);
							if (index > lastIndex) {
								lastIndex = index;
								matchedDelimiter = redirector;
							}
						}
						if (lastIndex !== -1) {
							currLine = currLine.substring(lastIndex + matchedDelimiter.length);
						}
						const tokens: string[] = currLine.trim().split(/\s+/);//split by 1 or more spaces
						if (tokens.length == 1) {
							if (!currLine.endsWith(' ')) {
								//Use token 0 as complete command and display all possible 1st arguments
								const command: ShellCommand = ShellCommand.COMMAND_LIST.find(cmd => {return cmd.command === tokens[0];});
								if (command === undefined || command.validArgs.length === 0) {return;}
								const input: string[] = this.inputBuffer;
								this.pushInputToPrev();
								this.print(command.validArgs.join('\n'));
								this.printInput(input.join());
							} else {
								//Sse token 0 as incomplete command and autocomplete it
								tokens[0] = tokens[0].toLowerCase();
								const possCmds: string[] = [];
								for (const cmd of ShellCommand.COMMAND_LIST) {
									if (cmd.command.substring(0, tokens[0].length).toLowerCase() === tokens[0]) {
										possCmds.push(cmd.command);
									}
								}
								if (possCmds.length === 1) { // fill the command
									const remainder: string = possCmds[0].substring(tokens[0].length) + " ";
									//if you start writing the command in the wrong case, that's okay, but this won't correct the case you were using.
									//it will just fill in the rest of the command in the correct case
									this.printInput(remainder);
								} else if (possCmds.length > 1) { // print all possible commands
									const input: string[] = this.inputBuffer;
									this.pushInputToPrev();
									this.print(possCmds.join('\n'));
									this.printInput(input.join());
								}
							}
						} else if (tokens.length === 2) {
							//Use token 0 as the command and token 1 as an incomplete first argument for that command, and then autocomplete the argument
							const cmd: ShellCommand | undefined = ShellCommand.COMMAND_LIST.find(c => {return c.command === tokens[0];});
							if (cmd === undefined || cmd.validArgs.length === 0) {return;}
							tokens[1] = tokens[1].toLowerCase();
							const possArgs: string[] = [];
							for (const arg of cmd.validArgs) {
								if (arg.substring(0, tokens[1].length).toLowerCase() === tokens[1]) {
									possArgs.push(arg);
								}
							}
							if (possArgs.length === 1) { // fill the argument
								const remainder: string = possArgs[0].substring(tokens[1].length) + " ";
								//if you start writing the argument in the wrong case, that's okay, but this won't correct the case you were using.
								//it will just fill in the rest of the argument in the correct case
								this.printInput(remainder);
							} else if (possArgs.length > 1) { // print all possible arguments
								const input: string[] = this.inputBuffer;
								this.pushInputToPrev();
								this.print(possArgs.join('\n'));
								this.printInput(input.join());
							}
						}
						break;
					case String.fromCharCode(13): // the Enter key (carriage return)
						const input2: string = this.inputBuffer.join();
						_OsShell.handleInput(input2);
						this.shellHistory.push(input2);
						this.shellHistoryIndex = this.shellHistory.length;
						this.pushInputToPrev();
						break;
					case String.fromCharCode(127): // delete
						//wrap cursor if necessary
						let line: number = this.cursorPos.line;//copy line and charIndex because we need to handle line wrap without moving the cursor
						let charIndex: number = this.cursorPos.charIndex;
						if (charIndex === this.inputBuffer[line].length) {
							if (line === this.inputBuffer.length - 1) {
								break;
							}
							line++;
							charIndex = 0;
						}
						//delete character from buffer
						this.inputBuffer[line] = this.inputBuffer[line].substring(0, this.cursorPos.charIndex) +
							this.inputBuffer[line].substring(charIndex + 1);
						const input1: string[] = Console.splitText(this.inputBuffer.join(), _DrawingContext.measureText(_OsShell.promptStr));
						//redraw
						this.eraseInput();
						this.inputBuffer = input1;
						this.redrawInput();
						break;
					default: // normal character
						this.printInput(chr);
						break;
				}
			}
			return this.inputBuffer;
		}

		private pushInputToPrev(): void {
			this.prevLines.push(this.outputBuffer);
			this.outputBuffer = null;
			this.inputBuffer[0] = _OsShell.promptStr + this.inputBuffer[0];
			this.prevLines.concat(this.inputBuffer);
			this.inputBuffer = null;
		}

		//I/O interface functions
		output(buffer: string[]): void {this.print(buffer.join());}
		input(): string[] {return this.handleInput();}
		error(buffer: string[]): void {this.print(buffer.join());}
	}
}