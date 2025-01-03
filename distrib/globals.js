/* ------------
   Globals.ts

   Global CONSTANTS and _Variables.
   (Global over both the OS and Hardware Simulation / Host.)

   This code references page numbers in our text book:
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */
//
// Global CONSTANTS (TypeScript 1.5 introduced const. Very cool.)
//
const APP_NAME = "potatOS"; // 'cause Bob and I were at a loss for a better name.
const APP_VERSION = "0.4.13"; // What did you expect?
const CPU_CLOCK_INTERVAL = 0; // This is in ms (milliseconds) so 1000 = 1 second.
var IRQ;
(function (IRQ) {
    IRQ[IRQ["timer"] = 0] = "timer";
    // NOTE: The timer is different from hardware/host clock pulses. Don't confuse these.
    IRQ[IRQ["keyboard"] = 1] = "keyboard";
    IRQ[IRQ["kill"] = 2] = "kill";
    IRQ[IRQ["writeIntConsole"] = 3] = "writeIntConsole";
    IRQ[IRQ["writeStrConsole"] = 4] = "writeStrConsole";
    IRQ[IRQ["contextSwitch"] = 5] = "contextSwitch";
    IRQ[IRQ["disk"] = 6] = "disk";
})(IRQ || (IRQ = {}));
const KEYBOARD_IRQ = IRQ.keyboard; //Stupid glados always making me do stuff
const PAGE_SIZE = 0x100;
const NUM_PAGES = 0x03;
const MEM_SIZE = PAGE_SIZE * NUM_PAGES;
//bytes are unchecked
function leToU16(lowByte, highByte) { return (highByte << 8) | lowByte; }
//
// Global Variables
// TODO: Make a global object and use that instead of the "_" naming convention in the global namespace.
//
let _CPU; // Utilize TypeScript's type annotation system to ensure that _CPU is an instance of the Cpu class.
let _MemoryController;
let _DiskController;
let _MMU;
let _OSclock = 0; // Page 23.
//let _Mode: number = 0;     // (currently unused)  0 = Kernel Mode, 1 = User Mode.  See page 21.
let _Canvas; // Initialized in Control.hostInit().
const CANVAS_NUM_LINES = 30;
let _DrawingContext; // Assigned here for type safety, but re-initialized in Control.hostInit() for OCD and logic.
// const _FontFamily: string = "sans"; // Ignored, I think. The was just a place-holder in 2008, but the HTML canvas may have use for it.
const _FontSize = 13;
const _FontHeightMargin = 4; // Additional space added to font size when advancing a line.
const CANVAS_MARGIN = 5;
const CANVAS_HEIGHT = CANVAS_NUM_LINES * _FontSize + (CANVAS_NUM_LINES - 1) * _FontHeightMargin + 2 * CANVAS_MARGIN;
let _Trace = true; // Default the OS trace to be on.
// The OS Kernel and its queues.
let _Kernel;
let _KernelInterruptQueue = null;
let _KernelInputQueue = null;
let _KernelBuffers = null;
let _Scheduler = null;
let _Dispatcher = null;
let _Swapper = null;
// Standard input, output, and error
let _StdIn = null;
let _StdOut = null;
let _StdErr = null;
// UI
let _Console;
let _OsShell;
// At least this OS is not trying to kill you. (Yet.)
let _SarcasticMode = false;
// Global Device Driver Objects - page 12
let _krnKeyboardDriver = null;
let _krnDiskDriver = null;
let _FileSystem = null;
let _hardwareClockID = null;
// For testing (and enrichment)...
const Glados = null; // This is the function Glados() in glados-ip*.js http://alanclasses.github.io/TSOS/test/ .
let _GLaDOS = null; // If the above is linked in, this is the instantiated instance of Glados.
const onDocumentLoad = () => {
    setInterval(TSOS.Control.createPotato, 300);
    TSOS.Control.hostInit();
    setInterval(() => {
        document.getElementById("footerDate").innerHTML = new Date().toString();
    }, 1000);
};
//# sourceMappingURL=globals.js.map