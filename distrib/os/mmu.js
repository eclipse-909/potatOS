var TSOS;
(function (TSOS) {
    //When in user mode, the MMU sits between the OS and the memory to perform address translation and to verify process segments.
    class MMU {
        //TODO keep a table to translate the virtual address segments to physical address segments.
        //Returning undefined should be an assumed segmentation fault
        toPhysical(vPtr) {
            if (!Number.isInteger(vPtr) || vPtr < 0x0000 || vPtr >= MEM_SIZE) {
                return undefined;
            }
            //If the virtual address is outside the segment range, return a seg fault
            //Use table to translate virtual address to physical address
            //TODO
            return vPtr;
        }
    }
    TSOS.MMU = MMU;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=mmu.js.map