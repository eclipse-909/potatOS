/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

module TSOS {

	export class Console {

		constructor(public currentFont = _DefaultFontFamily,
		            public currentFontSize = _DefaultFontSize,
		            public currentXPosition = 0,
		            public currentYPosition = _DefaultFontSize,
		            public buffer = "",
		            public shellHistory: string[] = [],
					public shellHistoryIndex: number = 0) {
		}

		public init(): void {
			this.clearScreen();
			this.resetXY();
		}

		public clearScreen(): void {
			_DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
		}

		public resetXY(): void {
			this.currentXPosition = 0;
			this.currentYPosition = this.currentFontSize;
		}

		//Clears the text of the current prompt
		clearPrompt(): void {
			const xSize = _DrawingContext.measureText(this.currentFont, this.currentFontSize, this.buffer);
			const xStartPos = this.currentXPosition - xSize;
			_DrawingContext.clearRect(xStartPos, this.currentYPosition - _DefaultFontSize, xSize, _DefaultFontSize + 5);
			this.currentXPosition = xStartPos;
			this.buffer = "";
		}

		public handleInput(): void {
			while (_KernelInputQueue.getSize() > 0) {
				// Get the next character from the kernel input queue.
				const chr = _KernelInputQueue.dequeue();
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
						// TODO: Add a case for Ctrl-C that would allow the user to terminate the current program.
						break;
					case String.fromCharCode(8): // backspace
						const xSize = _DrawingContext.measureText(this.currentFont, this.currentFontSize, this.buffer.charAt(this.buffer.length - 1));
						const xStartPos = this.currentXPosition - xSize;
						_DrawingContext.clearRect(xStartPos, this.currentYPosition - _DefaultFontSize, xSize, _DefaultFontSize + 5);
						this.currentXPosition = xStartPos;
						this.buffer = this.buffer.slice(0, -1);
						break;
					case String.fromCharCode(9): // tab
						const tokens: string[] = this.buffer.split(/\s+/);//split by 1 or more spaces
						if (tokens.length !== 1) {break;}
						const token: string = tokens[0];
						const possCmds: string[] = [];
						for (const cmd of _OsShell.commandList) {
							if (cmd.command.substring(0, token.length) === token) {
								possCmds.push(cmd.command);
							}
						}
						if (possCmds.length === 1) { // fill the command
							const remainder: string = possCmds[0].substring(token.length) + " ";
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
						break;
					case String.fromCharCode(13): // the Enter key
						// The enter key marks the end of a console command, so ...
						// ... tell the shell ...
						_OsShell.handleInput(this.buffer);
						this.shellHistory.push(this.buffer);
						this.shellHistoryIndex = this.shellHistory.length;
						// ... and reset our buffer.
						this.buffer = "";
						break;
					default:
						// This is a "normal" character, so ...
						// ... draw it on the screen...
						this.putText(chr);
						// ... and add it to our buffer.
						this.buffer += chr;
						break;
				}
			}
		}

		public putText(text: string): void {
			/*  My first inclination here was to write two functions: putChar() and putString().
				Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
				between the two. (Although TypeScript would. But we're compiling to JavaScipt anyway.)
				So rather than be like PHP and write two (or more) functions that
				do the same thing, thereby encouraging confusion and decreasing readability, I
				decided to write one function and use the term "text" to connote string or char.
			*/
			if (text !== "") {
				// Draw the text at the current X and Y coordinates.
				_DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, text);

				// Move the current X position.

				// This logic has been moved into the _DrawingContext.drawText function above

				//const offset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, text);
				//this.currentXPosition = this.currentXPosition + offset;
			}
		}

		public advanceLine(): void {
			this.currentXPosition = 0;
			/*
			 * Font size measures from the baseline to the highest point in the font.
			 * Font descent measures from the baseline to the lowest point in the font.
			 * Font height margin is extra spacing between the lines.
			 */
			this.currentYPosition += _DefaultFontSize +
				_DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
				_FontHeightMargin;

			//Reference: https://www.labouseur.com/commondocs/operating-systems/LuchiOS/index.html
			if (this.currentYPosition > _Canvas.height) {
				let offset = this.currentYPosition - _Canvas.height + _FontHeightMargin;
				let screenData = _DrawingContext.getImageData(0, 0, _Canvas.width, this.currentYPosition + _FontHeightMargin);
				this.clearScreen();
				_DrawingContext.putImageData(screenData, 0, -offset);
				this.currentYPosition -= offset;
			}
		}
	}
}