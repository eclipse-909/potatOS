/* ------------
     Kernel.ts

     Routines for the Operating System, NOT the host.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
var TSOS;
(function (TSOS) {
    class Kernel {
        // OS Startup and Shutdown Routines
        krnBootstrap() {
            TSOS.Control.hostLog("bootstrap", "host"); // Use hostLog because we ALWAYS want this, even if _Trace is off.
            _KernelInterruptQueue = new TSOS.Queue(); // A (currently) non-priority queue for interrupt requests (IRQs).
            _KernelBuffers = []; // Buffers... for the kernel.
            _KernelInputQueue = new TSOS.Queue(); // Where device input lands before being processed out somewhere.
            _Console = new TSOS.Console(); // The command line interface / console I/O device.
            _Canvas.addEventListener("wheel", TSOS.Control.onwheel);
            _StdIn = _Console;
            _StdOut = _Console;
            _StdErr = _Console;
            this.krnTrace("Loading the keyboard device driver.");
            _krnKeyboardDriver = new TSOS.DeviceDriverKeyboard(); // Construct it.
            _krnKeyboardDriver.driverEntry(); // Call the driverEntry() initialization routine.
            this.krnTrace(_krnKeyboardDriver.status);
            // ... more?
            this.krnTrace("Enabling the interrupts.");
            this.krnEnableInterrupts();
            this.krnTrace("Creating and Launching the shell.");
            _OsShell = new TSOS.Shell();
            _Console.init();
            if (_GLaDOS) {
                _GLaDOS.afterStartup();
            }
            //All errors are caught and handled via BSOD
            window.onerror = (message, _source, _lineno, _colno, _error) => {
                _Kernel.krnTrapError(message.toString());
            };
            window.onunhandledrejection = (event) => {
                _Kernel.krnTrapError(event.reason);
            };
        }
        krnShutdown() {
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
        krnOnCPUClockPulse() {
            // Check for an interrupt, if there are any. Page 560
            if (_KernelInterruptQueue.getSize() > 0) {
                // Process the first interrupt on the interrupt queue.
                // TODO (maybe): Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
                const interrupt = _KernelInterruptQueue.dequeue();
                this.krnInterruptHandler(interrupt.irq, interrupt.params);
            }
            else if (_CPU.isExecuting) { // If there are no interrupts then run one CPU cycle if there is anything being processed.
                if (!_CPU.paused) {
                    _CPU.cycle();
                }
            }
            else { // If there are no interrupts and there is nothing being executed then just be idle.
                this.krnTrace("Idle");
            }
        }
        // Interrupt Handling
        krnEnableInterrupts() {
            TSOS.Devices.hostEnableKeyboardInterrupt();
            // Put more here.
        }
        krnDisableInterrupts() {
            TSOS.Devices.hostDisableKeyboardInterrupt();
            // Put more here.
        }
        krnInterruptHandler(irq, params) {
            this.krnTrace("Handling IRQ~" + irq);
            // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
            // TODO: Consider using an Interrupt Vector in the future.
            // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.
            //       Maybe the hardware simulation will grow to support/require that in the future.
            switch (irq) {
                case IRQ.timer:
                    this.krnTimerISR(); // Kernel built-in routine for timers (not the clock).
                    break;
                case IRQ.keyboard:
                    _krnKeyboardDriver.isr(params); // Kernel mode device driver
                    _StdIn.input();
                    break;
                case IRQ.kill:
                    TSOS.kill(params[0], params[1]);
                    break;
                case IRQ.writeIntConsole:
                    TSOS.writeIntStdOut(params[0], params[1]);
                    break;
                case IRQ.writeStrConsole:
                    TSOS.writeStrStdOut(params[0], params[1]);
                    break;
                case IRQ.contextSwitch:
                    if (_Scheduler.currPCB === null) {
                        _CPU.isExecuting = false;
                        _Scheduler.cycle = 0;
                    }
                    _Dispatcher.contextSwitch();
                    break;
                default:
                    this.krnTrapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
            }
        }
        krnTimerISR() {
            // The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver). {
            // Check multiprogramming parameters and enforce quanta here. Call the scheduler / context switch here if necessary.
            // Or do it elsewhere in the Kernel. We don't really need this.
        }
        // OS Utility Routines
        krnTrace(msg) {
            if (_Trace) {
                if (msg === "Idle") {
                    // We can't log every idle clock pulse because it would quickly lag the browser.
                    if (_OSclock % 10 == 0) {
                        // Check the CPU_CLOCK_INTERVAL in globals.ts for an
                        // idea of the tick rate and adjust this line accordingly.
                        TSOS.Control.hostLog(msg, "OS");
                    }
                }
                else {
                    TSOS.Control.hostLog(msg, "OS");
                }
            }
        }
        krnTrapError(msg) {
            TSOS.Control.hostLog("OS ERROR - TRAP: " + msg);
            _Console.clearScreen();
            const image = new Image();
            image.src = './img/Bsodwindows10.png';
            image.onload = () => {
                _DrawingContext.fillStyle = "#0078D7";
                _DrawingContext.fillRect(0, 0, _Canvas.width, _Canvas.height);
                _DrawingContext.drawImage(image, 0, 0);
            };
            image.onerror = (error) => {
                console.error('Failed to load image:', error);
            };
            this.krnShutdown();
            clearInterval(_hardwareClockID);
        }
    }
    TSOS.Kernel = Kernel;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=kernel.js.map