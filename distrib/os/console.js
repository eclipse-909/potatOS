/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */
var TSOS;
(function (TSOS) {
    //TODO remake the entire console
    class Console {
        //Index of the character in the input buffer that this cursor precedes in insert mode,
        //or the index of the character that this cursor will replace in type-over mode.
        //0 represents the cursor being at the very beginning.
        //this.inputBuffer.length represents the cursor being at the very end.
        //Line represents the line number of the input buffer.
        cursorPos;
        //All previous lines of text in the console.
        prevLines;
        //The buffer for the text being outputted to the console.
        //If it's null, then the outputBuffer doesn't exist yet, and the input line must be redrawn to start outputting text.
        outputBuffer;
        //The input buffer for the text being edited in the current line.
        //Each string in the array represents a line. This is because there might be line wrap while entering a command.
        //If it's null, then that means input is disabled and there is no prompt string.
        inputBuffer;
        //This number represents the line number that is rendered at the top of the canvas
        scroll;
        shellHistory;
        shellHistoryIndex;
        inputEnabled;
        //Insert vs type-over
        insert;
        constructor() {
            this.cursorPos = { line: 0, charIndex: 0 };
            this.prevLines = [];
            this.outputBuffer = null;
            this.inputBuffer = [""];
            this.scroll = 0;
            this.shellHistory = [];
            this.shellHistoryIndex = 0;
            this.inputEnabled = true;
            this.insert = true;
        }
        init() {
            this.clearScreen();
            this.drawPrompt(CANVAS_MARGIN, CANVAS_MARGIN);
        }
        getOutputLineNum() { return this.prevLines.length; }
        //Gets the line number of the first input line, or where it would be if it exists.
        getInput0LineNum() { return this.prevLines.length + (this.outputBuffer === null ? 0 : 1); }
        getLineYPos(lineNum) { return (lineNum - this.scroll) * (_FontSize + _FontHeightMargin) + CANVAS_MARGIN - _FontHeightMargin; }
        //This erases the inputBuffer and the cursorPos, so save it before calling this function if you need to.
        eraseInput() {
            const y = this.getLineYPos(this.getInput0LineNum()) - _FontSize;
            const diff = CANVAS_HEIGHT - y;
            if (diff < 0) {
                return;
            }
            _DrawingContext.clearRect(0, y, _Canvas.width, diff);
            this.inputBuffer = [""];
            this.cursorPos = { line: 0, charIndex: 0 };
        }
        //Positive is right, negative is left
        moveCursor(chars) {
            this.cursorPos.charIndex += chars;
            while (this.cursorPos.charIndex < 0) {
                this.cursorPos.line--;
                if (this.cursorPos.line < 0) {
                    this.cursorPos.line = 0;
                    this.cursorPos.charIndex = 0;
                }
                else {
                    this.cursorPos.charIndex += this.inputBuffer[this.cursorPos.line].length;
                }
            }
            while (this.cursorPos.charIndex >= this.inputBuffer[this.cursorPos.line].length && this.cursorPos.line < this.inputBuffer.length) {
                this.cursorPos.line++;
                if (this.cursorPos.line >= this.inputBuffer.length) {
                    this.cursorPos.line = this.inputBuffer.length - 1;
                    this.cursorPos.charIndex = this.inputBuffer[this.cursorPos.line].length;
                }
                else {
                    this.cursorPos.charIndex -= this.inputBuffer[this.cursorPos.line].length;
                }
            }
        }
        //Positive scrolls down (text moves up), negative scrolls up (text moves down).
        scrollBy(lines) {
            if (lines === 0) {
                return;
            }
            this.scroll += lines;
            if (this.scroll < 0) {
                this.scroll = 0;
            }
            else if (this.scroll >= this.getOutputLineNum()) {
                this.scroll = this.getOutputLineNum();
            }
            this.redrawCanvas();
        }
        redrawCanvas() {
            //Don't call this.clearScreen() since we want to save buffer and cursor data
            _DrawingContext.clearRect(0, 0, _Canvas.width, CANVAS_HEIGHT);
            //render previous lines
            const lastPrevLine = Math.min(CANVAS_NUM_LINES + this.scroll + 1, this.prevLines.length);
            let currLineNum = this.scroll;
            for (; currLineNum < lastPrevLine; currLineNum++) {
                const lineYPos = this.getLineYPos(currLineNum);
                _DrawingContext.drawText(this.prevLines[currLineNum - this.scroll], CANVAS_MARGIN, lineYPos);
            }
            if (currLineNum - this.scroll > CANVAS_NUM_LINES) {
                return;
            }
            if (this.outputBuffer !== null) {
                //render output buffer
                //we can't call this.print() since we don't want to automatically scroll when we draw too much text
                _DrawingContext.drawText(this.outputBuffer, CANVAS_MARGIN, this.getLineYPos(currLineNum));
                currLineNum++;
            }
            if (currLineNum - this.scroll > CANVAS_NUM_LINES || this.inputBuffer === null) {
                return;
            }
            //render prompt and first input line
            //we can't call this.printInput() since we don't want to automatically scroll when we draw too much text
            _DrawingContext.drawText(_OsShell.promptStr + (this.inputBuffer.length > 0 ? this.inputBuffer[0] : ""), CANVAS_MARGIN, this.getLineYPos(currLineNum));
            currLineNum++;
            //render input buffer on next lines
            const lastInputLine = Math.min(CANVAS_NUM_LINES + this.scroll + 1, this.inputBuffer.length);
            for (let i = 1; currLineNum < lastInputLine && i < this.inputBuffer.length; currLineNum++) {
                const lineYPos = this.getLineYPos(currLineNum);
                _DrawingContext.drawText(this.inputBuffer[i], CANVAS_MARGIN, lineYPos);
                i++;
            }
            if (this.cursorPos.charIndex > this.inputBuffer[this.inputBuffer.length - 1].length) {
                this.cursorPos.charIndex = this.inputBuffer[this.inputBuffer.length - 1].length;
            }
        }
        //startXPos should usually be CANVAS_MARGIN + the width of any exising text (like the prompt).
        static splitText(text, startXPos) {
            let lines = [""];
            let xPos = startXPos;
            for (const char of text) {
                if (char === '\r' || char === '\n') {
                    lines.push("");
                    xPos = CANVAS_MARGIN;
                    continue;
                }
                const width = _DrawingContext.measureText(char);
                if (xPos + width >= _Canvas.width - CANVAS_MARGIN) {
                    lines.push(char);
                    xPos = CANVAS_MARGIN;
                }
                else {
                    lines[lines.length - 1] += char;
                    xPos += width;
                }
            }
            return lines;
        }
        //Returns the new Y position to start drawing from.
        //Scrolls the text up as many lines as necessary.
        advanceLine(currYPos) {
            let newYPos = currYPos + _FontSize + _FontHeightMargin;
            if (newYPos < CANVAS_HEIGHT - CANVAS_MARGIN) {
                return newYPos;
            }
            while (newYPos >= CANVAS_HEIGHT - CANVAS_MARGIN) {
                this.scrollBy(1);
            }
            return currYPos;
        }
        //Print output text only, not used for displaying input text
        print(text) {
            if (text === "") {
                return;
            }
            //Get the coordinates of where we start drawing
            const outputXPos = CANVAS_MARGIN + (this.outputBuffer === null ? 0 : _DrawingContext.measureText(this.outputBuffer));
            const outputYPos = this.getLineYPos(this.getOutputLineNum());
            //split text into the lines by how it will be rendered with line wrap
            const textLines = Console.splitText(text, outputXPos);
            for (let i = 0; i < textLines.length - 1; i++) {
                this.prevLines.push(textLines[i]);
            }
            text = textLines[textLines.length - 1];
            if (this.outputBuffer === null) {
                this.outputBuffer = text;
            }
            else {
                this.outputBuffer += text;
            }
            if (this.inputBuffer !== null) {
                //save input text and cursor position
                const prevCursor = this.cursorPos;
                const prevInput = this.inputBuffer;
                this.eraseInput();
                let xPos = outputXPos;
                let yPos = outputYPos;
                //Start printing output text
                for (const line of textLines) {
                    _DrawingContext.drawText(line, xPos, yPos);
                    xPos = CANVAS_MARGIN;
                    yPos = this.advanceLine(yPos);
                }
                //Put the prompt back
                const newPos = this.drawPrompt(xPos, yPos);
                xPos = newPos.xPos;
                yPos = newPos.yPos;
                //Put the input text back
                for (let i = 0; i < prevInput.length - 1; i++) {
                    _DrawingContext.drawText(prevInput[i], xPos, yPos);
                    xPos = CANVAS_MARGIN;
                    yPos = this.advanceLine(yPos);
                }
                _DrawingContext.drawText(prevInput[prevInput.length - 1], xPos, yPos);
                this.cursorPos = prevCursor;
                this.inputBuffer = prevInput;
            }
            else {
                let xPos = outputXPos;
                let yPos = outputYPos;
                //Start printing output text
                for (const line of textLines) {
                    _DrawingContext.drawText(line, xPos, yPos);
                    xPos = CANVAS_MARGIN;
                    yPos = this.advanceLine(yPos);
                }
            }
        }
        printInput(text) {
            const secondHalf = this.inputBuffer[this.cursorPos.line].substring(this.cursorPos.charIndex) + this.inputBuffer.slice(this.cursorPos.line + 1).join();
            const newInputText = Console.splitText(this.inputBuffer
                .slice(0, this.cursorPos.line)
                .join() +
                this.inputBuffer[this.cursorPos.line]
                    .substring(0, this.cursorPos.charIndex) +
                text +
                (this.insert ? secondHalf : secondHalf.substring(text.length)), _DrawingContext.measureText(_OsShell.promptStr));
            const cursor = this.cursorPos;
            this.eraseInput();
            this.inputBuffer = newInputText;
            this.redrawInput();
            this.cursorPos = cursor;
            this.moveCursor(text.length);
            _DrawingContext.drawText();
        }
        redrawInput() {
            let xPos = CANVAS_MARGIN;
            let yPos = this.getLineYPos(this.getInput0LineNum());
            //Put the prompt back
            const newPos = this.drawPrompt(xPos, yPos);
            xPos = newPos.xPos;
            yPos = newPos.yPos;
            //Put the input text back
            for (let i = 0; i < this.inputBuffer.length - 1; i++) {
                _DrawingContext.drawText(this.inputBuffer[i], xPos, yPos);
                xPos = CANVAS_MARGIN;
                yPos = this.advanceLine(yPos);
            }
            _DrawingContext.drawText(this.inputBuffer[this.inputBuffer.length - 1], xPos, yPos);
            this.moveCursor(0); //if the cursor is beyond the text area, this will move it back to the end
        }
        drawPrompt(xPos, yPos) {
            const promptLines = Console.splitText(_OsShell.promptStr, xPos);
            for (let i = 0; i < promptLines.length - 1; i++) {
                _DrawingContext.drawText(promptLines[i], xPos, yPos);
                xPos = CANVAS_MARGIN;
                yPos = this.advanceLine(yPos);
            }
            _DrawingContext.drawText(promptLines[promptLines.length - 1], xPos, yPos);
            xPos += _DrawingContext.measureText(promptLines[promptLines.length - 1]);
            return { xPos, yPos };
        }
        putPrompt() { this.drawPrompt(CANVAS_MARGIN, this.getLineYPos(this.getInput0LineNum())); }
        clearScreen() {
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
        handleInput() {
            while (_KernelInputQueue.getSize() > 0) {
                // Get the next character from the kernel input queue.
                const chr = _KernelInputQueue.dequeue();
                //only handle the input if it's enabled. all characters entered will be discarded
                if (!this.inputEnabled && chr !== String.fromCharCode(3)) {
                    continue;
                }
                // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
                switch (chr) {
                    case String.fromCharCode(-1): // up arrow
                        if (this.shellHistoryIndex === 0) {
                            break;
                        }
                        this.shellHistoryIndex--;
                        this.eraseInput();
                        this.inputBuffer = Console.splitText(this.shellHistory[this.shellHistoryIndex], _DrawingContext.measureText(_OsShell.promptStr));
                        this.redrawInput();
                        break;
                    case String.fromCharCode(-2): // down arrow
                        if (this.shellHistoryIndex === this.shellHistory.length) {
                            break;
                        }
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
                        break;
                    case String.fromCharCode(3): // ctrl + c
                        //Only kill if synchronous
                        if (_Scheduler.currPCB && _OsShell.pidsWaitingOn.some((item) => {
                            return _Scheduler.currPCB.pid === item.pid;
                        })) {
                            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.TERMINATED_BY_CTRL_C]));
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
                        const input0 = Console.splitText(this.inputBuffer.join(), _DrawingContext.measureText(_OsShell.promptStr));
                        //redraw
                        this.eraseInput();
                        this.inputBuffer = input0;
                        this.redrawInput();
                        break;
                    case String.fromCharCode(9): // tab
                        let currLine = this.inputBuffer[this.cursorPos.line].substring(0, this.cursorPos.charIndex);
                        //Use the last command/argument
                        let lastIndex = -1;
                        let matchedDelimiter = "";
                        for (const connector of _OsShell.connectors) {
                            const index = currLine.lastIndexOf(connector);
                            if (index > lastIndex) {
                                lastIndex = index;
                                matchedDelimiter = connector;
                            }
                        }
                        for (const redirector of _OsShell.redirectors) {
                            const index = currLine.lastIndexOf(redirector);
                            if (index > lastIndex) {
                                lastIndex = index;
                                matchedDelimiter = redirector;
                            }
                        }
                        if (lastIndex !== -1) {
                            currLine = currLine.substring(lastIndex + matchedDelimiter.length);
                        }
                        const tokens = currLine.trim().split(/\s+/); //split by 1 or more spaces
                        if (tokens.length == 1) {
                            if (!currLine.endsWith(' ')) {
                                //Use token 0 as complete command and display all possible 1st arguments
                                const command = TSOS.ShellCommand.COMMAND_LIST.find(cmd => { return cmd.command === tokens[0]; });
                                if (command === undefined || command.validArgs.length === 0) {
                                    return;
                                }
                                const input = this.inputBuffer;
                                this.pushInputToPrev();
                                this.print(command.validArgs.join('\n'));
                                this.printInput(input.join());
                            }
                            else {
                                //Sse token 0 as incomplete command and autocomplete it
                                tokens[0] = tokens[0].toLowerCase();
                                const possCmds = [];
                                for (const cmd of TSOS.ShellCommand.COMMAND_LIST) {
                                    if (cmd.command.substring(0, tokens[0].length).toLowerCase() === tokens[0]) {
                                        possCmds.push(cmd.command);
                                    }
                                }
                                if (possCmds.length === 1) { // fill the command
                                    const remainder = possCmds[0].substring(tokens[0].length) + " ";
                                    //if you start writing the command in the wrong case, that's okay, but this won't correct the case you were using.
                                    //it will just fill in the rest of the command in the correct case
                                    this.printInput(remainder);
                                }
                                else if (possCmds.length > 1) { // print all possible commands
                                    const input = this.inputBuffer;
                                    this.pushInputToPrev();
                                    this.print(possCmds.join('\n'));
                                    this.printInput(input.join());
                                }
                            }
                        }
                        else if (tokens.length === 2) {
                            //Use token 0 as the command and token 1 as an incomplete first argument for that command, and then autocomplete the argument
                            const cmd = TSOS.ShellCommand.COMMAND_LIST.find(c => { return c.command === tokens[0]; });
                            if (cmd === undefined || cmd.validArgs.length === 0) {
                                return;
                            }
                            tokens[1] = tokens[1].toLowerCase();
                            const possArgs = [];
                            for (const arg of cmd.validArgs) {
                                if (arg.substring(0, tokens[1].length).toLowerCase() === tokens[1]) {
                                    possArgs.push(arg);
                                }
                            }
                            if (possArgs.length === 1) { // fill the argument
                                const remainder = possArgs[0].substring(tokens[1].length) + " ";
                                //if you start writing the argument in the wrong case, that's okay, but this won't correct the case you were using.
                                //it will just fill in the rest of the argument in the correct case
                                this.printInput(remainder);
                            }
                            else if (possArgs.length > 1) { // print all possible arguments
                                const input = this.inputBuffer;
                                this.pushInputToPrev();
                                this.print(possArgs.join('\n'));
                                this.printInput(input.join());
                            }
                        }
                        break;
                    case String.fromCharCode(13): // the Enter key (carriage return)
                        const input2 = this.inputBuffer.join();
                        _OsShell.handleInput(input2);
                        this.shellHistory.push(input2);
                        this.shellHistoryIndex = this.shellHistory.length;
                        this.pushInputToPrev();
                        break;
                    case String.fromCharCode(127): // delete
                        //wrap cursor if necessary
                        let line = this.cursorPos.line; //copy line and charIndex because we need to handle line wrap without moving the cursor
                        let charIndex = this.cursorPos.charIndex;
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
                        const input1 = Console.splitText(this.inputBuffer.join(), _DrawingContext.measureText(_OsShell.promptStr));
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
        pushInputToPrev() {
            this.prevLines.push(this.outputBuffer);
            this.outputBuffer = null;
            this.inputBuffer[0] = _OsShell.promptStr + this.inputBuffer[0];
            this.prevLines.concat(this.inputBuffer);
            this.inputBuffer = null;
        }
        //I/O interface functions
        output(buffer) { this.print(buffer.join()); }
        input() { return this.handleInput(); }
        error(buffer) { this.print(buffer.join()); }
    }
    TSOS.Console = Console;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=console.js.map