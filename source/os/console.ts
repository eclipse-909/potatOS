/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

module TSOS {
	export class Console implements OutStream<string[]>, InStream<string[]>, ErrStream<string[]> {
		//Index of the character in the input buffer that this cursor precedes in insert mode,
		//or the index of the character that this cursor will replace in type-over mode.
		//0 represents the cursor being at the very beginning.
		//this.inputBuffer.length represents the cursor being at the very end.
		private cursorPos: number;
		//All previous lines of text in the console.
		private prevLines: string[];
		//The buffer for the text being outputted to the console.
		//If it's null, then the outputBuffer doesn't exist yet, and the input line must be redrawn to start outputting text.
		private outputBuffer: string | null;
		//The input buffer for the text being edited in the current line.
		private inputBuffer: string | null;
		//This number represents the line number that is rendered at the top of the canvas
		private scroll: number;
		private shellHistory: string[];
		private shellHistoryIndex: number;
		public inputEnabled: boolean;
		//Insert vs type-over
		private insert: boolean;

		constructor() {
			this.cursorPos = 0;
			this.prevLines = [];
			this.outputBuffer = null;
			this.inputBuffer = "";
			this.scroll = 0;
			this.shellHistory = [];
			this.shellHistoryIndex = 0;
			this.inputEnabled = true;
			this.insert = true;
		}

		public init(): void {this.putPrompt();}

		private getOutputLineNum(): number {return this.prevLines.length;}

		//Gets the line number of the first input line, or where it would be if it exists.
		private getInputLineNum(): number {return this.prevLines.length + (this.outputBuffer === null? 0 : 1);}

		private getCursorLineNum(): number {
			const input: string[] = Console.splitText(this.inputBuffer, this.endPromptXPos());
			let line: number = 0;
			let pos: number = this.cursorPos;
			for (; line < input.length - 1 && this.cursorPos >= input[line].length; line++) {
				pos -= input[line].length;
			}
			return this.getInputLineNum() + line;
		}

		//Returns the Y position of where you can write text on this line.
		private getLineYPos(lineNum: number): number {return (lineNum - this.scroll + 1) * (_FontSize + _FontHeightMargin) + CANVAS_MARGIN - _FontHeightMargin;}

		private endPromptXPos(): number {return CANVAS_MARGIN + _DrawingContext.measureText(_OsShell.promptStr).width;}

		//This erases the inputBuffer and the cursorPos, so save it before calling this function if you need to.
		private eraseInput(): void {
			const y: number = this.getLineYPos(this.getInputLineNum()) - _FontSize;
			const diff: number = CANVAS_HEIGHT - y;
			if (diff < 0) {return;}
			_DrawingContext.clearRect(0, y, _Canvas.width, diff);
			this.inputBuffer = "";
			this.cursorPos = 0;
		}

		//Positive is right, negative is left
		private moveCursor(chars: number): void {
			this.cursorPos += chars;
			if (this.cursorPos < 0) {
				this.cursorPos = 0;
			} else if (this.cursorPos > this.inputBuffer.length) {
				this.cursorPos = this.inputBuffer.length;
			}
			let scrolled: boolean = false;
			while (this.getCursorPos().y >= CANVAS_HEIGHT + CANVAS_MARGIN) {
				this.scrollBy(1);
				scrolled = true;
			}
			while (this.getCursorPos().y < 0) {
				this.scrollBy(-1);
				scrolled = true;
			}
			if (scrolled) {
				this.redrawCanvas();
			}
		}

		//Positive scrolls down (text moves up), negative scrolls up (text moves down).
		//You must call this.redrawCanvas() afterwards. It isn't called here since you may need to scroll a bunch before drawing.
		//Drawing a bunch of times is very slow.
		public scrollBy(lines: number): void {//BUG sometimes it allows you to scroll too far down
			this.scroll += lines;
			if (this.scroll < 0) {
				this.scroll = 0;
			} else {
				let lastLine: number = this.getInputLineNum();
				if (this.inputBuffer !== null) {
					lastLine += Console.splitText(this.inputBuffer, this.endPromptXPos()).length - 1;
				}
				if (this.scroll >= lastLine) {
					this.scroll = lastLine;
				}
			}
		}

		public redrawCanvas(): void {
			//Don't call this.clearScreen() since we want to save buffer and cursor data
			_DrawingContext.clearRect(0, 0, _Canvas.width, CANVAS_HEIGHT);
			//render previous lines
			const lastPrevLine: number = Math.min(CANVAS_NUM_LINES + this.scroll + 1, this.prevLines.length);
			let currLineNum: number = this.scroll;
			for (; currLineNum < lastPrevLine; currLineNum++) {
				const lineYPos: number = this.getLineYPos(currLineNum);
				_DrawingContext.fillText(this.prevLines[currLineNum], CANVAS_MARGIN, lineYPos);
			}
			if (currLineNum - this.scroll > CANVAS_NUM_LINES) {return;}
			if (this.outputBuffer !== null) {
				//render output buffer
				//we can't call this.print() since we don't want to automatically scroll when we draw too much text
				_DrawingContext.fillText(this.outputBuffer, CANVAS_MARGIN, this.getLineYPos(currLineNum));
				currLineNum++;
			}
			if (currLineNum - this.scroll > CANVAS_NUM_LINES || this.inputBuffer === null) {return;}
			//render prompt and first input line
			//we can't call this.printInput() since we don't want to automatically scroll when we draw too much text
			const input: string[] = Console.splitText(this.inputBuffer, this.endPromptXPos());
			_DrawingContext.fillText(_OsShell.promptStr + (this.inputBuffer.length > 0? input[0] : ""), CANVAS_MARGIN, this.getLineYPos(currLineNum));
			currLineNum++;
			//render input buffer on next lines
			for (let i: number = 1; currLineNum <= CANVAS_NUM_LINES + this.scroll && i < input.length; currLineNum++) {
				_DrawingContext.fillText(input[i], CANVAS_MARGIN, this.getLineYPos(currLineNum));
				i++;
			}
			if (this.cursorPos > this.inputBuffer.length) {
				this.cursorPos = this.inputBuffer.length;
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
				const width: number = _DrawingContext.measureText(char).width;
				if (xPos + width >= _Canvas.width - CANVAS_MARGIN) {
					lines.push(char);
					xPos = CANVAS_MARGIN + width;
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
			while (currYPos >= CANVAS_HEIGHT - CANVAS_MARGIN) {
				this.scrollBy(1);
				currYPos -= _FontSize + _FontHeightMargin;
			}
			this.redrawCanvas();
			return currYPos;
		}

		//Print output text only, not used for displaying input text
		public print(text: string): void {
			//Get the coordinates of where we start drawing
			const outputXPos: number = CANVAS_MARGIN + (this.outputBuffer === null? 0 : _DrawingContext.measureText(this.outputBuffer).width);
			const outputYPos: number = this.getLineYPos(this.getOutputLineNum());
			//split text into the lines by how it will be rendered with line wrap
			const textLines: string[] = Console.splitText(text, outputXPos);
			let prevLines: string[] = [];
			if (textLines.length === 1) {
				text = textLines[0];
			} else {
				if (this.outputBuffer !== null) {
					prevLines.push(this.outputBuffer + textLines[0]);
					this.outputBuffer = "";
				} else {
					prevLines.push(textLines[0]);
				}
				for (let i: number = 1; i < textLines.length - 1; i++) {
					prevLines.push(textLines[i]);
				}
				text = textLines[textLines.length - 1];
			}
			if (this.inputBuffer !== null) {
				//save input text and cursor position
				const prevCursor: number = this.cursorPos;
				const prevInput: string[] = Console.splitText(this.inputBuffer, this.endPromptXPos());
				this.eraseInput();
				let xPos: number = outputXPos;
				let yPos: number = outputYPos;
				//Start printing output text
				for (const line of textLines) {
					_DrawingContext.fillText(line, xPos, yPos);
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
				}
				//Put the prompt back
				const output: string = this.outputBuffer;
				const newPos: {xPos: number, yPos: number} = this.drawPrompt(xPos, yPos);
				this.outputBuffer = output;
				xPos = newPos.xPos;
				yPos = newPos.yPos;
				//Put the input text back
				_DrawingContext.fillText(prevInput[0], xPos, yPos);
				for (let line: number = 1; line < prevInput.length; line++) {
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
					_DrawingContext.fillText(prevInput[line], xPos, yPos);
				}
				this.cursorPos = prevCursor;
				this.inputBuffer = prevInput.join("");
				if (this.outputBuffer === null) {
					this.outputBuffer = text;
				} else {
					this.outputBuffer += text;
				}
			} else {
				let xPos: number = outputXPos;
				let yPos: number = outputYPos;
				if (this.outputBuffer === null) {
					this.outputBuffer = text;
				} else {
					this.outputBuffer += text;
				}
				//Start printing output text
				_DrawingContext.fillText(textLines[0], xPos, yPos);
				for (let line: number = 1; line < textLines.length; line++) {
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
					_DrawingContext.fillText(textLines[line], xPos, yPos);
				}
			}
			this.prevLines = this.prevLines.concat(prevLines);
		}

		private getCursorPos(): {x: number, y: number} {
			const input: string[] = Console.splitText(this.inputBuffer, this.endPromptXPos());
			let line: number = 0;
			let pos: number = this.cursorPos;
			for (; line < input.length - 1 && this.cursorPos >= input[line].length; line++) {
				pos -= input[line].length;
			}
			return {
				x: CANVAS_MARGIN +
					(line === 0? _DrawingContext.measureText(_OsShell.promptStr).width : 0) +
					(input.length > 0? _DrawingContext.measureText(input[line].substring(0, this.cursorPos)).width : 0),
				y: this.getLineYPos(this.getInputLineNum() + line)
			};
		}

		private printInput(text: string): void {
			if (this.inputBuffer === null) {
				//new text
				this.eraseInput();
				this.inputBuffer = text;
				this.redrawInput();
				this.cursorPos = 0;
				this.moveCursor(text.length);
			} else if (this.cursorPos === this.inputBuffer.length) {
				//when the cursor is at the very end
				const newInputText: string[] = Console.splitText(this.inputBuffer + text, this.endPromptXPos());
				let line: number = 0;
				let pos: number = this.cursorPos;
				for (; line < newInputText.length - 1 && this.cursorPos >= newInputText[line].length; line++) {
					pos -= newInputText[line].length;
				}
				let xPos: number = CANVAS_MARGIN +
					(line === 0? _DrawingContext.measureText(_OsShell.promptStr).width : 0) +
					(newInputText.length > 0? _DrawingContext.measureText(newInputText[line].substring(0, pos)).width : 0);
				let yPos: number = this.getLineYPos(this.getInputLineNum() + line);
				_DrawingContext.fillText(newInputText[line].substring(pos), xPos, yPos);
				line++;
				for (; line < newInputText.length; line++) {
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
					_DrawingContext.fillText(newInputText[line], xPos, yPos);
				}
				this.inputBuffer = newInputText.join("");
				this.moveCursor(text.length);
			} else {
				//cursor is not at the end of the text
				const oldInputText: string[] = Console.splitText(this.inputBuffer, this.endPromptXPos());
				const newInputText: string[] = Console.splitText(
					this.inputBuffer.substring(0, this.cursorPos) + text + this.inputBuffer.substring(this.cursorPos + (this.insert? 0 : text.length)),
					this.endPromptXPos()
				);
				let line: number = this.getCursorLineNum();
				const startLine: number = line + (newInputText[line] === newInputText[line]? 1 : 0);
				//exclusive
				let endLine: number = newInputText.length;
				for (let l: number = startLine; l < oldInputText.length; l++) {
					if (oldInputText[l] === newInputText[l]) {
						endLine = l;
						break;
					}
				}
				//scroll if necessary
				let y0: number = this.getLineYPos(this.getInputLineNum() + startLine) - _FontSize;
				let y1: number = this.getLineYPos(this.getInputLineNum() + endLine);
				let scrolled: boolean = false;
				while (y1 >= CANVAS_HEIGHT - CANVAS_MARGIN) {
					this.scrollBy(1);
					y0 -= _FontSize + _FontHeightMargin;
					y1 -= _FontSize + _FontHeightMargin;
					scrolled = true;
				}
				if (scrolled) {
					this.redrawCanvas();
				}
				_DrawingContext.clearRect(0, y0, _Canvas.width, y1 - y0);
				let xPos: number = CANVAS_MARGIN;
				let yPos: number = this.getLineYPos(startLine);
				//draw prompt if necessary
				if (startLine === 0) {
					this.drawPrompt(CANVAS_MARGIN, yPos);
					xPos += _DrawingContext.measureText(_OsShell.promptStr).width;
				}
				_DrawingContext.fillText(newInputText[startLine], xPos, yPos);
				for (let line: number = startLine + 1; line < endLine; line++) {
					xPos = CANVAS_MARGIN;
					yPos = this.advanceLine(yPos);
					_DrawingContext.fillText(newInputText[line], xPos, yPos);
				}

				this.inputBuffer = newInputText.join("");
				this.moveCursor(text.length);
			}
		}

		private redrawInput(): void {
			let xPos: number = CANVAS_MARGIN;
			let yPos: number = this.getLineYPos(this.getInputLineNum());
			//Put the prompt back
			const input: string = this.inputBuffer;
			const output: string = this.outputBuffer;
			const newPos: {xPos: number, yPos: number} = this.drawPrompt(xPos, yPos);
			this.inputBuffer = input;
			this.outputBuffer = output;
			xPos = newPos.xPos;
			yPos = newPos.yPos;
			//Put the input text back
			const inputLines: string[] = Console.splitText(this.inputBuffer, this.endPromptXPos());
			_DrawingContext.fillText(inputLines[0], xPos, yPos);
			for (let i: number = 1; i < inputLines.length; i++) {
				xPos = CANVAS_MARGIN;
				yPos = this.advanceLine(yPos);
				_DrawingContext.fillText(inputLines[i], xPos, yPos);
			}
			this.moveCursor(0);//if the cursor is beyond the text area, this will move it back to the end
		}

		private drawPrompt(xPos: number, yPos: number): {xPos: number, yPos: number} {
			if (yPos >= _Canvas.height - CANVAS_MARGIN) {
				yPos = this.advanceLine(yPos);
			}
			const promptLines: string[] = Console.splitText(_OsShell.promptStr, xPos);
			_DrawingContext.fillText(promptLines[0], xPos, yPos);
			for (let i: number = 1; i < promptLines.length; i++) {
				yPos = this.advanceLine(yPos);
				_DrawingContext.fillText(promptLines[i], CANVAS_MARGIN, yPos);
			}
			this.inputBuffer = "";
			this.outputBuffer = null;
			this.inputEnabled = true;
			return {xPos: CANVAS_MARGIN + _DrawingContext.measureText(promptLines[promptLines.length - 1]).width, yPos};
		}

		public putPrompt(): void {this.drawPrompt(CANVAS_MARGIN, this.getLineYPos(this.getOutputLineNum()));}

		public clearScreen(): void {
			_DrawingContext.clearRect(0, 0, _Canvas.width, CANVAS_HEIGHT);
			this.prevLines = [];
			this.scroll = 0;
			this.outputBuffer = null;
			this.inputBuffer = null;
			this.cursorPos = 0;
		}

		private handleInput(): string[] {
			while (_KernelInputQueue.getSize() > 0) {
				// Get the next character from the kernel input queue.
				const chr: string = _KernelInputQueue.dequeue();
				//only handle the input if it's enabled. all characters entered will be discarded
				if (!this.inputEnabled && chr !== String.fromCharCode(3)) {continue;}
				// Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
				switch (chr) {
					case String.fromCharCode(-1): // left arrow - move cursor left 1 character
						//TODO move cursor left 1
						break;
					case String.fromCharCode(-2): // up arrow - previous command in history
						if (this.shellHistoryIndex === 0) {break;}
						this.shellHistoryIndex--;
						this.eraseInput();
						this.inputBuffer = this.shellHistory[this.shellHistoryIndex];
						this.cursorPos = this.inputBuffer.length;
						this.redrawInput();
						break;
					case String.fromCharCode(-3): // right arrow - move cursor right 1 character
						//TODO move cursor right 1
						break;
					case String.fromCharCode(-4): // down arrow - next command in history
						if (this.shellHistoryIndex === this.shellHistory.length) {break;}
						this.shellHistoryIndex++;
						this.eraseInput();
						if (this.shellHistoryIndex === this.shellHistory.length) {
							this.drawPrompt(CANVAS_MARGIN, this.getLineYPos(this.getInputLineNum()));
							break;
						}
						this.inputBuffer = this.shellHistory[this.shellHistoryIndex];
						this.cursorPos = this.inputBuffer.length;
						this.redrawInput();
						break;
					case String.fromCharCode(-5): // insert
						this.insert = !this.insert;
						break
					case String.fromCharCode(-6): // move cursor to end of line
						//TODO move cursor to end of line
						break;
					case String.fromCharCode(-7): // move cursor to beginning of line
						//TODO move cursor to beginning of line
						break;
					case String.fromCharCode(-8): // page up
						this.scrollBy(-CANVAS_NUM_LINES);
						this.redrawCanvas();
						break;
					case String.fromCharCode(-9): // page down
						this.scrollBy(CANVAS_NUM_LINES);
						this.redrawCanvas();
						break;
					case String.fromCharCode(-10): // scroll to bottom
						this.scrollBy(Number.MAX_SAFE_INTEGER);
						this.redrawCanvas();
						break;
					case String.fromCharCode(-11): // scroll to top
						this.scrollBy(-this.scroll);
						this.redrawCanvas();
						break;
					case String.fromCharCode(-12): // scroll up one line
						this.scrollBy(-1);
						this.redrawCanvas();
						break;
					case String.fromCharCode(-13): // scroll down one line
						this.scrollBy(1);
						this.redrawCanvas();
						break;
					case String.fromCharCode(3): // ctrl + c
						//Only kill if synchronous
						if (_Scheduler.currPCB && _OsShell.pidsWaitingOn.some((item: {pid: number, connector: string | null}): boolean => {
							return _Scheduler.currPCB.pid === item.pid;
						})) {
							_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, ExitCode.TERMINATED_BY_CTRL_C]));
						}
						break;
					case String.fromCharCode(8): // backspace
						if (this.cursorPos === 0) {
							break;
						}
						//delete character from buffer
						const input0: string = this.inputBuffer.substring(0, this.cursorPos - 1) + this.inputBuffer.substring(this.cursorPos);
						//redraw
						const cursor0: number = this.cursorPos;
						this.eraseInput();
						this.inputBuffer = input0;
						this.redrawInput();//TODO only redraw the lines that I need to (make it work, then make it fast)
						this.cursorPos = cursor0;
						this.moveCursor(-1);
						break;
					case String.fromCharCode(9): // tab
						let text: string = this.inputBuffer.substring(0, this.cursorPos);
						//Use the last command/argument
						let lastIndex: number = -1;
						let matchedDelimiter: string = "";
						for (const connector of _OsShell.connectors) {
							const index: number = text.lastIndexOf(connector);
							if (index > lastIndex) {
								lastIndex = index;
								matchedDelimiter = connector;
							}
						}
						for (const redirector of _OsShell.redirectors) {
							const index: number = text.lastIndexOf(redirector);
							if (index > lastIndex) {
								lastIndex = index;
								matchedDelimiter = redirector;
							}
						}
						if (lastIndex !== -1) {
							text = text.substring(lastIndex + matchedDelimiter.length);
						}
						//split text by whitespace and keep anything within double quotes as one token.
						//if there's an unmatched quote, everything from that quote to the end of the text is one token
						const regex: RegExp = /"([^"]*)"?|\S+/g;
						const tokens: string[] = [];
						let match: RegExpExecArray;
						while ((match = regex.exec(text)) !== null) {
							if (match[1] !== undefined) {
								// Matched quoted content, keep the quotes
								const quotedString = `"${match[1]}`; // Add back the opening quote
								tokens.push(quotedString);
							} else {
								// Matched a standalone word
								tokens.push(match[0]);
							}
						}
						if (tokens.length === 0) {
							return;
						}
						const complete: boolean = text.endsWith(" ");
						const last_token: number = tokens.length - 1;
						if (tokens.length === 1) {
							if (complete) {
								//Use token 0 as a complete command and display all possible 1st arguments
								const command: ShellCommand | undefined = ShellCommand.COMMAND_LIST.find(cmd => {
									const c: string = cmd.command.toLowerCase();
									return c === tokens[0] || cmd.aliases.includes(tokens[0].toLowerCase());
								});
								if (command === undefined || command.validArgs.length === 0) {return;}
								const isFile: boolean =
									(command.validArgs.length >= 1 &&
										command.validArgs[0].length === 1 &&
										command.validArgs[0][0] === "FILE") ||
									(command.validArgs[command.validArgs.length - 1].length === 1 &&
										command.validArgs[command.validArgs.length - 1][0] === "REPEAT" &&
										command.validArgs[command.validArgs.length - 2][0] === "FILE"
									);
								const input: string = this.inputBuffer;
								this.pushInputToPrev();
								if (isFile) {
									this.print(_DiskController.get_all_files().join("\n"));
								} else {
									this.print(command.validArgs[0].join('\n'));
								}
								this.printInput(input);
							} else {
								//Use token 0 as an incomplete command and autocomplete it
								//Display all possible commands if it can't be autocompleted
								const possCmds: string[] = [];
								for (const cmd of ShellCommand.COMMAND_LIST) {
									if (cmd.command.substring(0, tokens[0].length).toLowerCase() === tokens[0]) {
										possCmds.push(cmd.command);
									}
									for (const alias of cmd.aliases) {
										if (alias.substring(0, tokens[0].length).toLowerCase() === tokens[0]) {
											possCmds.push(alias);
										}
									}
								}
								if (possCmds.length === 1) { // fill the command
									const remainder: string = possCmds[0].substring(tokens[0].length) + " ";
									//if you start writing the command in the wrong case, that's okay, but this won't correct the case you were using.
									//it will just fill in the rest of the command in the correct case
									this.printInput(remainder);
								} else if (possCmds.length > 1) { // print all possible commands
									const input: string = this.inputBuffer;
									this.pushInputToPrev();
									this.print(possCmds.join('\n'));
									this.printInput(input);
								}
							}
						} else {
							const cmd: ShellCommand | undefined = ShellCommand.COMMAND_LIST.find(cmd => {
								const c: string = cmd.command.toLowerCase();
								return c === tokens[0] || cmd.aliases.includes(tokens[0].toLowerCase());
							});
							if (cmd === undefined) {return;}
							const isFile: boolean =
								(cmd.validArgs.length >= last_token &&
									cmd.validArgs[last_token - 1].length === 1 &&
									cmd.validArgs[last_token - 1][0] === "FILE") ||
								(cmd.validArgs[cmd.validArgs.length - 1].length === 1 &&
									cmd.validArgs[cmd.validArgs.length - 1][0] === "REPEAT" &&
									cmd.validArgs[cmd.validArgs.length - 2][0] === "FILE"
								);
							if (!isFile && cmd.validArgs.length < tokens.length - 1) {return;}
							if (complete) {
								//Use token 0 as the command, and tokens[tokens.length - 1] as a complete argument, and display all possible next arguments
								const input: string = this.inputBuffer;
								this.pushInputToPrev();
								if (isFile) {
									this.print(_DiskController.get_all_files().join("\n"));
								} else {
									this.print(cmd.validArgs[tokens.length - 1].join('\n'));
								}
								this.printInput(input);
							} else {
								//Use token 0 as the command, and tokens[tokens.length - 1] as an incomplete argument, and autocomplete it
								//Display all possible arguments if it can't be autocompleted
								let token: string = tokens[last_token].toLowerCase();
								let quoted: boolean = false;
								if (token.startsWith('"')) {
									token = token.substring(1);
									quoted = true;
								}
								if (token.endsWith('"')) {
									token = token.substring(0, token.length - 1);
									quoted = false;
								}
								const possArgs: string[] = [];
								if (isFile) {
									//autocomplete file name
									for (const file of _DiskController.get_all_files()) {
										if (file.substring(0, token.length).toLowerCase() === token) {
											possArgs.push(file)
										}
									}
								} else if (cmd.validArgs.length >= last_token) {
									//autocomplete argument
									for (const arg of cmd.validArgs[last_token - 1]) {
										if (arg.substring(0, token.length).toLowerCase() === token) {
											possArgs.push(arg);
										}
									}
								}
								if (possArgs.length === 1) { // fill the argument
									const remainder: string = possArgs[0].substring(tokens[last_token].length) + (quoted? '" ' : " ");
									//if you start writing the argument in the wrong case, that's okay, but this won't correct the case you were using.
									//it will just fill in the rest of the argument in the correct case
									this.printInput(remainder);
								} else if (possArgs.length > 1) { // print all possible arguments
									const input: string = this.inputBuffer;
									this.pushInputToPrev();
									this.print(possArgs.join('\n'));
									this.printInput(input);
								}
							}
						}
						break;
					case String.fromCharCode(13): // the Enter key (carriage return)
						const input2: string = this.inputBuffer === null? "" : this.inputBuffer;
						this.pushInputToPrev();
						this.cursorPos = 0;
						_OsShell.handleInput(input2);
						if (input2 === "") {break;}
						this.shellHistory.push(input2);
						this.shellHistoryIndex = this.shellHistory.length;
						break;
					case String.fromCharCode(127): // delete
						if (this.cursorPos === this.inputBuffer.length) {
							break;
						}
						//delete character from buffer
						const input1: string = this.inputBuffer.substring(0, this.cursorPos) + this.inputBuffer.substring(this.cursorPos + 1);
						//redraw
						const cursor1: number = this.cursorPos;
						this.eraseInput();
						this.inputBuffer = input1;
						this.redrawInput();//TODO only redraw the lines that I need to (make it work, then make it fast)
						this.cursorPos = cursor1;
						this.moveCursor(0);
						break;
					default: // normal character
						this.printInput(chr);
						break;
				}
			}
			return [this.inputBuffer];
		}

		private pushInputToPrev(): void {
			if (this.outputBuffer !== null) {
				this.prevLines.push(this.outputBuffer);
				this.outputBuffer = null;
			}
			if (this.inputBuffer === null) {return;}
			this.inputBuffer = _OsShell.promptStr + this.inputBuffer;
			this.prevLines = this.prevLines.concat(Console.splitText(this.inputBuffer, this.endPromptXPos()));
			this.inputBuffer = null;
		}

		//I/O interface functions
		output(buffer: string[]): void {this.print(buffer.join(""));}
		input(): string[] {return this.handleInput();}
		error(buffer: string[]): void {
			_DrawingContext.fillStyle = "#bb0000";
			this.print(buffer.join(""));
			_DrawingContext.fillStyle = "#000000";
		}
	}
}