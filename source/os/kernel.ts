/* ------------
     Kernel.ts

     Routines for the Operating System, NOT the host.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

module TSOS {
	export class Kernel {
		// OS Startup and Shutdown Routines
		public krnBootstrap(): void {      // Page 8. {
			Control.hostLog("bootstrap", "host");  // Use hostLog because we ALWAYS want this, even if _Trace is off.
			_KernelInterruptQueue = new Queue<Interrupt>();  // A (currently) non-priority queue for interrupt requests (IRQs).
			_KernelBuffers = [];         // Buffers... for the kernel.
			_KernelInputQueue = new Queue<string>();      // Where device input lands before being processed out somewhere.
			_Console = new Console();             // The command line interface / console I/O device.
			_Console.init();
			_StdIn  = _Console;
			_StdOut = _Console;
			_StdErr = _Console;
			this.krnTrace("Loading the keyboard device driver.");
			_krnKeyboardDriver = new DeviceDriverKeyboard();     // Construct it.
			_krnKeyboardDriver.driverEntry();                    // Call the driverEntry() initialization routine.
			this.krnTrace(_krnKeyboardDriver.status);

			// ... more?

			this.krnTrace("Enabling the interrupts.");
			this.krnEnableInterrupts();
			this.krnTrace("Creating and Launching the shell.");
			_OsShell = new Shell();
			_OsShell.init();
			if (_GLaDOS) {
				_GLaDOS.afterStartup();
			}
		}

		public krnShutdown(): void {
			this.krnTrace("begin shutdown OS");
			// TODO: Check for running processes.  If there are some, alert and stop. Else...
			// ... Disable the Interrupts.
			this.krnTrace("Disabling the interrupts.");
			this.krnDisableInterrupts();
			//
			// Unload the Device Drivers?
			// More?
			//
			this.krnTrace("end shutdown OS");
		}

		public krnOnCPUClockPulse(): void {
			// Check for an interrupt, if there are any. Page 560
			if (_KernelInterruptQueue.getSize() > 0) {
				// Process the first interrupt on the interrupt queue.
				// TODO (maybe): Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
				const interrupt: Interrupt = _KernelInterruptQueue.dequeue();
				this.krnInterruptHandler(interrupt.irq, interrupt.params);
			} else if (_CPU.isExecuting) { // If there are no interrupts then run one CPU cycle if there is anything being processed.
				if (!_CPU.paused) {
					_CPU.cycle();
				}
			} else {                       // If there are no interrupts and there is nothing being executed then just be idle.
				this.krnTrace("Idle");
			}
		}

		// Interrupt Handling
		public krnEnableInterrupts(): void {
			Devices.hostEnableKeyboardInterrupt();
			// Put more here.
		}

		public krnDisableInterrupts(): void {
			Devices.hostDisableKeyboardInterrupt();
			// Put more here.
		}

		public krnInterruptHandler(irq: number, params: any[]): void {
			this.krnTrace("Handling IRQ~" + irq);

			// Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
			// TODO: Consider using an Interrupt Vector in the future.
			// Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.
			//       Maybe the hardware simulation will grow to support/require that in the future.
			switch (irq) {
				case IRQ.timer:
					this.krnTimerISR();               // Kernel built-in routine for timers (not the clock).
					break;
				case IRQ.keyboard:
					_krnKeyboardDriver.isr(params);   // Kernel mode device driver
					_StdIn.handleInput();
					break;
				case IRQ.kill:
					kill(params[0], params[1]);
					break;
				case IRQ.writeIntConsole:
					writeIntStdOut(params[0], params[1]);
					break;
				case IRQ.writeStrConsole:
					writeStrStdOut(params[0], params[1]);
					break;
				case IRQ.contextSwitch:
					if (_Scheduler.currPCB === null) {
						_CPU.isExecuting = false;
						_Scheduler.cycle = 0;
						_Dispatcher.contextSwitch();
					} else if (_Scheduler.scheduleMode === ScheduleMode.RR && (_Scheduler.cycle === _Scheduler.quantum * -1 || _Scheduler.cycle === _Scheduler.quantum)) {
						_Scheduler.cycle = 0;
						_Dispatcher.contextSwitch();
					}
					break;
				default:
					this.krnTrapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
			}
		}

		public krnTimerISR(): void {
			// The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver). {
			// Check multiprogramming parameters and enforce quanta here. Call the scheduler / context switch here if necessary.
			// Or do it elsewhere in the Kernel. We don't really need this.
		}

		// OS Utility Routines
		public krnTrace(msg: string): void {
			if (_Trace) {
				if (msg === "Idle") {
					// We can't log every idle clock pulse because it would quickly lag the browser.
					if (_OSclock % 10 == 0) {
						// Check the CPU_CLOCK_INTERVAL in globals.ts for an
						// idea of the tick rate and adjust this line accordingly.
						Control.hostLog(msg, "OS");
					}
				} else {
					Control.hostLog(msg, "OS");
				}
			}
		}

		public krnTrapError(msg: string): void {
			Control.hostLog("OS ERROR - TRAP: " + msg);
			_Console.clearScreen();
			const image = new Image();
			image.src = './img/Bsodwindows10.png';
			image.onload = (): void => {
				_DrawingContext.drawImage(image, 0, 0);
			};
			image.onerror = (error: string | Event): void => {
				console.error('Failed to load image:', error);
			};
			this.krnShutdown();
			clearInterval(_hardwareClockID);
		}
	}
}