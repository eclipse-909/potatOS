var TSOS;
(function (TSOS) {
    //When in user mode, the MMU sits between the OS and the memory to perform address translation and to verify process segments.
    class MMU {
        //pool of unused physical pages
        freePages;
        constructor() {
            this.freePages = [];
        }
        //Translates virtual to physical address using the given page table.
        translate(vPtr) {
            const pageNumber = Math.floor(vPtr / PAGE_SIZE);
            const offset = vPtr % PAGE_SIZE;
            const pPage = _Scheduler.currPCB.pageTable.get(pageNumber);
            if (pPage === undefined) {
                return undefined;
            }
            return pPage * PAGE_SIZE + offset;
        }
        //Allocates a page in virtual memory for a new process.
        //Returns a pointer to the beginning of the virtual page, or undefined if out of memory.
        malloc(pageTable) {
            let vPage = 1; //start at 1 so we don't use the zero page or null pointers
            while (pageTable.get(vPage)) {
                vPage++;
            }
            if (vPage >= NUM_PAGES) {
                return undefined;
            }
            if (this.freePages.length === 0)
                return undefined;
            const pPage = this.freePages.values().next().value;
            if (pPage === undefined) {
                return undefined;
            }
            this.freePages.splice(this.freePages.indexOf(pPage), 1);
            pageTable.set(vPage, pPage);
            return vPage * PAGE_SIZE;
        }
        //Frees all the pages with the given page table
        free(pageTable) {
            pageTable.forEach((_vPage, pPage) => {
                this.freePages.push(pPage);
            });
        }
        //Writes to virtual memory.
        //Returns whether it was successful.
        write(vPtr, value) {
            //const pPtr: number | undefined = this.translate(vPtr);
            //if (pPtr === undefined) {return false;}
            _MemoryController.write(vPtr, value); //TODO change back to pPtr
            return true;
        }
        //Reads from virtual memory.
        //Returns the byte or undefined if unsuccessful.
        read(vPtr) {
            //const pPtr: number | undefined = this.translate(vPtr);
            //if (pPtr === undefined) {return undefined;}
            return _MemoryController.read(vPtr); //TODO change back to pPtr
        }
    }
    TSOS.MMU = MMU;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=mmu.js.map