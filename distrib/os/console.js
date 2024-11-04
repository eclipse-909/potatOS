/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */
var TSOS;
(function (TSOS) {
    //TODO remake the entire console
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
            _Canvas.height = CANVAS_HEIGHT;
        }
        resetXY() {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
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
                        //Only kill if synchronous
                        if (_Scheduler.currPCB && _OsShell.pidsWaitingOn.some((item) => {
                            return _Scheduler.currPCB.pid === item.pid;
                        })) {
                            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.TERMINATED_BY_CTRL_C]));
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
                        let lastIndex = -1;
                        let matchedDelimiter = "";
                        for (const connector of _OsShell.connectors) {
                            const index = this.buffer.lastIndexOf(connector);
                            if (index > lastIndex) {
                                lastIndex = index;
                                matchedDelimiter = connector;
                            }
                        }
                        for (const redirector of _OsShell.redirectors) {
                            const index = this.buffer.lastIndexOf(redirector);
                            if (index > lastIndex) {
                                lastIndex = index;
                                matchedDelimiter = redirector;
                            }
                        }
                        const tokens = (lastIndex === -1
                            ? this.buffer
                            : this.buffer.substring(lastIndex + matchedDelimiter.length)).trim().split(/\s+/); //split by 1 or more spaces
                        if (tokens.length == 1) { //TODO when you type a command then a space, hitting tab should show the possible arguments
                            this.autocompleteCmd(tokens[0]);
                        }
                        else if (tokens.length === 2) {
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
        autocompleteCmd(cmdToken) {
            cmdToken = cmdToken.toLowerCase();
            const possCmds = [];
            for (const cmd of TSOS.ShellCommand.COMMAND_LIST) {
                if (cmd.command.substring(0, cmdToken.length).toLowerCase() === cmdToken) {
                    possCmds.push(cmd.command);
                }
            }
            if (possCmds.length === 1) { // fill the command
                const remainder = possCmds[0].substring(cmdToken.length) + " ";
                //if you start writing the command in the wrong case, that's okay, but this won't correct the case you were using.
                //it will just fill in the rest of the command in the correct case
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
        }
        autocompleteArg1(cmdToken, argToken) {
            const cmd = TSOS.ShellCommand.COMMAND_LIST.find(c => { return c.command === cmdToken; });
            if (cmd === undefined || cmd.validArgs.length === 0) {
                return;
            }
            argToken = argToken.toLowerCase();
            const possArgs = [];
            for (const arg of cmd.validArgs) {
                if (arg.substring(0, argToken.length).toLowerCase() === argToken) {
                    possArgs.push(arg);
                }
            }
            if (possArgs.length === 1) { // fill the argument
                const remainder = possArgs[0].substring(argToken.length) + " ";
                //if you start writing the argument in the wrong case, that's okay, but this won't correct the case you were using.
                //it will just fill in the rest of the argument in the correct case
                this.putText(remainder);
                this.buffer += remainder;
            }
            else if (possArgs.length > 1) { // print all possible arguments
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
        //Alternatively, you can output "\n" to the console.
        advanceLine() {
            this.currentXPosition = 0;
            this.currentYPosition += this.currentFontSize +
                _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                _FontHeightMargin;
            if (this.currentYPosition >= _Canvas.height) {
                let screenData = _DrawingContext.getImageData(0, 0, _Canvas.width, this.currentYPosition + _FontHeightMargin);
                _Canvas.height = this.currentYPosition + _FontHeightMargin;
                _DrawingContext.putImageData(screenData, 0, 0);
                //Is it okay to do GUI stuff here?
                document.getElementById("display").scrollIntoView({ behavior: 'instant', block: 'end' });
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