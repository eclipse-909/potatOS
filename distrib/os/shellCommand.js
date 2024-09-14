var TSOS;
(function (TSOS) {
    class ShellCommand {
        func;
        command = "";
        description = "";
        constructor(func, command = "", description = "") {
            this.func = func;
            this.command = command;
            this.description = description;
        }
        static COMMAND_LIST = [
            new ShellCommand(ShellCommand.shellVer, "ver", "- Displays the current version data."),
            new ShellCommand(ShellCommand.shellHelp, "help", "- This is the help command. Seek help."),
            new ShellCommand(ShellCommand.shellShutdown, "shutdown", "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running."),
            new ShellCommand(ShellCommand.shellCls, "cls", "- Clears the screen and resets the cursor position."),
            new ShellCommand(ShellCommand.shellMan, "man", "<topic> - Displays the MANual page for <topic>."),
            new ShellCommand(ShellCommand.shellTrace, "trace", "<on | off> - Turns the OS trace on or off."),
            new ShellCommand(ShellCommand.shellRot13, "rot13", "<string...> - Does rot13 obfuscation on <string>."),
            new ShellCommand(ShellCommand.shellPrompt, "prompt", "<string...> - Sets the prompt."),
            new ShellCommand(ShellCommand.shellDate, "date", "- Displays the current date and time."),
            new ShellCommand(ShellCommand.shellWhereAmI, "whereami", "- Displays the user's current location."),
            new ShellCommand(ShellCommand.shellEcho, "echo", "- Displays the given text to standard output."),
            new ShellCommand(ShellCommand.shellStatus, "status", "- Displays a message to the task bar."),
            new ShellCommand(ShellCommand.shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message."),
            new ShellCommand(ShellCommand.shellLoad, "load", "- Loads the binary program from the HTML input field to the disk."),
            new ShellCommand(ShellCommand.shellRun, "run", "<process ID> [&] - Run the program in memory with the process ID. Use ampersand to run in background asynchronously.")
            // ps  - list the running processes and their IDs
            // kill <id> - kills the specified process id.
        ];
        static shellVer(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: ver"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output([APP_NAME + " version " + APP_VERSION]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellHelp(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: help"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            let text = "Commands:\nKey:\n  <> = required parameter\n  ... = repeatable parameter\n  [] = optional parameter\n  / = either parameter is acceptable";
            for (const i in ShellCommand.COMMAND_LIST) {
                text += "\n  " + ShellCommand.COMMAND_LIST[i].command + " " + ShellCommand.COMMAND_LIST[i].description;
            }
            stdout.output([text]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellShutdown(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: shutdown"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            // Call Kernel shutdown routine.
            _Kernel.krnShutdown();
            stdout.output(["Shutting down..."]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellCls(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: cls"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _StdOut.clearScreen();
            _StdOut.resetXY();
            return TSOS.ExitCode.SUCCESS;
        }
        static shellMan(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: man <topic>  Please supply a topic."]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            const topic = args[0];
            const cmd = ShellCommand.COMMAND_LIST.find((item) => { return item.command === topic; });
            if (cmd) {
                stdout.output([cmd.description]);
                return TSOS.ExitCode.SUCCESS;
            }
            stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No manual entry for " + args[0] + "."]);
            return TSOS.ExitCode.GENERIC_ERROR;
        }
        static shellTrace(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: trace <on | off>"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            const setting = args[0];
            switch (setting) {
                case "on":
                    if (_Trace && _SarcasticMode) {
                        stdout.output(["Trace is already on, doofus."]);
                        return TSOS.ExitCode.SUCCESS;
                    }
                    else {
                        _Trace = true;
                        stdout.output(["Trace ON"]);
                        return TSOS.ExitCode.SUCCESS;
                    }
                case "off":
                    _Trace = false;
                    stdout.output(["Trace OFF"]);
                    return TSOS.ExitCode.SUCCESS;
                default:
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument.  Usage: trace <on | off>."]);
                    return TSOS.ExitCode.SHELL_MISUSE;
            }
        }
        static shellRot13(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length > 0) {
                stdout.output([args.join(' ') + " = '" + TSOS.Utils.rot13(args.join(' ')) + "'"]);
                return TSOS.ExitCode.SUCCESS;
            }
            else {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: rot13 <string>  Please supply a string."]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
        }
        static shellPrompt(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length > 0) {
                _OsShell.promptStr = args[0];
                return TSOS.ExitCode.SUCCESS;
            }
            else {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: prompt <string>  Please supply a string."]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
        }
        static shellDate(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: date"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output([new Date().toString()]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellWhereAmI(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: whereami"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output(["You're at your desk trying to steal my source code... STOP IT!!!"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellEcho(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: echo <string>"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output([args.join(" ")]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellStatus(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: status <string>"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            document.getElementById("footerStatus").innerHTML = args.join(" ");
            return TSOS.ExitCode.SUCCESS;
        }
        static shellBSOD(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: bsod"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _Kernel.krnTrapError("Self-induced error via shell command.");
            return TSOS.ExitCode.SUCCESS;
        }
        static shellLoad(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: load"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            const textArea = document.getElementById("taProgramInput");
            let input = textArea.value;
            input = input.replace(/\s+/g, ' ').trim();
            const hexArray = input.split(/[\s,]+/);
            // If you're curious why I'm also allowing hex numbers and separators to be formatted as '0xAD, 0x04, 0x00',
            // it's because I made an assembler for this instruction set that outputs the binary this way.
            const numberArray = hexArray.map(hex => {
                const cleanedHex = hex.startsWith('0x') ? hex.slice(2) : hex;
                let num = parseInt(cleanedHex, 16);
                if (num < 0 || num > 0xff) {
                    num = NaN;
                }
                return num;
            });
            textArea.value = "";
            if (numberArray.some(Number.isNaN)) {
                stderr.error([
                    TSOS.ExitCode.SHELL_MISUSE.shellDesc()
                        + " - Invalid binary syntax. Hex values must range from 0x00-0xFF, have the format of '0xFF' or 'FF', and be separated either by ' ' or ', '\""
                ]);
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            const pcb = TSOS.ProcessControlBlock.new(numberArray);
            _Scheduler.idlePcbs.set(pcb.pid, pcb);
            stdout.output([`Program loaded into memory with process ID ${pcb.pid}.`]);
            return TSOS.ExitCode.SUCCESS;
        }
        //@Returns
        // - an exit code if an error occurred before running the process.
        // - undefined if running synchronously
        // - null if running asynchronously
        static shellRun(stdin, stdout, stderr) {
            const args = stdin.input();
            if (!(args.length === 1 || args.length === 2)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <pid> [&]"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            let async = false;
            if (args.length === 2) {
                if (args[1] === '&') {
                    async = true;
                }
                else {
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <pid> [&]"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
                }
            }
            const pid = Number.parseInt(args[0]);
            if (Number.isNaN(pid)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - pid must be an integer. Usage: run <pid>"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            const pcb = _Scheduler.idlePcbs.get(pid);
            if (!pcb) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + ` - Could not locate process ${pid}.`]);
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            if (!async) { //console by default if it is async
                pcb.stdOut = stdout;
                pcb.stdErr = stderr;
            }
            _Scheduler.pcbQueue.enqueue(pcb);
            //I assume that I unload the program from memory once it finishes running.
            //The program should be loaded from the disk every time you want to run it.
            _Scheduler.idlePcbs.delete(pid);
            return async ? null : undefined;
        }
    }
    TSOS.ShellCommand = ShellCommand;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=shellCommand.js.map