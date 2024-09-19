/* ------------
     Control.ts

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the lines are blurred, because we are using TypeScript/JavaScript
     in both the host and client environments.

     This (and other host/simulation scripts) is the only place that we should see "web" code, such as
     DOM manipulation and event handling, and so on.  (Index.html is -- obviously -- the only place for markup.)

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
//
// Control Services
//
var TSOS;
(function (TSOS) {
    class Control {
        static hostInit() {
            // This is called from index.html's onLoad event via the onDocumentLoad function pointer.
            // Get a global reference to the canvas.  TODO: Should we move this stuff into a Display Device Driver?
            _Canvas = document.getElementById('display');
            _Canvas.height = CANVAS_HEIGHT;
            // Get a global reference to the drawing context.
            _DrawingContext = _Canvas.getContext("2d");
            // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
            TSOS.CanvasTextFunctions.enable(_DrawingContext); // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.
            // Clear the log text box.
            // Use the TypeScript cast to HTMLInputElement
            document.getElementById("hostLog").value = "";
            // Set focus on the start button.
            // Use the TypeScript cast to HTMLInputElement
            document.getElementById("btnStartOS").focus();
            // Check for our testing and enrichment core, which
            // may be referenced here (from index.html) as function Glados().
            if (typeof Glados === "function") {
                // function Glados() is here, so instantiate Her into
                // the global (and properly capitalized) _GLaDOS variable.
                _GLaDOS = new Glados();
                _GLaDOS.init();
            }
        }
        static hostLog(msg, source = "?") {
            // Note the OS CLOCK.
            const clock = _OSclock;
            // Note the REAL clock in milliseconds since January 1, 1970.
            const now = new Date().getTime();
            // Build the log string.
            const str = "({ clock:" + clock + ", source:" + source + ", msg:" + msg + ", now:" + now + " })" + "\n";
            // Update the log console.
            const taLog = document.getElementById("hostLog");
            taLog.value = str + taLog.value;
            // TODO in the future: Optionally update a log database or some streaming service.
        }
        //
        // Host Events
        //
        static hostBtnStartOS_click(btn) {
            // Disable the (passed-in) start button...
            btn.disabled = true;
            // .. enable the Halt and Reset buttons ...
            document.getElementById("btnHaltOS").disabled = false;
            document.getElementById("btnReset").disabled = false;
            // .. set focus on the OS console display ...
            document.getElementById("display").focus();
            _Scheduler = new TSOS.Scheduler();
            _MemoryController = new TSOS.MemoryController();
            _MMU = new TSOS.MMU();
            // ... Create and initialize the CPU (because it's part of the hardware)  ...
            _CPU = new TSOS.Cpu(); // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
            _CPU.init(); //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.
            // ... then set the host clock pulse ...
            _hardwareClockID = setInterval(TSOS.Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
            // .. and call the OS Kernel Bootstrap routine.
            _Kernel = new TSOS.Kernel();
            _Kernel.krnBootstrap(); // _GLaDOS.afterStartup() will get called in there, if configured.
            document.getElementById("btnPause").disabled = false;
        }
        static hostBtnHaltOS_click(btn) {
            Control.hostLog("Emergency halt", "host");
            Control.hostLog("Attempting Kernel shutdown.", "host");
            // Call the OS shutdown routine.
            _Kernel.krnShutdown();
            // Stop the interval that's simulating our clock pulse.
            clearInterval(_hardwareClockID);
            // TODO: Is there anything else we need to do here?
            document.getElementById("btnPause").disabled = true;
            document.getElementById("btnStep").disabled = true;
        }
        static hostBtnReset_click(btn) {
            // The easiest and most thorough way to do this is to reload (not refresh) the document.
            // But the documentation for the reload function says it's the same as clicking the refresh button.
            location.reload();
        }
        static hostBtnPauseCpu(btn) {
            _CPU.paused = !_CPU.paused;
            Control.hostLog(`CPU paused: ${_CPU.paused}`, "host");
            document.getElementById("btnPause").value = _CPU.paused ? "Unpause" : "Pause";
            document.getElementById("btnStep").disabled = !_CPU.paused;
        }
        static hostBtnStepCpu(btn) {
            if (_KernelInterruptQueue.getSize() === 0) {
                _CPU.isExecuting ? _CPU.cycle() : _Kernel.krnTrace("Idle");
            }
            else {
                _Kernel.krnTrace("Processing interrupt, try again");
            }
        }
        static updateCpuDisplay() {
            document.getElementById("IR").innerHTML = TSOS.OpCode[_CPU.IR];
            document.getElementById("PC").innerHTML = `0x${_CPU.PC.toString(16).toUpperCase().padStart(4, '0')}`;
            document.getElementById("Acc").innerHTML = `0x${_CPU.Acc.toString(16).toUpperCase().padStart(2, '0')}`;
            document.getElementById("xReg").innerHTML = `0x${_CPU.Xreg.toString(16).toUpperCase().padStart(2, '0')}`;
            document.getElementById("yReg").innerHTML = `0x${_CPU.Yreg.toString(16).toUpperCase().padStart(2, '0')}`;
            document.getElementById("zFlag").innerHTML = String(_CPU.Zflag);
        }
        static updatePcbDisplay() {
            let str = "<tr>" +
                "<th>PID</th>" +
                "<th>Status</th>" +
                "<th>IR</th>" +
                "<th>PC</th>" +
                "<th>Acc</th>" +
                "<th>Xreg</th>" +
                "<th>Yreg</th>" +
                "<th>Zflag</th>" +
                "</tr>";
            if (_Scheduler.currPCB) {
                _Scheduler.currPCB.IR = _CPU.IR;
                _Scheduler.currPCB.PC = _CPU.PC;
                _Scheduler.currPCB.Acc = _CPU.Acc;
                _Scheduler.currPCB.Xreg = _CPU.Xreg;
                _Scheduler.currPCB.Yreg = _CPU.Yreg;
                _Scheduler.currPCB.Zflag = _CPU.Zflag;
                str +=
                    "<tr>" +
                        `<td>${_Scheduler.currPCB.pid.toString()}</td>` +
                        `<td>${TSOS.Status[_Scheduler.currPCB.status]}</td>` +
                        `<td>${TSOS.OpCode[_Scheduler.currPCB.IR]}</td>` +
                        `<td>0x${_Scheduler.currPCB.PC.toString(16).toUpperCase().padStart(4, '0')}</td>` +
                        `<td>0x${_Scheduler.currPCB.Acc.toString(16).toUpperCase().padStart(2, '0')}</td>` +
                        `<td>0x${_Scheduler.currPCB.Xreg.toString(16).toUpperCase().padStart(2, '0')}</td>` +
                        `<td>0x${_Scheduler.currPCB.Yreg.toString(16).toUpperCase().padStart(2, '0')}</td>` +
                        `<td>${_Scheduler.currPCB.Zflag}</td>` +
                        "</tr>";
            }
            //TODO loop through all PCBs in queue and append those to str
            document.getElementById("pcbTable").innerHTML = str;
        }
        static updateMemDisplay(page = NaN) {
            if (!_MemoryController) {
                return;
            }
            if (Number.isNaN(page)) {
                const input = document.getElementById('numberInput');
                page = parseInt(input.value, 16);
                if (Number.isNaN(page)) {
                    page = 0x00;
                }
            }
            let str = "";
            for (let i = 0x00; i < 0x100; i += 0x10) {
                str += `<tr><th>0x${(page * PAGE_SIZE + i).toString(16).toUpperCase().padStart(4, '0')}</th>`;
                for (let ii = 0x00; ii < 0x10; ii++) {
                    str += `<td>0x${_MemoryController.ram[page * PAGE_SIZE + i + ii].toString(16).toUpperCase().padStart(2, '0')}</td>`;
                }
                str += "</tr>";
            }
            document.getElementById("memTable").innerHTML = str;
        }
        static increaseValue() {
            const input = document.getElementById('numberInput');
            let currentValue = parseInt(input.value, 16);
            if (currentValue < 255) {
                currentValue++;
                Control.updateMemDisplay(currentValue);
            }
            else {
                currentValue = 255;
            }
            input.value = "0x" + currentValue.toString(16).toUpperCase().padStart(2, '0');
        }
        static decreaseValue() {
            const input = document.getElementById('numberInput');
            let currentValue = parseInt(input.value, 16);
            if (currentValue > 0) {
                currentValue--;
                Control.updateMemDisplay(currentValue);
            }
            else {
                currentValue = 0;
            }
            input.value = "0x" + currentValue.toString(16).toUpperCase().padStart(2, '0');
        }
        static checkValue() {
            const input = document.getElementById('numberInput');
            let currentValue = parseInt(input.value, 16);
            if (Number.isNaN(currentValue)) {
                currentValue = 0;
                input.value = "0x00";
            }
            Control.updateMemDisplay(currentValue);
        }
    }
    TSOS.Control = Control;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=control.js.map