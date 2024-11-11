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
        cursorPos;
        //All previous lines of text in the console.
        prevLines;
        //The buffer for the text being outputted to the console.
        //If it's null, then the outputBuffer doesn't exist yet, and the input line must be redrawn to start outputting text.
        outputBuffer;
        //The input buffer for the text being edited in the current line.
        inputBuffer;
        //This number represents the line number that is rendered at the top of the canvas
        scroll;
        shellHistory;
        shellHistoryIndex;
        inputEnabled;
        //Insert vs type-over
        insert;
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
        init() { this.putPrompt(); }
        getOutputLineNum() { return this.prevLines.length; }
        //Gets the line number of the first input line, or where it would be if it exists.
        getInputLineNum() { return this.prevLines.length + (this.outputBuffer === null ? 0 : 1); }
        getCursorLineNum() {
            const input = Console.splitText(this.inputBuffer, CANVAS_MARGIN + _DrawingContext.measureText(_OsShell.promptStr).width);
            let line = 0;
            let pos = this.cursorPos;
            for (; line < input.length - 1 && this.cursorPos >= input[line].length; line++) {
                pos -= input[line].length;
            }
            return this.getInputLineNum() + line;
        }
        //Returns the Y position of where you can write text on this line.
        getLineYPos(lineNum) { return (lineNum - this.scroll + 1) * (_FontSize + _FontHeightMargin) + CANVAS_MARGIN; }
        //This erases the inputBuffer and the cursorPos, so save it before calling this function if you need to.
        eraseInput() {
            const y = this.getLineYPos(this.getInputLineNum()) - _FontSize;
            const diff = CANVAS_HEIGHT - y;
            if (diff < 0) {
                return;
            }
            _DrawingContext.clearRect(0, y, _Canvas.width, diff);
            this.inputBuffer = "";
            this.cursorPos = 0;
        }
        //Positive is right, negative is left
        moveCursor(chars) {
            this.cursorPos += chars;
            if (this.cursorPos < 0) {
                this.cursorPos = 0;
            }
            else if (this.cursorPos > this.inputBuffer.length) {
                this.cursorPos = this.inputBuffer.length;
            }
            let scrolled = false;
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
        scrollBy(lines) {
            this.scroll += lines;
            if (this.scroll < 0) {
                this.scroll = 0;
            }
            else {
                const lastLine = this.getInputLineNum() + Console.splitText(this.inputBuffer, CANVAS_MARGIN + _DrawingContext.measureText(_OsShell.promptStr).width).length - 1;
                if (this.scroll >= lastLine) {
                    this.scroll = lastLine;
                }
            }
        }
        redrawCanvas() {
            //Don't call this.clearScreen() since we want to save buffer and cursor data
            _DrawingContext.clearRect(0, 0, _Canvas.width, CANVAS_HEIGHT);
            //render previous lines
            const lastPrevLine = Math.min(CANVAS_NUM_LINES + this.scroll + 1, this.prevLines.length);
            let currLineNum = this.scroll;
            for (; currLineNum < lastPrevLine; currLineNum++) {
                const lineYPos = this.getLineYPos(currLineNum);
                _DrawingContext.fillText(this.prevLines[currLineNum - this.scroll], CANVAS_MARGIN, lineYPos);
            }
            if (currLineNum - this.scroll > CANVAS_NUM_LINES) {
                return;
            }
            if (this.outputBuffer !== null) {
                //render output buffer
                //we can't call this.print() since we don't want to automatically scroll when we draw too much text
                _DrawingContext.fillText(this.outputBuffer, CANVAS_MARGIN, this.getLineYPos(currLineNum));
                currLineNum++;
            }
            if (currLineNum - this.scroll > CANVAS_NUM_LINES || this.inputBuffer === null) {
                return;
            }
            //render prompt and first input line
            //we can't call this.printInput() since we don't want to automatically scroll when we draw too much text
            const input = Console.splitText(this.inputBuffer, _DrawingContext.measureText(_OsShell.promptStr).width);
            _DrawingContext.fillText(_OsShell.promptStr + (this.inputBuffer.length > 0 ? input[0] : ""), CANVAS_MARGIN, this.getLineYPos(currLineNum));
            currLineNum++;
            //render input buffer on next lines
            for (let i = 1; currLineNum <= CANVAS_NUM_LINES + this.scroll && i < this.inputBuffer.length; currLineNum++) {
                _DrawingContext.fillText(input[i], CANVAS_MARGIN, this.getLineYPos(currLineNum));
                i++;
            }
            if (this.cursorPos > this.inputBuffer.length) {
                this.cursorPos = this.inputBuffer.length;
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
                const width = _DrawingContext.measureText(char).width;
                if (xPos + width >= _Canvas.width - (2 * CANVAS_MARGIN)) {
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
                newYPos -= _FontSize + _FontHeightMargin;
            }
            this.redrawCanvas();
            return currYPos;
        }
        //Print output text only, not used for displaying input text
        print(text) {
            //Get the coordinates of where we start drawing
            const outputXPos = CANVAS_MARGIN + (this.outputBuffer === null ? 0 : _DrawingContext.measureText(this.outputBuffer).width);
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
                    _DrawingContext.fillText(line, xPos, yPos);
                    xPos = CANVAS_MARGIN;
                    yPos = this.advanceLine(yPos);
                }
                //Put the prompt back
                const newPos = this.drawPrompt(xPos, yPos);
                xPos = newPos.xPos;
                yPos = newPos.yPos;
                //Put the input text back
                _DrawingContext.fillText(prevInput[0], xPos, yPos);
                for (let line = 1; line < prevInput.length; line++) {
                    xPos = CANVAS_MARGIN;
                    yPos = this.advanceLine(yPos);
                    _DrawingContext.fillText(prevInput[line], xPos, yPos);
                }
                this.cursorPos = prevCursor;
                this.inputBuffer = prevInput;
            }
            else {
                let xPos = outputXPos;
                let yPos = outputYPos;
                //Start printing output text
                _DrawingContext.fillText(textLines[0], xPos, yPos);
                for (let line = 1; line < textLines.length; line++) {
                    xPos = CANVAS_MARGIN;
                    yPos = this.advanceLine(yPos);
                    _DrawingContext.fillText(textLines[line], xPos, yPos);
                }
            }
        }
        getCursorPos() {
            const input = Console.splitText(this.inputBuffer, CANVAS_MARGIN + _DrawingContext.measureText(_OsShell.promptStr).width);
            let line = 0;
            let pos = this.cursorPos;
            for (; line < input.length - 1 && this.cursorPos >= input[line].length; line++) {
                pos -= input[line].length;
            }
            return {
                x: CANVAS_MARGIN +
                    (line === 0 ? _DrawingContext.measureText(_OsShell.promptStr).width : 0) +
                    (input.length > 0 ? _DrawingContext.measureText(input[line].substring(0, this.cursorPos)).width : 0),
                y: this.getLineYPos(this.getInputLineNum() + line)
            };
        }
        printInput(text) {
            if (this.inputBuffer === null) {
                //new text
                this.eraseInput();
                this.inputBuffer = text;
                this.redrawInput();
                this.cursorPos = 0;
                this.moveCursor(text.length);
            }
            else if (this.cursorPos === this.inputBuffer.length) {
                //when the cursor is at the very end
                const newInputText = Console.splitText(this.inputBuffer + text, _DrawingContext.measureText(_OsShell.promptStr).width);
                const cursorPos = this.getCursorPos();
                let line = 0;
                let pos = this.cursorPos;
                for (; line < newInputText.length - 1 && this.cursorPos >= newInputText[line].length; line++) {
                    pos -= newInputText[line].length;
                    line++;
                }
                _DrawingContext.fillText(newInputText[line].substring(pos), cursorPos.x, cursorPos.y);
                line++;
                for (; line < newInputText.length; line++) {
                    cursorPos.x = CANVAS_MARGIN;
                    cursorPos.y = this.advanceLine(cursorPos.y);
                    _DrawingContext.fillText(newInputText[line], cursorPos.x, cursorPos.y);
                }
                this.inputBuffer = newInputText.join("");
                this.moveCursor(text.length);
            }
            else {
                //all other cases
                const oldInputText = Console.splitText(this.inputBuffer, _DrawingContext.measureText(_OsShell.promptStr).width);
                const newInputText = Console.splitText(this.inputBuffer.substring(0, this.cursorPos) + text + this.inputBuffer.substring(this.cursorPos + (this.insert ? 0 : text.length)), _DrawingContext.measureText(_OsShell.promptStr).width);
                let line = this.getCursorLineNum();
                const startLine = line + (newInputText[line] === newInputText[line] ? 1 : 0);
                //exclusive
                let endLine = newInputText.length;
                for (let l = startLine; l < oldInputText.length; l++) {
                    if (oldInputText[l] === newInputText[l]) {
                        endLine = l;
                        break;
                    }
                }
                //scroll if necessary
                let y0 = this.getLineYPos(this.getInputLineNum() + startLine) - _FontSize;
                let y1 = this.getLineYPos(this.getInputLineNum() + endLine);
                let scrolled = false;
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
                let xPos = CANVAS_MARGIN;
                let yPos = this.getLineYPos(startLine);
                //draw prompt if necessary
                if (startLine === 0) {
                    this.drawPrompt(CANVAS_MARGIN, yPos);
                    xPos += _DrawingContext.measureText(_OsShell.promptStr).width;
                }
                _DrawingContext.fillText(newInputText[startLine], xPos, yPos);
                for (let line = startLine + 1; line < endLine; line++) {
                    xPos = CANVAS_MARGIN;
                    yPos = this.advanceLine(yPos);
                    _DrawingContext.fillText(newInputText[line], xPos, yPos);
                }
                this.inputBuffer = newInputText.join("");
                this.moveCursor(text.length);
            }
        }
        redrawInput() {
            let xPos = CANVAS_MARGIN;
            let yPos = this.getLineYPos(this.getInputLineNum());
            //Put the prompt back
            const newPos = this.drawPrompt(xPos, yPos);
            xPos = newPos.xPos;
            yPos = newPos.yPos;
            //Put the input text back
            const input = Console.splitText(this.inputBuffer, _DrawingContext.measureText(_OsShell.promptStr).width);
            _DrawingContext.fillText(input[0], xPos, yPos);
            for (let i = 1; i < input.length - 1; i++) {
                xPos = CANVAS_MARGIN;
                yPos = this.advanceLine(yPos);
                _DrawingContext.fillText(input[i], xPos, yPos);
            }
            this.moveCursor(0); //if the cursor is beyond the text area, this will move it back to the end
        }
        drawPrompt(xPos, yPos) {
            const promptLines = Console.splitText(_OsShell.promptStr, xPos);
            for (let i = 0; i < promptLines.length - 1; i++) {
                _DrawingContext.fillText(promptLines[i], xPos, yPos);
                xPos = CANVAS_MARGIN;
                yPos = this.advanceLine(yPos);
            }
            _DrawingContext.fillText(promptLines[promptLines.length - 1], xPos, yPos);
            xPos += _DrawingContext.measureText(promptLines[promptLines.length - 1]).width;
            this.inputBuffer = "";
            return { xPos, yPos };
        }
        putPrompt() { this.drawPrompt(CANVAS_MARGIN, this.getLineYPos(this.getInputLineNum())); }
        clearScreen() {
            _DrawingContext.clearRect(0, 0, _Canvas.width, CANVAS_HEIGHT);
            this.prevLines = [];
            this.outputBuffer = null;
            this.inputBuffer = null;
            this.cursorPos = 0;
        }
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
                        this.inputBuffer = this.shellHistory[this.shellHistoryIndex];
                        this.redrawInput();
                        break;
                    case String.fromCharCode(-2): // down arrow
                        if (this.shellHistoryIndex === this.shellHistory.length) {
                            break;
                        }
                        this.shellHistoryIndex++;
                        this.eraseInput();
                        if (this.shellHistoryIndex === this.shellHistory.length) {
                            this.drawPrompt(CANVAS_MARGIN, this.getLineYPos(this.getInputLineNum()));
                            break;
                        }
                        this.inputBuffer = this.shellHistory[this.shellHistoryIndex];
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
                        if (this.cursorPos === 0) {
                            break;
                        }
                        //delete character from buffer
                        const input0 = this.inputBuffer.substring(0, this.cursorPos - 1) + this.inputBuffer.substring(this.cursorPos);
                        //redraw
                        const cursor0 = this.cursorPos;
                        this.eraseInput();
                        this.inputBuffer = input0;
                        this.redrawInput(); //TODO only redraw the lines that I need to (make it work, then make it fast)
                        this.cursorPos = cursor0;
                        this.moveCursor(-1);
                        break;
                    case String.fromCharCode(9): // tab
                        let text = this.inputBuffer.substring(0, this.cursorPos);
                        //Use the last command/argument
                        let lastIndex = -1;
                        let matchedDelimiter = "";
                        for (const connector of _OsShell.connectors) {
                            const index = text.lastIndexOf(connector);
                            if (index > lastIndex) {
                                lastIndex = index;
                                matchedDelimiter = connector;
                            }
                        }
                        for (const redirector of _OsShell.redirectors) {
                            const index = text.lastIndexOf(redirector);
                            if (index > lastIndex) {
                                lastIndex = index;
                                matchedDelimiter = redirector;
                            }
                        }
                        if (lastIndex !== -1) {
                            text = text.substring(lastIndex + matchedDelimiter.length);
                        }
                        const tokens = text.trim().split(/\s+/); //split by 1 or more spaces
                        if (tokens.length == 1) {
                            if (!text.endsWith(' ')) {
                                //Use token 0 as complete command and display all possible 1st arguments
                                const command = TSOS.ShellCommand.COMMAND_LIST.find(cmd => { return cmd.command === tokens[0]; });
                                if (command === undefined || command.validArgs.length === 0) {
                                    return;
                                }
                                const input = this.inputBuffer;
                                this.pushInputToPrev();
                                this.print(command.validArgs.join('\n'));
                                this.printInput(input);
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
                                    this.printInput(input);
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
                                this.printInput(input);
                            }
                        }
                        break;
                    case String.fromCharCode(13): // the Enter key (carriage return)
                        const input2 = this.inputBuffer === null ? "" : this.inputBuffer;
                        this.pushInputToPrev();
                        _OsShell.handleInput(input2);
                        this.shellHistory.push(input2);
                        this.shellHistoryIndex = this.shellHistory.length;
                        break;
                    case String.fromCharCode(127): // delete
                        if (this.cursorPos === this.inputBuffer.length) {
                            break;
                        }
                        //delete character from buffer
                        const input1 = this.inputBuffer.substring(0, this.cursorPos) + this.inputBuffer.substring(this.cursorPos + 1);
                        //redraw
                        const cursor1 = this.cursorPos;
                        this.eraseInput();
                        this.inputBuffer = input1;
                        this.redrawInput(); //TODO only redraw the lines that I need to (make it work, then make it fast)
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
        pushInputToPrev() {
            if (this.outputBuffer !== null) {
                this.prevLines.push(this.outputBuffer);
                this.outputBuffer = null;
            }
            if (this.inputBuffer === null) {
                return;
            }
            this.inputBuffer = _OsShell.promptStr + this.inputBuffer;
            this.prevLines = this.prevLines.concat(Console.splitText(this.inputBuffer, _DrawingContext.measureText(_OsShell.promptStr).width));
            this.inputBuffer = null;
        }
        //I/O interface functions
        output(buffer) { this.print(buffer.join("")); }
        input() { return this.handleInput(); }
        error(buffer) { this.print(buffer.join("")); }
    }
    TSOS.Console = Console;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=console.js.map