var TSOS;
(function (TSOS) {
    //Interfaces with the memory to perform read and write operations.
    class MemoryController {
        ram;
        constructor() {
            this.ram = new Uint8Array(MEM_SIZE);
        }
        //reads from physical memory
        read(pPtr) { return this.ram[pPtr]; }
        //writes to physical memory
        write(pPtr, data) { this.ram[pPtr] = data; }
    }
    TSOS.MemoryController = MemoryController;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryController.js.map