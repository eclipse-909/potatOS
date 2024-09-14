/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */
var TSOS;
(function (TSOS) {
    class Console {
        currentFont;
        currentFontSize;
        currentXPosition;
        currentYPosition;
        buffer;
        shellHistory;
        shellHistoryIndex;
        inputEnabled;
        constructor(currentFont = _DefaultFontFamily, currentFontSize = _DefaultFontSize, currentXPosition = 0, currentYPosition = _DefaultFontSize, buffer = "", shellHistory = [], shellHistoryIndex = 0, inputEnabled = true) {
            this.currentFont = currentFont;
            this.currentFontSize = currentFontSize;
            this.currentXPosition = currentXPosition;
            this.currentYPosition = currentYPosition;
            this.buffer = buffer;
            this.shellHistory = shellHistory;
            this.shellHistoryIndex = shellHistoryIndex;
            this.inputEnabled = inputEnabled;
        }
        init() {
            this.clearScreen();
            this.resetXY();
        }
        clearScreen() {
            _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
        }
        resetXY() {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
        }
        //Clears the line, including the prompt
        clearLine() {
            _DrawingContext.clearRect(0, this.currentYPosition - _DefaultFontSize, _DrawingContext.measureText(this.currentFont, this.currentFontSize, _OsShell.promptStr + this.buffer), _DefaultFontSize + 5);
            this.currentXPosition = 0;
            this.buffer = "";
        }
        //Clears the text of the current prompt, but doesn't remove the prompt
        clearPrompt() {
            const xSize = _DrawingContext.measureText(this.currentFont, this.currentFontSize, this.buffer);
            const xStartPos = this.currentXPosition - xSize;
            _DrawingContext.clearRect(xStartPos, this.currentYPosition - _DefaultFontSize, xSize, _DefaultFontSize + 5);
            this.currentXPosition = xStartPos;
            this.buffer = "";
        }
        handleInput() {
            while (_KernelInputQueue.getSize() > 0) {
                // Get the next character from the kernel input queue.
                const chr = _KernelInputQueue.dequeue();
                // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
                if (!this.inputEnabled) {
                    continue;
                }
                switch (chr) {
                    case String.fromCharCode(-1): // up arrow
                        if (this.shellHistoryIndex === 0) {
                            break;
                        }
                        this.shellHistoryIndex--;
                        this.clearPrompt();
                        this.buffer = this.shellHistory[this.shellHistoryIndex];
                        this.putText(this.buffer);
                        break;
                    case String.fromCharCode(-2): // down arrow
                        if (this.shellHistoryIndex === this.shellHistory.length) {
                            break;
                        }
                        this.shellHistoryIndex++;
                        this.clearPrompt();
                        if (this.shellHistoryIndex === this.shellHistory.length) {
                            break;
                        }
                        this.buffer = this.shellHistory[this.shellHistoryIndex];
                        this.putText(this.buffer);
                        break;
                    case String.fromCharCode(3): // ctrl + c
                        //_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, ExitCode.TERMINATED_BY_CTRL_C]));
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
                        const tokens = this.buffer.split(/\s+/); //split by 1 or more spaces
                        if (tokens.length !== 1) {
                            break;
                        }
                        const token = tokens[0];
                        const possCmds = [];
                        for (const cmd of TSOS.ShellCommand.COMMAND_LIST) {
                            if (cmd.command.substring(0, token.length) === token) {
                                possCmds.push(cmd.command);
                            }
                        }
                        if (possCmds.length === 1) { // fill the command
                            const remainder = possCmds[0].substring(token.length) + " ";
                            this.putText(remainder);
                            this.buffer += remainder;
                        }
                        else if (possCmds.length > 1) { // print all possible commands
                            this.advanceLine();
                            for (const cmd of possCmds) {
                                this.putText(cmd);
                                this.advanceLine();
                            }
                            _OsShell.putPrompt();
                            this.putText(this.buffer); // preserve the input for the next prompt
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
        //REMEMBER THIS DOES NOT ADD THE TEXT TO THE BUFFER!!!!!!!!!!!!!!!
        putText(text) {
            if (text !== "") {
                const lines = text.split(/\r?\n/); //The thing being printed might contain a carriage return or new line
                for (let i = 0; i < lines.length; i++) {
                    _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, lines[i]);
                    if (i !== lines.length - 1) {
                        this.advanceLine();
                    }
                }
            }
        }
        //you can also output "\n" to the console
        advanceLine() {
            this.currentXPosition = 0;
            this.currentYPosition += _DefaultFontSize +
                _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                _FontHeightMargin;
            //TODO expand the height of the canvas when overflowing so that scrolling works
            //Reference: https://www.labouseur.com/commondocs/operating-systems/LuchiOS/index.html
            if (this.currentYPosition > _Canvas.height) {
                let offset = this.currentYPosition - _Canvas.height + _FontHeightMargin;
                let screenData = _DrawingContext.getImageData(0, 0, _Canvas.width, this.currentYPosition + _FontHeightMargin);
                this.clearScreen();
                _DrawingContext.putImageData(screenData, 0, -offset);
                this.currentYPosition -= offset;
            }
        }
        //I/O interface functions
        output(buffer) { this.putText(buffer[0]); }
        input() { return [this.handleInput()]; }
        error(buffer) { this.putText(buffer[0]); }
    }
    TSOS.Console = Console;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=console.js.map