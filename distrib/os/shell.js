/* ------------
   Shell.ts

   The OS Shell - The "command line interface" (CLI) for the console.

    Note: While fun and learning are the primary goals of all enrichment center activities,
          serious injuries may occur when trying to write your own Operating System.
   ------------ */
// TODO: Write a base class / prototype for system services and let Shell inherit from it.
var TSOS;
(function (TSOS) {
    class Shell {
        // Properties
        promptStr = "$ ";
        curses = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
        apologies = "[sorry]";
        cmdQueue = new TSOS.Queue();
        ioQueue = new TSOS.Queue();
        processExitQueue = new TSOS.Queue();
        pidsWaitingOn = [];
        //The shell is used as I/O when piping the output of one command to the input of another command.
        output(buffer) {
            this.ioQueue.enqueue(buffer);
        }
        input() {
            return this.ioQueue.dequeue();
        }
        error(buffer) {
            this.ioQueue.enqueue(buffer);
        }
        //Must be used in between two commands.
        connectors = [
            "||", //execute second command if and only if the first command fails.
            "&&", //execute second command if and only if the first command succeeds.
        ];
        //Must be used in between a command and an argument that specifies input or output.
        redirectors = [
            ">>", //stdout to file (append contents).
            ">", //stdout to file (overwrite contents).
            "2>&1", //stderr to stdout.
            "2>", //stderr to file.
            "<", //file to stdin.
            "|", //pipe stdout of first command to stdin of second command.
        ];
        constructor() { }
        init() {
            // Display the initial prompt.
            this.putPrompt();
        }
        putPrompt() {
            _StdOut.putText(this.promptStr);
        }
        handleInput(input) {
            _StdOut.advanceLine();
            if (!this.processExitQueue.isEmpty()) {
                while (!this.processExitQueue.isEmpty()) {
                    const exit = this.processExitQueue.dequeue();
                    _StdOut.output([exit.exitCode.processDesc(exit.pid) + "\n"]);
                    const i = this.pidsWaitingOn.findIndex((item) => {
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
            const tokens = this.tokenize(input);
            const commands = this.parseTokens(tokens);
            if (!commands) {
                return;
            }
            this.executeCommands(commands);
        }
        tokenize(input) {
            const tokens = [];
            let buffer = '';
            for (let i = 0; i < input.length; i++) {
                const char = input[i];
                // Skip spaces
                if (char === ' ') {
                    if (buffer) {
                        tokens.push({ type: 'WORD', value: buffer });
                        buffer = '';
                    }
                    continue;
                }
                // Check if the current and next character form a connector
                let pushed = false;
                for (const connector of this.connectors) {
                    if (input.slice(i, i + connector.length) === connector) {
                        if (buffer) {
                            tokens.push({ type: 'WORD', value: buffer });
                            buffer = '';
                        }
                        tokens.push({ type: 'CONNECTOR', value: connector });
                        i += connector.length - 1; // Move index to the end of connector
                        pushed = true;
                        break;
                    }
                }
                if (pushed) {
                    continue;
                }
                // Check if the current and next character form a redirector
                for (const redirector of this.redirectors) {
                    if (input.slice(i, i + redirector.length) === redirector) {
                        if (buffer) {
                            tokens.push({ type: 'WORD', value: buffer });
                            buffer = '';
                        }
                        tokens.push({ type: 'REDIRECTOR', value: redirector });
                        i += redirector.length - 1; // Move index to the end of symbol
                        pushed = true;
                        break;
                    }
                }
                if (pushed) {
                    continue;
                }
                // Otherwise, add to buffer
                buffer += char;
            }
            // Add remaining buffer as a word
            if (buffer) {
                tokens.push({ type: 'WORD', value: buffer });
            }
            return tokens;
        }
        parseTokens(tokens) {
            const commands = [];
            let currentCommand = null;
            let unexpectedToken = null;
            if (tokens[0].type !== 'WORD') {
                unexpectedToken = tokens[0];
            }
            else if (tokens[tokens.length - 1].type !== 'WORD') {
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
                        currentCommand = { name: token.value, args: [] }; //set current command
                    }
                    else {
                        currentCommand.args.push(token.value); //add argument to current command
                    }
                }
                else if (token.type === 'CONNECTOR') {
                    if (currentCommand) {
                        currentCommand.connector = token.value; //add connector to current command
                        commands.push(currentCommand);
                        currentCommand = null;
                    }
                    else {
                        _StdOut.putText(`Invalid token: '${token.value}', expected command or argument.`);
                        _StdOut.advanceLine();
                        this.putPrompt();
                        return undefined;
                    }
                }
                else if (token.type === 'REDIRECTOR') {
                    if (currentCommand) {
                        currentCommand.redirector = token.value; //add connector to current command
                        commands.push(currentCommand);
                        currentCommand = null;
                    }
                    else {
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
        executeCommands(commands) {
            for (const cmd of commands) {
                this.cmdQueue.enqueue(cmd);
            }
            this.executeCmdQueue();
        }
        executeCmdQueue(prevCmd = null) {
            _StdIn.inputEnabled = false;
            if (this.cmdQueue.isEmpty()) {
                return;
            }
            let currCmd = this.cmdQueue.dequeue();
            let nextCmd = this.cmdQueue.peek();
            while (currCmd) {
                const command = TSOS.ShellCommand.COMMAND_LIST.find((item) => { return item.command === currCmd.name; });
                let stdin = this;
                let stdout = _StdOut;
                let stderr = _StdErr;
                //if the previous command is being piped into this one
                //add the arguments of this command before the output of the previous command
                if (this.ioQueue.isEmpty()) {
                    this.ioQueue.enqueue(currCmd.args);
                }
                else {
                    for (let i = currCmd.args.length - 1; i >= 0; i--) {
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
                let exitCode;
                if (!command) {
                    if (this.curses.indexOf("[" + TSOS.Utils.rot13(currCmd.name) + "]") >= 0) { // Check for curses.
                        exitCode = this.shellCurse(stdin, stdout, stderr);
                    }
                    else if (this.apologies.indexOf("[" + currCmd.name + "]") >= 0) { // Check for apologies.
                        exitCode = this.shellApology(stdin, stdout, stderr);
                    }
                    exitCode = TSOS.ExitCode.COMMAND_NOT_FOUND;
                    stderr.error([
                        _SarcasticMode
                            ? "Unbelievable. You, [subject name here],\nmust be the pride of [subject hometown here]."
                            : "Type 'help' for, well... help."
                    ]);
                }
                else {
                    exitCode = command.func(stdin, stdout, stderr);
                }
                //if we are executing a process,
                //add the pid and connector to the queue so we can wait for it to finish.
                //then keep executing remaining chained commands.
                if (command.command === "run") {
                    const pid = Number.parseInt(currCmd.args[0]);
                    if (!Number.isNaN(pid)) {
                        if (exitCode === undefined) { //synchronous
                            this.pidsWaitingOn.push({ pid: pid, connector: currCmd.connector });
                        }
                        else if (exitCode === null) { //asynchronous
                            this.pidsWaitingOn.push({ pid: pid, connector: null });
                            _StdIn.inputEnabled = true;
                            this.continueExecution(); //make a semi-recursive call because the pipeline is broken, even in async processes
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
        continueExecution() {
            const process = this.processExitQueue.dequeue();
            if (!process) {
                return;
            }
            let cmdData = this.pidsWaitingOn.find((item) => {
                return item.pid === process.pid;
            });
            if (!cmdData) {
                return;
            }
            const prevCmd = {
                name: "",
                args: [],
                connector: cmdData.connector
            };
            this.executeCmdQueue(prevCmd);
        }
        shellCurse(_stdin, stdout, _stderr) {
            stdout.output(["Oh, so that's how it's going to be, eh? Fine.\nBitch."]);
            _SarcasticMode = true;
            return TSOS.ExitCode.SUCCESS;
        }
        shellApology(_stdin, stdout, _stderr) {
            if (_SarcasticMode) {
                stdout.output(["I think we can put our differences behind us.\nFor science . . . You monster."]);
                _SarcasticMode = false;
            }
            else {
                stdout.output(["For what?"]);
            }
            return TSOS.ExitCode.SUCCESS;
        }
    }
    TSOS.Shell = Shell;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=shell.js.map