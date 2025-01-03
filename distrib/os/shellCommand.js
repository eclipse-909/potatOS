var TSOS;
(function (TSOS) {
    class ShellCommand {
        func;
        command;
        description;
        //Used for autocompletion of the arguments only, not for verifying input
        validArgs;
        aliases;
        constructor(func, command, description, validArgs = [], aliases = []) {
            this.func = func;
            this.command = command;
            this.description = description;
            this.validArgs = validArgs;
            this.aliases = aliases;
        }
        static COMMAND_LIST = [
            new ShellCommand(ShellCommand.shellVer, "ver", "- Displays the current version data.\n"),
            new ShellCommand(ShellCommand.shellHelp, "help", "- This is the help command. Seek help."),
            new ShellCommand(ShellCommand.shellShutdown, "shutdown", "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running.\n"),
            new ShellCommand(ShellCommand.shellCls, "cls", "- Clears the screen and resets the cursor position.\n", [], ["clear"]),
            new ShellCommand(ShellCommand.shellMan, "man", "<TOPIC> - Displays the MANual page for <TOPIC>.\n"),
            new ShellCommand(ShellCommand.shellTrace, "trace", "<on | off> - Turns the OS trace on or off.\n", [["on", "off"]]),
            new ShellCommand(ShellCommand.shellRot13, "rot13", "<TEXT>... - Does rot13 obfuscation on TEXT.\n"),
            new ShellCommand(ShellCommand.shellPrompt, "prompt", "<TEXT>... - Sets the prompt to TEXT.\n"),
            new ShellCommand(ShellCommand.shellDate, "date", "- Displays the current date and time.\n"),
            new ShellCommand(ShellCommand.shellWhereAmI, "whereami", "- Displays the user's current location.\n"),
            new ShellCommand(ShellCommand.shellEcho, "echo", "<TEXT>... - Displays the given text to standard output.\n"),
            new ShellCommand(ShellCommand.shellStatus, "status", "- Displays a message to the task bar.\n"),
            new ShellCommand(ShellCommand.shellBSOD, "bsod", "- Simulates an OS error and displays a 'Blue Screen Of Death' message.\n"),
            new ShellCommand(ShellCommand.shellLoad, "load", "[FILE.exe] - Loads the binary program into memory from the program input field, or from FILE.exe.\n", [["FILE"]]),
            new ShellCommand(ShellCommand.shellRun, "run", "<PROCESS_ID> [&] - Run the program in memory with the PROCESS_ID. Use ampersand to run in background asynchronously.\n"),
            new ShellCommand(ShellCommand.shellClh, "clh", "- Clears the host log.\n"),
            new ShellCommand(ShellCommand.shellClearMem, "clearmem", "- Clears memory of all resident/terminated processes.\n"),
            new ShellCommand(ShellCommand.shellRunAll, "runall", "- Runs all programs in memory concurrently.\n"),
            new ShellCommand(ShellCommand.shellPs, "ps", "- Displays the PID and status of all processes.\n"),
            new ShellCommand(ShellCommand.shellKill, "kill", "<PROCESS_ID> - Terminates the process with the given PROCESS_ID.\n"),
            new ShellCommand(ShellCommand.shellKillAll, "killall", "- Terminates all processes.\n"),
            new ShellCommand(ShellCommand.shellQuantum, "quantum", "<QUANTUM> - Set the quantum (measured in CPU cycles) for Round-Robin scheduling. Must be non-zero. Negative quantum will reverse the order of execution\n"),
            new ShellCommand(ShellCommand.shellChAlloc, "challoc", "<FirstFit | BestFit | WorstFit> - Set the mode for allocating new processes.\n", [["FirstFit", "BestFit", "WorstFit"]]),
            new ShellCommand(ShellCommand.shellChSegment, "chsegment", "<fixed | variable> [SIZE] - Change segment allocation to fixed or variable size. If fixed, pass the SIZE as a positive integer.\n", [["fixed", "variable"]]),
            new ShellCommand(ShellCommand.shellChSched, "chsched", "<RR | FCFS | P_SJF | NP_P> - Change the CPU scheduling mode.\n", [["RR", "FCFS", "P_SJF", "NP_P"]], ["setschedule"]),
            new ShellCommand(ShellCommand.shellFormat, "format", "[-quick | -full] - Formats the disk. Defaults to -quick, which allows the possibility to recover deleted files.\n", [["-quick", "-full"]], ["cleardisk"]),
            new ShellCommand(ShellCommand.shellCreate, "create", "<FILE> - Creates FILE if it does not exist.\n", [["FILE"]], ["touch"]),
            new ShellCommand(ShellCommand.shellRead, "read", "<FILE> - Output the contents of FILE if it exists.\n", [["FILE"]], ["cat"]),
            new ShellCommand(ShellCommand.shellWrite, "write", "<FILE> <TEXT>... - Write TEXT to FILE if it exists.\n", [["FILE"], []]),
            new ShellCommand(ShellCommand.shellDelete, "delete", "<FILE>... - Delete FILEs if they exists.\n", [["FILE"], ["REPEAT"]], ["rm"]),
            new ShellCommand(ShellCommand.shellCopy, "copy", "<FILE> <COPY_FILE> - Creates a file with the copy name and copies the contents of the file to it if it exists.\n", [["FILE"], ["FILE"]], ["cp"]),
            new ShellCommand(ShellCommand.shellRename, "rename", "<FILE> <NEW_FILE> - Renames the file, if it exists, to the new name, if it does not exist.\n", [["FILE"], ["FILE"]], ["mv"]),
            new ShellCommand(ShellCommand.shellLs, "ls", "[-la] - Lists the files in the directory.\n   -a Show hidden open_files.\n   -l Separate files with a new line.\n", [["-a", "-l", "-la", "-al"]]),
            new ShellCommand(ShellCommand.shellRecover, "recover", "<FILE> - Attempts to recover the deleted FILE.\n", [["FILE"]]),
            new ShellCommand(ShellCommand.shellDiskGC, "diskgc", "- Performs garbage collection on the disk, and cleans up data that has no file.\n", [["FILE"]]),
            new ShellCommand(ShellCommand.shellDefrag, "defrag", "- Defragments the disk.\n", [["FILE"]]),
            new ShellCommand(ShellCommand.shellShell, "shell", "<FILE.sh> - Executes the shell file.\n", [["FILE"]]),
            new ShellCommand(ShellCommand.shellGrep, "grep", "<PATTERN> <FILE>... - Search for PATTERN in each FILE or standard input.\n", [[], ["FILE"], ["REPEAT"]]),
            new ShellCommand(ShellCommand.shellGetSchedule, "getschedule", "- Print the current CPU scheduling mode.\n"),
            // new ShellCommand(ShellCommand.shellLink, "link", "<FILE> <LINK_NAME> - Create a link to FILE.\n", [["FILE"], ["FILE"]]),
            new ShellCommand(ShellCommand.shellAlias, "alias", "<COMMAND> <ALIAS> - Create an alias for COMMAND.\n"),
            new ShellCommand(ShellCommand.shellInfo, "info", "<FILE> - Display the size and creation date of a file.\n", [["FILE"]]),
            new ShellCommand(ShellCommand.shellSave, "save", "<FILE.exe> - Saves the binary in the program input to the FILE.exe (do not include extension).\n", [["FILE"]]),
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
            let text = "Keybindings:\n" +
                "  Arrow Up/Down = previous/next command in history\n" +
                "  CTRL + Shift + Arrow Up/Down = scroll one line\n" +
                "  Mouse Wheel = scroll three lines\n" +
                "  Shift + Page Up/Down = scroll one page\n" +
                "  Shift + Home/End = scroll to top/bottom\n" +
                "Command Syntax:\n" +
                "  <> = parameter type/option\n" +
                "  ... = repeatable parameter\n" +
                "  [] = optional parameter\n" +
                "  | = either parameter is acceptable\n" +
                "Commands:\n";
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
            _StdOut.clearScreen();
            _StdOut.putPrompt();
            return TSOS.ExitCode.SUCCESS;
        }
        static shellMan(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: man <TOPIC>  Please supply a topic.\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: rot13 <TEXT>...  Please supply a string.\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: prompt <TEXT>...  Please supply a string.\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: echo <TEXT>...\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            stdout.output([args.join(" ") + "\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellStatus(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: status <TEXT>...\n"]);
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
        static getProgramInputBin() {
            //Is it okay to do GUI stuff here?
            const textArea = document.getElementById("taProgramInput");
            let input = textArea.value;
            input = input.replace(/\s+/g, ' ').trim();
            const hexArray = input.split(/[\s,]+/);
            return Uint8Array.from(hexArray.map(hex => {
                const cleanedHex = hex.startsWith('0x') ? hex.slice(2) : hex;
                let num = parseInt(cleanedHex, 16);
                if (num < 0 || num > 0xff) {
                    num = NaN;
                }
                return num;
            }));
        }
        static shellLoad(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length === 0) {
                const bin = ShellCommand.getProgramInputBin();
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
            }
            else if (args.length === 1) {
                if (!args[0].match(/^.+\.exe$/)) {
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - The provided file is not a .exe (executable) file.\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
                }
                _FileSystem.open(args[0])
                    .and_try(_FileSystem.read(args[0])
                    .and_try_run((_stderr, params) => {
                    const pcb = TSOS.ProcessControlBlock.new(_DiskController.encode(params[0]));
                    if (pcb === undefined) {
                        return;
                    }
                    _Scheduler.load(pcb);
                    stdout.output([`Program loaded into memory with process ID ${pcb.pid}.\n`]);
                    TSOS.Control.updatePcbDisplay();
                    TSOS.Control.updateMemDisplay();
                })
                    .catch_default()
                    .and_do(_FileSystem.close(args[0])))
                    .catch_default()
                    .execute(stderr);
            }
            else {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: load [FILE]\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            return TSOS.ExitCode.SUCCESS;
        }
        //@Returns
        // - An exit code if an error occurred before running the process.
        // - Undefined if running synchronously.
        // - Null if running asynchronously.
        static shellRun(stdin, stdout, stderr) {
            const args = stdin.input();
            if (!(args.length === 1 || args.length === 2)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <PROCESS_ID> [&]\n"]);
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
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Usage: run <PROCESS_ID> [&]\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
                }
            }
            const pid = Number.parseInt(args[0]);
            if (Number.isNaN(pid)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - pid must be an integer. Usage: run <PROCESS_ID> [&]\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: kill <PROCESS_ID>\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-negative integer). Usage: kill <PROCESS_ID>\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: quantum <QUANTUM>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            let pid = Number.parseInt(args[0]);
            if (Number.isNaN(pid) || pid === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid pid (must be a non-zero integer). Usage: quantum <QUANTUM>\n"]);
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
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [SIZE]\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            switch (args[0].toLowerCase()) {
                case "fixed":
                    if (args.length !== 2) {
                        stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [SIZE]\n"]);
                        return TSOS.ExitCode.SHELL_MISUSE;
                    }
                    _MMU.fixedSegments = true;
                    const size = Number.parseInt(args[1]);
                    if (Number.isNaN(size) || size <= 0) {
                        stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Size must be a positive integer. Usage: chsegment <fixed | variable> [SIZE]\n"]);
                        return TSOS.ExitCode.SHELL_MISUSE;
                    }
                    _MMU.segmentSize = size;
                    break;
                case "variable":
                    if (args.length !== 1) {
                        stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Cannot use a specific size for variable-sized segments. Usage: chsegment <fixed | variable> [SIZE]\n"]);
                        return TSOS.ExitCode.SHELL_MISUSE;
                    }
                    _MMU.fixedSegments = false;
                    break;
                default:
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid arguments. Usage: chsegment <fixed | variable> [QUANTUM]\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellChSched(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | FCFS | P_SJF | NP_P>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            switch (args[0].toUpperCase()) {
                case "RR":
                    _Scheduler.scheduleMode = TSOS.ScheduleMode.RR;
                    break;
                case "FCFS":
                    _Scheduler.scheduleMode = TSOS.ScheduleMode.FCFS;
                    break;
                case "P_SJF":
                    _Scheduler.scheduleMode = TSOS.ScheduleMode.P_SJF;
                    break;
                case "NP_P":
                    _Scheduler.scheduleMode = TSOS.ScheduleMode.NP_P;
                    break;
                default:
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: chsched <RR | FCFS | P_SJF | NP_P>\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
            }
            TSOS.Control.updatePcbMeta();
            return TSOS.ExitCode.SUCCESS;
        }
        static shellFormat(stdin, _stdout, stderr) {
            const args = stdin.input();
            let full = false;
            if (args.length === 1) {
                if (args[0] === "-full") {
                    full = true;
                }
                else if (args[0] !== "-quick") {
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: format [-quick | -full]\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
                }
            }
            else if (args.length > 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: format [-quick | -full]\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.format(full)
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellCreate(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: create <FILE>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.create(args[0])
                .catch_default()
                .and_do(_FileSystem.close(args[0]))
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellRead(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: read <FILE.sh>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.open(args[0])
                .and_try(_FileSystem.read(args[0])
                .and_try_run((_stderr, params) => { stdout.output([params[0]]); })
                .catch_default()
                .and_do(_FileSystem.close(args[0])))
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellWrite(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 2) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: write <FILE> <TEXT>...\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.open(args[0])
                .and_try(_FileSystem.write(args[0], args[1])
                .catch_default()
                .and_do(_FileSystem.close(args[0])))
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellDelete(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length === 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: delete <FILE>...\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            for (const arg of args) {
                _FileSystem.delete(arg)
                    .catch_default()
                    .execute(stderr);
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellCopy(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 2) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: copy <FILE> <COPY_FILE>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.copy(args[0], args[1])
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellRename(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 2) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: rename <FILE> <NEW_FILE>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.rename(args[0], args[1])
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellLs(stdin, stdout, stderr) {
            const args = stdin.input();
            let sh_hidden = false;
            let list = false;
            if (args.length == 1) {
                if (args[0] === "-a") {
                    sh_hidden = true;
                }
                else if (args[0] === "-l") {
                    list = true;
                }
                else if (args[0] === "-la") {
                    sh_hidden = true;
                    list = true;
                }
                else if (args[0] === "-al") {
                    sh_hidden = true;
                    list = true;
                }
                else {
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: ls [-la]\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
                }
            }
            else if (args.length == 2) {
                if ((args[0] === "-a" && args[1] === "-l") || (args[0] === "-l" && args[1] === "-a")) {
                    sh_hidden = true;
                    list = true;
                }
                else {
                    stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: ls [-la]\n"]);
                    return TSOS.ExitCode.SHELL_MISUSE;
                }
            }
            else if (args.length > 2) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: ls [-la]\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.ls(stdout, sh_hidden, list)
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellRecover(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: recover <FILE>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.recover(args[0])
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellDiskGC(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: diskgc\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.garbageCollect()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellDefrag(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: defrag\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.defragment()
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellShell(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: shell <FILE.sh>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            if (!args[0].match(/^.+\.sh$/)) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - The provided file is not a .sh (shell) file.\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            _FileSystem.open(args[0])
                .and_try(_FileSystem.read(args[0])
                .and_try_run((_stderr, params) => {
                _OsShell.handleInput(params[0]);
                _Console.redrawCanvas();
            })
                .catch_default()
                .and_do(_FileSystem.close(args[0])))
                .catch_default()
                .execute(stderr);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellGrep(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length < 2) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: grep <PATTERN> <FILE>...\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            for (let i = 1; i < args.length; i++) {
                _FileSystem.open(args[i])
                    .and_try(_FileSystem.read(args[i])
                    .and_try_run((_stderr, params) => {
                    const lines = params[0].split(/(\r?\n)+/);
                    let matches = [];
                    for (const line of lines) {
                        if (line.match(args[0])) {
                            matches.push(line);
                        }
                    }
                    if (matches.length > 0) {
                        stdout.output([matches.join("\n") + (i === args.length - 1 ? "" : "\n")]);
                    }
                })
                    .catch_default()
                    .and_do(_FileSystem.close(args[i])))
                    .catch_default()
                    .execute(stderr);
            }
            return TSOS.ExitCode.SUCCESS;
        }
        static shellGetSchedule(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 0) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: getschedule\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            let mode = "";
            switch (_Scheduler.scheduleMode) {
                case TSOS.ScheduleMode.RR:
                    mode = "Round Robin";
                    break;
                case TSOS.ScheduleMode.FCFS:
                    mode = "First Come First Served";
                    break;
                case TSOS.ScheduleMode.P_SJF:
                    mode = "Preemptive Shortest Job First";
                    break;
                case TSOS.ScheduleMode.NP_P:
                    mode = "Non-Preemptive Priority";
                    break;
            }
            stdout.output([mode + "\n"]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellLink(stdin, stdout, stderr) {
            //TODO
            return TSOS.ExitCode.SUCCESS;
        }
        static shellAlias(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 2) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: alias <COMMAND> <ALIAS>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            let command = ShellCommand.COMMAND_LIST.find(cmd => { return cmd.command === args[0] || cmd.command.includes(args[0]); });
            if (command === undefined) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + ` - Could not find command ${args[0]}\n`]);
                return TSOS.ExitCode.CANNOT_EXECUTE_COMMAND;
            }
            if (command.command === args[1] || command.aliases.includes(args[1])) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + ` - Command ${args[0]} already has alias ${args[1]}\n`]);
                return TSOS.ExitCode.CANNOT_EXECUTE_COMMAND;
            }
            command.aliases.push(args[1]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellInfo(stdin, stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: info <FILE>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            const tsb = _DiskController.get_file(args[0]);
            if (tsb === 0) {
                stderr.error([TSOS.ExitCode.GENERIC_ERROR.shellDesc() + ` - File ${args[0]} not found\n`]);
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            stdout.output([`Size: ${_DiskController.file_size(tsb)} Bytes\nDate Created: ${_DiskController.file_create_date(tsb)}\n`]);
            return TSOS.ExitCode.SUCCESS;
        }
        static shellSave(stdin, _stdout, stderr) {
            const args = stdin.input();
            if (args.length !== 1) {
                stderr.error([TSOS.ExitCode.SHELL_MISUSE.shellDesc() + " - Invalid argument. Usage: save <FILE>\n"]);
                return TSOS.ExitCode.SHELL_MISUSE;
            }
            if (!_DiskController.is_formatted()) {
                stderr.error([TSOS.ExitCode.GENERIC_ERROR.shellDesc() + " - Disk is not formatted. Please use 'format' command."]);
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            const bin = ShellCommand.getProgramInputBin();
            if (bin.some(Number.isNaN)) {
                stderr.error([
                    TSOS.ExitCode.SHELL_MISUSE.shellDesc()
                        + " - Invalid binary syntax. Hex values must range from 0x00-0xFF, have the format of '0xFF' or 'FF', and be separated either by ' ' or ', '\"\n"
                ]);
                return TSOS.ExitCode.GENERIC_ERROR;
            }
            let file = args[0];
            if (!args[0].match(/^.+\.exe$/)) {
                file = args[0] + ".exe";
            }
            const write_command = _FileSystem.write(file, _DiskController.decode(bin))
                .catch_default()
                .and_do(_FileSystem.close(file));
            if (_DiskController.file_exists(file)) {
                _FileSystem.open(file)
                    .and_try(write_command)
                    .catch_default()
                    .execute(stderr);
            }
            else {
                _FileSystem.create(file)
                    .and_try(write_command)
                    .catch_default()
                    .execute(stderr);
            }
            return TSOS.ExitCode.SUCCESS;
        }
    }
    TSOS.ShellCommand = ShellCommand;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=shellCommand.js.map