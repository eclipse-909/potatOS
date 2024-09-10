var TSOS;
(function (TSOS) {
    //Interfaces with the memory to perform read and write operations.
    class MemoryController {
        ram; //I could use a Uint8ClampedArray, but I'm already checking for the range, and it would introduce extra overhead.
        constructor() {
            this.ram = new Uint8Array(MEM_SIZE);
        }
        //pointer validation is done by the MMU
        read(ptr) { return this.ram[ptr]; }
        //pointer validation is done by the MMU
        write(ptr, data) { this.ram[ptr] = data; }
    }
    TSOS.MemoryController = MemoryController;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=memoryController.js.map