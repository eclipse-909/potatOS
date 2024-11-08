var TSOS;
(function (TSOS) {
    class ShellCommand {
        func;
        command;
        description;
        //Used for autocompletion of the FIRST argument only, not for verifying input
        validArgs;
        constructor(func, command, description, validArgs = []) {
            this.func = func;
            this.command = command;
            this.description = description;
            this.validArgs = validArgs;
        }
        static COMMAND_LIST = [
            new ShellCommand(ShellCommand.shellVer, "ver", "- Displays the current version data.\n"),
            new ShellCommand(ShellCommand.shellHelp, "help", "- This is the help command. Seek help."),
            new ShellCommand(ShellCommand.shellShutdown, "shutdown", "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.\n"),
            new ShellCommand(ShellCommand.shellCls, "cls", "- Clears the screen and resets the cursor position.\n"),
            new ShellCommand(ShellCommand.shellMan, "man", "<topic> - Displays the MANual page for <topic>.\n"),
            new ShellCommand(ShellCommand.shellTrace, "trace", "<on | off> - Turns the OS trace on or off.\n", ["on", "off"]),
            new ShellCommand(ShellCommand.shellRot13, "rot13", "<string...> - Does rot13 obfuscation on <string...>.\n"),
            new ShellCommand(ShellCommand.shellPrompt, "prompt", "<string...> - Sets the prompt.\n"),
            new ShellCommand(ShellCommand.shellDate, "date", "- Displays the current date and time.\n"),
            new ShellCommand(ShellCommand.shellWhereAmI, "whereami", "- Displays the user's current location.\n"),
            new ShellCommand(ShellCommand.shellEcho, "echo", "- Displays the given text to standard output.\n"),
            new ShellCommand(ShellCommand.shellStatus, "status", "- Displays a message to the task bar.\n"),
            new ShellCommand(ShellCommand.shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message.\n"),
            new ShellCommand(ShellCommand.shellLoad, "load", "- Loads the binary program from the HTML input field to the disk.\n"),
            new ShellCommand(ShellCommand.shellRun, "run", "<process ID> [&] - Run the program in memory with the process ID. Use ampersand to run in background asynchronously.\n"),
            new ShellCommand(ShellCommand.shellClh, "clh", "- Clears the host log.\n"),
            new ShellCommand(ShellCommand.shellClearMem, "clearmem", "- Clears memory of all resident/terminated processes.\n"),
            new ShellCommand(ShellCommand.shellRunAll, "runall", "- Runs all programs in memory concurrently.\n"),
            new ShellCommand(ShellCommand.shellPs, "ps", "- Displays the PID and status of all processes.\n"),
            new ShellCommand(ShellCommand.shellKill, "kill", "<process ID> - Terminates the process with the given process ID.\n"),
            new ShellCommand(ShellCommand.shellKillAll, "killall", "- Terminates all processes.\n"),
            new ShellCommand(ShellCommand.shellQuantum, "quantum", "<int> - Set the quantum (measured in CPU cycles) for Round-Robin scheduling. Must be non-zero. Negative quantum will reverse the order of execution\n"),
            new ShellCommand(ShellCommand.shellChAlloc, "challoc", "<FirstFit | BestFit | WorstFit> - Set the mode for allocating new processes.\n", ["FirstFit", "BestFit", "WorstFit"]),
            new ShellCommand(ShellCommand.shellChSegment, "chsegment", "<fixed | variable> [<int>] - Change segment allocation to fixed or variable size. If fixed, pass the size as a positive integer.\n", ["fixed", "variable"]),
            new ShellCommand(ShellCommand.shellChSched, "chsched", "<RR | NP_FCFS | P_SJF> - Change the CPU scheduling mode.\n", ["RR", "NP_FCFS", "P_SJF"])
        ];
        static shellVer(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: ver\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output([APP_NAME + " version " + APP_VERSION + "\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellHelp(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: help\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            let text = "Key:\n  <> = parameter type/option\n  ... = repeatable parameter\n  [] = optional parameter\n  | = either parameter is acceptable\nCommands:\n";
            for (const i in ShellCommand.COMMAND_LIST) {
                text += "  " + ShellCommand.COMMAND_LIST[i].command + " " + ShellCommand.COMMAND_LIST[i].description;
            }
            stdout.output([text]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellShutdown(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: shutdown\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            // Call Kernel shutdown routine.
            _Kernel.krnShutdown();
            stdout.output(["Shutting down...\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellCls(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: cls\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _StdOut.init();
            return TSOS.ExitCode.SUCCESS;
        }
        static shellMan(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: man <topic>  Please supply a topic.\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            const topic = args[0];
            const cmd = ShellCommand.COMMAND_LIST.find((item) => { return item.command === topic; });
            if (cmd) {
                stdout.output([cmd.description + "\n"]);
                return TSOS.ExitCode.SUCCESS;
            }
            stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No manual entry for " + args[0] + ".\n"]);
            return TSOS.ExitCode.GENERIC_ERROR;
        }
        static shellTrace(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: trace <on | off>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            const setting = args[0];
            switch (setting) {
                case "on":
                    if (_Trace && _SarcasticMode) {
                        stdout.output(["Trace is already on, doofus.\n"]);
                        return TSOS.ExitCode.SUCCESS;
                    }
                    else {
                        _Trace = true;
                        stdout.output(["Trace ON\n"]);
                        return TSOS.ExitCode.SUCCESS;
                    }
                case "off":
                    _Trace = false;
                    stdout.output(["Trace OFF\n"]);
                    return TSOS.ExitCode.SUCCESS;
                default:
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument.  Usage: trace <on | off>.\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
            }
        }
        static shellRot13(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length > 0) {
                stdout.output([args.join(' ') + " = '" + TSOS.Utils.rot13(args.join(' ')) + "'\n"]);
                return TSOS.ExitCode.SUCCESS;
            }
            else {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: rot13 <string>  Please supply a string.\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: prompt <string>  Please supply a string.\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
        }
        static shellDate(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: date\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output([new Date().toString() + "\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellWhereAmI(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: whereami\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output(["You're in your office trying to steal my source code... STOP IT!!!\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellEcho(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: echo <string>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output([args.join(" ") + "\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellStatus(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: status <string>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            //Is it okay to do GUI stuff here?
            document.getElementById("footerStatus").innerHTML = args.join(" ");
            return TSOS.ExitCode.SUCCESS;
        }
        static shellBSOD(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: bsod\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _Kernel.krnTrapError("Self-induced error via shell command.");
            return TSOS.ExitCode.SUCCESS;
        }
        static shellLoad(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: load\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            //Is it okay to do GUI stuff here?
            const textArea = document.getElementById("taProgramInput");
            let input = textArea.value;
            input = input.replace(/\s+/g, ' ').trim();
            const hexArray = input.split(/[\s,]+/);
            // If you're curious why I'm also allowing hex numbers and separators to be formatted as '0xAD, 0x04, 0x00',
            // it's because I made an assembler for this instruction set that outputs the binary this way.
            const bin = hexArray.map(hex => {
                const cleanedHex = hex.startsWith('0x') ? hex.slice(2) : hex;
                let num = parseInt(cleanedHex, 16);
                if (num < 0 || num > 0xff) {
                    num = NaN;
                }
                return num;
            });
            //textArea.value = "";//don't clear input area on load
            if (bin.some(Number.isNaN)) {
                stderr.error([
                    TSOS.ExitCode.SHELL_MISUSE.shellDesc()
                        + " - Invalid binary syntax. Hex values must range from 0x00-0xFF, have the format of '0xFF' or 'FF', and be separated either by ' ' or ', '\"\n"
                ]);
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            const pcb = TSOS.ProcessControlBlock.new(bin);
            if (pcb === undefined) {
                //Error message is handled in ProcessControlBlock.new()
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            _Scheduler.load(pcb);
            stdout.output([`Program loaded into memory with process ID ${pcb.pid}.\n`]);
            TSOS.Control.updatePcbDisplay();
            TSOS.Control.updateMemDisplay();
            return TSOS.ExitCode.SUCCESS;
        }
        //@Returns
        // - An exit code if an error occurred before running the process.
        // - Undefined if running synchronously.
        // - Null if running asynchronously.
        static shellRun(stdin, stdout, stderr) {
            const args = stdin.input();
            if (!(args.length === 1 || args.length === 2)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <pid> [&]\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            //add support for "run all" with space
            if (args[0].toLowerCase() === "all" && args.length === 1) {
                for (const pcb of _Scheduler.allProcs()) {
                    ShellCommand.runHelper(pcb.pid, true, stdout, stderr);
                }
                return null;
            }
            let async = false;
            if (args.length === 2) {
                if (args[1] === '&') {
                    async = true;
                }
                else {
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <pid> [&]\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
                }
            }
            const pid = Number.parseInt(args[0]);
            if (Number.isNaN(pid)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - pid must be an integer. Usage: run <pid> [&]\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            return ShellCommand.runHelper(pid, async, stdout, stderr);
        }
        static runHelper(pid, async, stdout, stderr) {
            const pcb = _Scheduler.run(pid);
            if (!pcb) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + ` - Could not find process ${pid}.\n`]);
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            if (!async) { //must print to console if async because piping doesn't work in background. I would have to implement IO waiting and concurrency
                pcb.stdOut = stdout;
                pcb.stdErr = stderr;
            }
            TSOS.Control.updatePcbDisplay();
            TSOS.Control.updateCpuDisplay();
            return async ? null : undefined;
        }
        static shellClh(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: clh\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            //Is it okay to do GUI stuff here?
            document.getElementById("hostLog").value = "";
            return TSOS.ExitCode.SUCCESS;
        }
        static shellClearMem(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: clearmem\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _Scheduler.clearMem();
            stdout.output(["Resident processes cleared. Running/ready processes were not affected\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        //@Returns
        // - An exit code if an error occurred before running the process.
        // - Null if successful.
        static shellRunAll(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: runall\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            for (const pcb of _Scheduler.allProcs()) {
                if (pcb.status === TSOS.Status.resident) {
                    ShellCommand.runHelper(pcb.pid, true, stdout, stderr);
                }
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellPs(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: ps\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            for (const pcb of _Scheduler.allProcs()) {
                stdout.output([`Process: ${pcb.pid} - Status: ${TSOS.Status[pcb.status]}\n`]);
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellKill(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: kill <pid>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            //add support for "kill all" with space
            if (args[0].toLowerCase() === "all") {
                for (const pcb of _Scheduler.allProcs()) {
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [pcb.pid, TSOS.ExitCode.PROC_KILLED]));
                }
                return TSOS.ExitCode.SUCCESS;
            }
            const pid = Number.parseInt(args[0]);
            if (Number.isNaN(pid)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-negative integer). Usage: kill <pid>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [pid, TSOS.ExitCode.PROC_KILLED]));
            return TSOS.ExitCode.SUCCESS;
        }
        static shellKillAll(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - No argument required. Usage: killall\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            for (const pcb of _Scheduler.allProcs()) {
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [pcb.pid, TSOS.ExitCode.PROC_KILLED]));
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellQuantum(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: quantum <int>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            let pid = Number.parseInt(args[0]);
            if (Number.isNaN(pid) || pid === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-zero integer). Usage: quantum <int>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _Scheduler.quantum = pid;
            return TSOS.ExitCode.SUCCESS;
        }
        static shellChAlloc(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: challoc <FirstFit | BestFit | WorstFit>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            switch (args[0].toLowerCase()) {
                case "firstfit":
                    _MMU.allocMode = TSOS.AllocMode.FirstFit;
                    break;
                case "bestfit":
                    _MMU.allocMode = TSOS.AllocMode.BestFit;
                    break;
                case "worstfit":
                    _MMU.allocMode = TSOS.AllocMode.WorstFit;
                    break;
                default:
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: challoc <FirstFit | BestFit | WorstFit>\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellChSegment(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1 && args.length !== 2) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [<int>]\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            switch (args[0].toLowerCase()) {
                case "fixed":
                    if (args.length !== 2) {
                        stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [<int>]\n"]);
                        return TSOS.ExitCode.SHELL_MISUSE;
                    }
                    _MMU.fixedSegments = true;
                    const size = Number.parseInt(args[1]);
                    if (Number.isNaN(size) || size <= 0) {
                        stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Size must be a positive integer. Usage: chsegment <fixed | variable> [<int>]\n"]);
                        return TSOS.ExitCode.SHELL_MISUSE;
                    }
                    _MMU.segmentSize = size;
                    break;
                case "variable":
                    if (args.length !== 1) {
                        stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Cannot use a specific size for variable-sized segments. Usage: chsegment <fixed | variable> [<int>]\n"]);
                        return TSOS.ExitCode.SHELL_MISUSE;
                    }
                    _MMU.fixedSegments = false;
                    break;
                default:
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [<int>]\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellChSched(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | NP_FCFS | P_SJF>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            switch (args[0].toUpperCase()) {
                case "RR":
                    _Scheduler.scheduleMode = TSOS.ScheduleMode.RR;
                    break;
                case "NP_FCFS":
                    _Scheduler.scheduleMode = TSOS.ScheduleMode.NP_FCFS;
                    break;
                case "P_SJF":
                    _Scheduler.scheduleMode = TSOS.ScheduleMode.P_SJF;
                    break;
                default:
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | NP_FCFS | P_SJF>\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
            }
            TSOS.Control.updatePcbMeta();
            return TSOS.ExitCode.SUCCESS;
        }
        static shellGrep(stdin, stdout, stderr) {
            //TODO grep
            return;
        }
    }
    TSOS.ShellCommand = ShellCommand;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=shellCommand.js.map