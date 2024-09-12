var TSOS;
(function (TSOS) {
    class ProcessControlBlock {
        pid;
        pageTable;
        PC;
        Acc;
        Xreg;
        Yreg;
        Zflag;
        static highestPID = 0;
        constructor() { }
        //BTW this syntax for making new objects is objectively better than having a special function for a constructor.
        //Takes in the program's binary and creates a process control block out of it.
        //Returns the process control block if successful, or undefined if it could not allocate enough memory.
        //Allocated memory is freed if aborted, but you must call ProcessControlBlock.free() when deleting the pcb that was returned.
        static new(bin) {
            let pcb = new ProcessControlBlock();
            pcb.pid = ProcessControlBlock.highestPID;
            ProcessControlBlock.highestPID++;
            pcb.pageTable = new Map();
            pcb.Acc = 0x00;
            pcb.Xreg = 0x00;
            pcb.Yreg = 0x00;
            pcb.Zflag = false;
            /*TODO uncomment this after the demo
            //Allocate as many pages as necessary for this program
            let orgPtr: number | undefined = undefined;
            for (let i: number = 0; i < Math.ceil(bin.length / PAGE_SIZE); i++) {
                const pagePtr: number | undefined = _MMU.malloc(pcb.pageTable);
                if (orgPtr === undefined) {
                    orgPtr = pagePtr;
                }
                if (pagePtr === undefined) {
                    //abort
                    pcb.free();
                    return undefined;
                }
                for (let ii: number = 0x0000; ii < Math.min(bin.length, PAGE_SIZE); ii++) {
                    _MMU.write(pagePtr + ii, bin[ii]);
                }
            }
            pcb.PC = orgPtr;
            */
            //TODO delete this after the demo
            //bypass the MMU to write to memory
            for (let i = 0x0000; i < bin.length; i++) {
                _MemoryController.write(i, bin[i]);
            }
            pcb.PC = 0x0000;
            return pcb;
        }
        //This must be called when a process is killed
        free() {
            this.pageTable.forEach((_vPage, pPage) => {
                _MemoryController.freePage(pPage);
            });
        }
    }
    TSOS.ProcessControlBlock = ProcessControlBlock;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=pcb.js.map