var TSOS;
(function (TSOS) {
    class ShellCommand {
        func;
        command;
        description;
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
            new ShellCommand(ShellCommand.shellRot13, "rot13", "<string> - Does rot13 obfuscation on <string>."),
            new ShellCommand(ShellCommand.shellPrompt, "prompt", "<string> - Sets the prompt."),
            new ShellCommand(ShellCommand.shellDate, "date", "- Displays the current date and time."),
            new ShellCommand(ShellCommand.shellWhereAmI, "whereami", "- Displays the user's current location."),
            new ShellCommand(ShellCommand.shellEcho, "echo", "- Displays the given text to standard output."),
            new ShellCommand(ShellCommand.shellStatus, "status", "- Displays a message to the task bar."),
            new ShellCommand(ShellCommand.shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message."),
            new ShellCommand(ShellCommand.shellLoad, "load", "- Loads the binary program from the HTML input field to the disk."),
            new ShellCommand(ShellCommand.shellRun, "run", "<process ID> - Run the program in memory with the process ID.")
            // ps  - list the running processes and their IDs
            // kill <id> - kills the specified process id.
        ];
        static shellVer(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: undefined };
            }
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: APP_NAME + " version " + APP_VERSION };
        }
        static shellHelp(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: undefined };
            }
            let text = "Commands:";
            for (const i in ShellCommand.COMMAND_LIST) {
                text += "\n  " + ShellCommand.COMMAND_LIST[i].command + " " + ShellCommand.COMMAND_LIST[i].description;
            }
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: text };
        }
        static shellShutdown(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: undefined };
            }
            // Call Kernel shutdown routine.
            _Kernel.krnShutdown();
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: "Shutting down..." };
        }
        static shellCls(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: undefined };
            }
            _StdOut.clearScreen();
            _StdOut.resetXY();
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: undefined };
        }
        static shellMan(args) {
            if (args.length !== 1) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "Usage: man <topic>  Please supply a topic." };
            }
            const topic = args[0];
            const cmd = ShellCommand.COMMAND_LIST.find((item) => { return item.command === topic; });
            if (cmd) {
                return { exitCode: TSOS.ExitCode.SUCCESS, retValue: cmd.description };
            }
            switch (topic) {
                // TODO: Make descriptive MANual page entries for topics other than shell commands.
                default:
                    return { exitCode: TSOS.ExitCode.GENERIC_ERROR, retValue: "No manual entry for " + args[0] + "." };
            }
        }
        static shellTrace(args) {
            if (args.length !== 1) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "Usage: trace <on | off>" };
            }
            const setting = args[0];
            switch (setting) {
                case "on":
                    if (_Trace && _SarcasticMode) {
                        return { exitCode: TSOS.ExitCode.SUCCESS, retValue: "Trace is already on, doofus." };
                    }
                    else {
                        _Trace = true;
                        return { exitCode: TSOS.ExitCode.SUCCESS, retValue: "Trace ON" };
                    }
                case "off":
                    _Trace = false;
                    return { exitCode: TSOS.ExitCode.SUCCESS, retValue: "Trace OFF" };
                default:
                    return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "Invalid argument.  Usage: trace <on | off>." };
            }
        }
        static shellRot13(args) {
            if (args.length > 0) {
                return { exitCode: TSOS.ExitCode.SUCCESS, retValue: args.join(' ') + " = '" + TSOS.Utils.rot13(args.join(' ')) + "'" };
            }
            else {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "Usage: rot13 <string>  Please supply a string." };
            }
        }
        static shellPrompt(args) {
            if (args.length > 0) {
                _OsShell.promptStr = args[0];
                return { exitCode: TSOS.ExitCode.SUCCESS, retValue: undefined };
            }
            else {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "Usage: prompt <string>  Please supply a string." };
            }
        }
        static shellDate(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "No argument required. Usage: date" };
            }
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: new Date().toString() };
        }
        static shellWhereAmI(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "No argument required. Usage: whereami" };
            }
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: "You're at your desk trying to steal my source code... STOP IT!!!" };
        }
        static shellEcho(args) {
            if (args.length === 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "Usage: echo <string>" };
            }
            _StdOut.putText(args.join(" ")); //echo directly prints to the console and cannot be piped into another command
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: undefined };
        }
        static shellStatus(args) {
            if (args.length === 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "Invalid argument. Usage: status <string>" };
            }
            document.getElementById("footerStatus").innerHTML = args.join(" ");
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: undefined };
        }
        static shellBSOD(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "No argument required. Usage: bsod" };
            }
            _Kernel.krnTrapError("Self-induced error via shell command.");
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: undefined };
        }
        static shellLoad(args) {
            if (args.length !== 0) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "No argument required. Usage: load" };
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
                return {
                    exitCode: TSOS.ExitCode.GENERIC_ERROR,
                    retValue: "Invalid binary syntax. Hex values must range from 0x00-0xFF, have the format of '0xFF' or 'FF', and be separated either by ' ' or ', '"
                };
            }
            const pcb = TSOS.ProcessControlBlock.new(numberArray);
            _Scheduler.idlePcbs.set(pcb.pid, pcb);
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: `Program loaded into memory with process ID ${pcb.pid}` };
        }
        static shellRun(args) {
            if (args.length !== 1) {
                return { exitCode: TSOS.ExitCode.SHELL_MISUSE, retValue: "No argument required. Usage: run <pid>" };
            }
            const pid = Number.parseInt(args[0]);
            if (Number.isNaN(pid)) {
                return this.shellBSOD([]); //this code should be unreachable
            }
            _Scheduler.pcbQueue.enqueue(_Scheduler.idlePcbs.get(pid));
            _Scheduler.idlePcbs.delete(pid);
            return { exitCode: TSOS.ExitCode.SUCCESS, retValue: undefined };
        }
    }
    TSOS.ShellCommand = ShellCommand;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=shellCommand.js.map