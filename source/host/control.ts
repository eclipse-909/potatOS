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
module TSOS {
	export class Control {
		public static hostInit(): void {
			// This is called from index.html's onLoad event via the onDocumentLoad function pointer.
			// Get a global reference to the canvas.  TODO: Should we move this stuff into a Display Device Driver?
			_Canvas = <HTMLCanvasElement>document.getElementById('display');
			_Canvas.height = CANVAS_HEIGHT;
			_DrawingContext = _Canvas.getContext("2d");
			CanvasTextFunctions.enable(_DrawingContext);
			(<HTMLInputElement> document.getElementById("hostLog")).value="";
			(<HTMLInputElement> document.getElementById("btnStartOS")).focus();
			if (typeof Glados === "function") {
				_GLaDOS = new Glados();
				_GLaDOS.init();
			}
		}

		public static hostLog(msg: string, source: string = "?"): void {
			const clock: number = _OSclock;
			const now: number = new Date().getTime();
			const str: string = "({ clock:" + clock + ", source:" + source + ", msg:" + msg + ", now:" + now + " })" + "\n";
			const taLog = <HTMLInputElement>document.getElementById("hostLog");
			taLog.value = str + taLog.value;
			// TODO in the future: Optionally update a log database or some streaming service.
		}

		// Host Events
		public static hostBtnStartOS_click(btn): void {
			btn.disabled = true;
			(<HTMLButtonElement>document.getElementById("btnHaltOS")).disabled = false;
			(<HTMLButtonElement>document.getElementById("btnReset")).disabled = false;
			document.getElementById("display").focus();
			_Scheduler = new Scheduler();
			_MemoryController = new TSOS.MemoryController();
			_MMU = new MMU();
			_CPU = new Cpu();  // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
			_CPU.init();       //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.
			_hardwareClockID = setInterval(Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
			_Kernel = new Kernel();
			_Kernel.krnBootstrap();  // _GLaDOS.afterStartup() will get called in there, if configured.
			(document.getElementById("btnPause") as HTMLInputElement).disabled = false;
		}

		public static hostBtnHaltOS_click(btn): void {
			Control.hostLog("Emergency halt", "host");
			Control.hostLog("Attempting Kernel shutdown.", "host");
			_Kernel.krnShutdown();
			clearInterval(_hardwareClockID);
			// TODO: Is there anything else we need to do here?
			(document.getElementById("btnPause") as HTMLInputElement).disabled = true;
			(document.getElementById("btnStep") as HTMLInputElement).disabled = true;
		}

		public static hostBtnReset_click(btn): void {
			location.reload();
		}

		public static hostBtnPauseCpu(btn): void {
			_CPU.paused = !_CPU.paused;
			Control.hostLog(`CPU paused: ${_CPU.paused}`, "host");
			(document.getElementById("btnPause") as HTMLInputElement).value = _CPU.paused? "Unpause" : "Pause";
			(document.getElementById("btnStep") as HTMLInputElement).disabled = !_CPU.paused;
		}

		public static hostBtnStepCpu(btn): void {
			if (_KernelInterruptQueue.getSize() === 0) {
				_CPU.isExecuting? _CPU.cycle() : _Kernel.krnTrace("Idle");
			} else {
				_Kernel.krnTrace("Processing interrupt, try again");
			}
		}

		public static updateCpuDisplay(): void {
			document.getElementById("IR").innerHTML = OpCode[_CPU.IR];
			document.getElementById("PC").innerHTML = `0x${_CPU.PC.toString(16).toUpperCase().padStart(4, '0')}`;
			document.getElementById("Acc").innerHTML = `0x${_CPU.Acc.toString(16).toUpperCase().padStart(2, '0')}`;
			document.getElementById("xReg").innerHTML = `0x${_CPU.Xreg.toString(16).toUpperCase().padStart(2, '0')}`;
			document.getElementById("yReg").innerHTML = `0x${_CPU.Yreg.toString(16).toUpperCase().padStart(2, '0')}`;
			document.getElementById("zFlag").innerHTML = String(_CPU.Zflag);
		}

		public static updatePcbDisplay(): void {
			let str: string =
				"<tr>" +
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
						`<td>${Status[_Scheduler.currPCB.status]}</td>` +
						`<td>${OpCode[_Scheduler.currPCB.IR]}</td>` +
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

		public static updateMemDisplay(page: number = NaN): void {
			if (!_MemoryController) {return;}
			if (Number.isNaN(page)) {
				const input: HTMLInputElement = document.getElementById('numberInput') as HTMLInputElement;
				page = parseInt(input.value, 16);
				if (Number.isNaN(page)) {
					page = 0x00;
				}
			}
			let str: string = "";
			for (let i: number = 0x00; i < 0x100; i += 0x10) {
				str += `<tr><th>0x${(page * PAGE_SIZE + i).toString(16).toUpperCase().padStart(4, '0')}</th>`;
				for (let ii: number = 0x00; ii < 0x10; ii++) {
					str += `<td>0x${_MemoryController.ram[page * PAGE_SIZE + i + ii].toString(16).toUpperCase().padStart(2, '0')}</td>`;
				}
				str += "</tr>";
			}
			document.getElementById("memTable").innerHTML = str;
		}

		public static increaseValue(): void {
			const input: HTMLInputElement = document.getElementById('numberInput') as HTMLInputElement;
			let currentValue: number = parseInt(input.value, 16);
			if (currentValue < 255) {
				currentValue++;
				Control.updateMemDisplay(currentValue);
			} else {
				currentValue = 255;
			}
			input.value = "0x" + currentValue.toString(16).toUpperCase().padStart(2, '0');
		}

		public static decreaseValue(): void {
			const input: HTMLInputElement = document.getElementById('numberInput') as HTMLInputElement;
			let currentValue: number = parseInt(input.value, 16);
			if (currentValue > 0) {
				currentValue--;
				Control.updateMemDisplay(currentValue);
			} else {
				currentValue = 0;
			}
			input.value = "0x" + currentValue.toString(16).toUpperCase().padStart(2, '0');
		}

		public static checkValue(): void {
			const input: HTMLInputElement = document.getElementById('numberInput') as HTMLInputElement;
			let currentValue: number = parseInt(input.value, 16);
			if (Number.isNaN(currentValue)) {
				currentValue = 0;
				input.value = "0x00";
			}
			Control.updateMemDisplay(currentValue);
		}
	}
}