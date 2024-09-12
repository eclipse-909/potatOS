var TSOS;
(function (TSOS) {
    //Interfaces with the memory to perform read and write operations.
    class MemoryController {
        ram;
        //pool of unused pages
        freePages;
        constructor() {
            this.ram = new Uint8Array(MEM_SIZE);
            this.freePages = [];
        }
        //returns the physical page number allocated, or undefined if out of memory
        allocatePage() {
            if (this.freePages.length === 0)
                return undefined;
            const page = this.freePages.values().next().value;
            this.freePages.splice(this.freePages.indexOf(page), 1);
            return page;
        }
        //Forgetting to free the physical page would be the biggest memory leak ever made
        freePage(frameNumber) {
            this.freePages.push(frameNumber);
        }
        //reads from physical memory
        read(pPtr) { return this.ram[pPtr]; }
        //writes to physical memory
        write(pPtr, data) { this.ram[pPtr] = data; }
    }
    TSOS.MemoryController = MemoryController;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryController.js.map