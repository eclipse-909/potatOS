/* ------------
     Control.ts

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the prevLines are blurred, because we are using TypeScript/JavaScript
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
            _DrawingContext = _Canvas.getContext("2d");
            _DrawingContext.font = '16px "DejaVu Sans Mono", monospace';
            _DrawingContext.fillStyle = "#000000";
            // CanvasTextFunctions.enable(_DrawingContext);
            document.getElementById("hostLog").value = "";
            document.getElementById("btnStartOS").focus();
            if (typeof Glados === "function") {
                _GLaDOS = new Glados();
                _GLaDOS.init();
            }
        }
        static hostLog(msg, source = "?") {
            const clock = _OSclock;
            const now = new Date().getTime();
            const str = "({ clock:" + clock + ", source:" + source + ", msg:" + msg + ", now:" + now + " })" + "\n";
            const taLog = document.getElementById("hostLog");
            if (taLog.value.split('\n').length >= 1500) {
                taLog.value = ""; //It gets really slow if you leave it
            }
            taLog.value = str + taLog.value;
            // TODO in the future: Optionally update a log database or some streaming service.
        }
        // Host Events
        static hostBtnStartOS_click(btn) {
            btn.disabled = true;
            document.getElementById("btnHaltOS").disabled = false;
            document.getElementById("btnReset").disabled = false;
            document.getElementById("display").focus();
            _Scheduler = new TSOS.Scheduler();
            Control.updatePcbMeta();
            _Dispatcher = new TSOS.Dispatcher();
            _Swapper = new TSOS.Swapper();
            _MemoryController = new TSOS.MemoryController();
            _DiskController = new TSOS.DiskController();
            _MMU = new TSOS.MMU();
            _CPU = new TSOS.Cpu(); // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
            _CPU.init(); //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.
            _hardwareClockID = setInterval(TSOS.Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
            _Kernel = new TSOS.Kernel();
            _Kernel.krnBootstrap(); // _GLaDOS.afterStartup() will get called in there, if configured.
            document.getElementById("btnPause").disabled = false;
        }
        static hostBtnHaltOS_click(btn) {
            Control.hostLog("Emergency halt", "host");
            Control.hostLog("Attempting Kernel shutdown.", "host");
            _Kernel.krnShutdown();
            clearInterval(_hardwareClockID);
            // TODO: Is there anything else we need to do here?
            document.getElementById("btnPause").disabled = true;
            document.getElementById("btnStep").disabled = true;
        }
        static hostBtnReset_click(btn) {
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
                Control.updateCpuDisplay();
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
            document.getElementById("Quantum").innerHTML = `Quantum: ${_Scheduler.cycle}/${_Scheduler.quantum}`;
        }
        static updatePcbDisplay() {
            let str = "<tr>" +
                "<th>PID</th>" +
                "<th>Status</th>" +
                "<th>Priority</th>" +
                "<th>Location</th>" + //location means - memory/disk
                "<th>Segment</th>" + //0, 1, 2, or N/A
                "<th>Base</th>" +
                "<th>Limit</th>" +
                "<th>IR</th>" +
                "<th>PC</th>" +
                "<th>Acc</th>" +
                "<th>Xreg</th>" +
                "<th>Yreg</th>" +
                "<th>Zflag</th>" +
                "</tr>";
            _Scheduler.updateCurrPCB();
            _Scheduler.allProcs().forEach((pcb) => {
                str += Control.appendPcbTable(pcb);
            });
            document.getElementById("pcbTable").innerHTML = str;
        }
        static appendPcbTable(pcb) {
            return "<tr>" +
                `<td>${pcb.pid.toString()}</td>` +
                `<td>${TSOS.Status[pcb.status]}</td>` +
                `<td>${pcb.priority}</td>` +
                `<td>${pcb.onDisk ? "Disk" : "Memory"}</td>` +
                "<td>" + (pcb.onDisk ? "N/A" : pcb.segment) + "</td>" +
                "<td>" + (pcb.onDisk ? "N/A" : `0x${pcb.base.toString(16).toUpperCase().padStart(4, '0')}`) + "</td>" +
                "<td>" + (pcb.onDisk ? "N/A" : `0x${pcb.limit.toString(16).toUpperCase().padStart(4, '0')}`) + "</td>" +
                `<td>${TSOS.OpCode[pcb.IR]}</td>` +
                `<td>0x${pcb.PC.toString(16).toUpperCase().padStart(4, '0')}</td>` +
                `<td>0x${pcb.Acc.toString(16).toUpperCase().padStart(2, '0')}</td>` +
                `<td>0x${pcb.Xreg.toString(16).toUpperCase().padStart(2, '0')}</td>` +
                `<td>0x${pcb.Yreg.toString(16).toUpperCase().padStart(2, '0')}</td>` +
                `<td>${pcb.Zflag}</td>` +
                "</tr>";
        }
        static updatePcbMeta() {
            let mode;
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
            document.getElementById("scheduleMode").innerHTML = "Schedule Mode: " + mode;
            const quantum = document.getElementById("Quantum");
            quantum.style.display = _Scheduler.scheduleMode === TSOS.ScheduleMode.RR ? 'flex' : 'none';
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
                str += `<tr><th>0x${(page * _MMU.segmentSize + i).toString(16).toUpperCase().padStart(4, '0')}</th>`;
                for (let ii = 0x00; ii < 0x10; ii++) {
                    str += `<td>0x${_MemoryController.ram[page * _MMU.segmentSize + i + ii].toString(16).toUpperCase().padStart(2, '0')}</td>`;
                }
                str += "</tr>";
            }
            document.getElementById("memTable").innerHTML = str;
        }
        static increaseValue() {
            const input = document.getElementById('numberInput');
            let currentValue = parseInt(input.value, 16);
            if (currentValue < NUM_PAGES - 1) {
                currentValue++;
                Control.updateMemDisplay(currentValue);
            }
            else {
                currentValue = NUM_PAGES - 1;
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
        static createPotato() {
            const container = document.getElementById('potato-container');
            const potato = document.createElement("div");
            potato.classList.add("potato");
            // randomize horizontal position, fall duration, and size
            potato.style.left = `${Math.random() * 100}vw`;
            potato.style.animationDuration = `${2 + Math.random() * 4}s`;
            potato.style.width = `${50 + Math.random() * 70}px`;
            // randomize rotation direction and initial angle
            const spinDirection = Math.random() < 0.5 ? 'fall-cw' : 'fall-ccw';
            const startAngle = Math.random() * 360;
            potato.style.transform = `rotate(${startAngle}deg)`;
            potato.style.animation = `${spinDirection} linear ${potato.style.animationDuration}`;
            container.appendChild(potato);
            // Remove the potato after it falls out of view
            potato.addEventListener("animationend", () => {
                potato.remove();
            });
        }
        static onwheel(event) {
            event.preventDefault();
            _Console.scrollBy(event.deltaY < 0 ? -3 : 3);
            _Console.redrawCanvas();
        }
        static updateDiskDisplay() {
            document.getElementById("fileIndexTable").innerHTML = "<tr>" +
                "<th>TSB</th>" +
                "<th>In-Use</th>" +
                "<th>Next TSB</th>" +
                "<th>Name Len</th>" +
                "<th>Data Len</th>" +
                "<th>Create Date</th>" +
                "<th>Data</th>" +
                "</tr>" + _DiskController.get_html_table_file_index_string();
            document.getElementById("fileTable").innerHTML = _DiskController.get_html_table_file_string();
        }
    }
    TSOS.Control = Control;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=control.js.map