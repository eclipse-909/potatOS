var TSOS;
(function (TSOS) {
    let AllocMode;
    (function (AllocMode) {
        AllocMode[AllocMode["FirstFit"] = 0] = "FirstFit";
        AllocMode[AllocMode["BestFit"] = 1] = "BestFit";
        AllocMode[AllocMode["WorstFit"] = 2] = "WorstFit";
    })(AllocMode = TSOS.AllocMode || (TSOS.AllocMode = {}));
    //Processes are non-relocatable, so virtual addresses are used in the process which are translated to physical addresses.
    //Allocation mode can be changed after boot, but this does not change the existing process allocations in memory, only new allocations.
    class MMU {
        allocMode;
        //All processes must be segmentSize if this is true.
        fixedSegments;
        //Size of fixed segments
        segmentSize;
        //pid -> {base, limit}. Base and limit are physical addresses.
        //This array will always be sorted
        processAllocs;
        constructor() {
            this.allocMode = AllocMode.FirstFit;
            this.fixedSegments = true;
            this.segmentSize = 256;
            this.processAllocs = [];
        }
        //Translates virtual to physical address using the currently-running PCBs base address.
        translate(vPtr) {
            //if (_Scheduler.currPCB === undefined) {return undefined;}//If this crashes, this is a logical error by the developer
            const pPtr = vPtr + _Scheduler.currPCB.base;
            if (pPtr < _Scheduler.currPCB.base || pPtr > _Scheduler.currPCB.limit) {
                return undefined;
            }
            return pPtr;
        }
        //Uses the allocation mode to allocate <size> number of bytes for a new process in memory.
        //Size is ignored if allocation mode is fixed.
        //Returns the base address of the process, or undefined if it could not allocate.
        //Base is a physical addresses and should be stored in the new PCB.
        malloc(size) {
            if (this.fixedSegments) {
                size = this.segmentSize;
            }
            //If memory is completely free, just put it at 0x0000
            if (size <= 0) {
                return undefined;
            }
            if (this.processAllocs.length === 0) {
                const newLimit = size - 1;
                if (newLimit >= MEM_SIZE) {
                    return undefined;
                }
                this.processAllocs.push({ base: 0x0000, limit: newLimit });
                return { base: 0x0000, limit: newLimit };
            }
            switch (this.allocMode) {
                case AllocMode.FirstFit:
                    return this.firstFit(size);
                case AllocMode.BestFit:
                    return this.bestFit(size);
                case TSOS.AllocMode.WorstFit:
                    return this.worstFit(size);
            }
        }
        firstFit(size) {
            let newBase = 0x0000;
            let newLimit = 0x0000;
            //If there is room before the first process
            if (this.processAllocs[0].base > size) {
                newLimit = size - 1;
                this.processAllocs.unshift({ base: newBase, limit: newLimit });
                return { base: newBase, limit: newLimit };
            }
            for (let i = 0; i < this.processAllocs.length - 1; i++) {
                //If there is room between this process limit and the next process base
                if (this.processAllocs[i + 1].base - this.processAllocs[i].limit > size) {
                    newBase = this.processAllocs[i].limit + 1;
                    newLimit = newBase + size - 1;
                    this.processAllocs.splice(i + 1, 0, { base: newBase, limit: newLimit });
                    return { base: newBase, limit: newLimit };
                }
            }
            //If there is room after the last process
            if (MEM_SIZE - this.processAllocs[this.processAllocs.length - 1].limit > size) {
                newBase = this.processAllocs[this.processAllocs.length - 1].limit + 1;
                newLimit = newBase + size - 1;
                this.processAllocs.push({ base: newBase, limit: newLimit });
                return { base: newBase, limit: newLimit };
            }
            return undefined;
        }
        bestFit(size) {
            let newBase = 0x0000;
            let newLimit = 0x0000;
            let insertionIndex = -1;
            let minSize = MEM_SIZE; //Just a large number
            //If there is room before the first process
            if (this.processAllocs[0].base > size) {
                newLimit = size - 1;
                minSize = this.processAllocs[0].base - 1;
                insertionIndex = 0;
            }
            for (let i = 0; i < this.processAllocs.length - 1; i++) {
                const freeBlockSize = this.processAllocs[i + 1].base - this.processAllocs[i].limit;
                //If there is room between this process limit and the next process base
                if (freeBlockSize > size && freeBlockSize < minSize) {
                    newBase = this.processAllocs[i].limit + 1;
                    newLimit = newBase + size - 1;
                    minSize = freeBlockSize;
                    insertionIndex = i + 1;
                }
            }
            //If there is room after the last process
            const leftover = MEM_SIZE - this.processAllocs[this.processAllocs.length - 1].limit;
            if (leftover > size && leftover < minSize) {
                newBase = this.processAllocs[this.processAllocs.length - 1].limit + 1;
                newLimit = newBase + size - 1;
                this.processAllocs.push({ base: newBase, limit: newLimit }); //don't have to splice
                return { base: newBase, limit: newLimit };
            }
            if (insertionIndex === -1) {
                return undefined;
            }
            this.processAllocs.splice(insertionIndex, 0, { base: newBase, limit: newLimit });
            return { base: newBase, limit: newLimit };
        }
        worstFit(size) {
            let newBase = 0x0000;
            let newLimit = 0x0000;
            let insertionIndex = -1;
            let maxSize = 0; //small number
            //If there is room before the first process
            if (this.processAllocs[0].base > size) {
                newLimit = size - 1;
                maxSize = this.processAllocs[0].base - 1;
                insertionIndex = 0;
            }
            for (let i = 0; i < this.processAllocs.length - 1; i++) {
                const freeBlockSize = this.processAllocs[i + 1].base - this.processAllocs[i].limit;
                //If there is room between this process limit and the next process base
                if (freeBlockSize > size && freeBlockSize > maxSize) {
                    newBase = this.processAllocs[i].limit + 1;
                    newLimit = newBase + size - 1;
                    maxSize = freeBlockSize;
                    insertionIndex = i + 1;
                }
            }
            //If there is room after the last process
            const leftover = MEM_SIZE - this.processAllocs[this.processAllocs.length - 1].limit;
            if (leftover > size && leftover > maxSize) {
                newBase = this.processAllocs[this.processAllocs.length - 1].limit + 1;
                newLimit = newBase + size - 1;
                this.processAllocs.push({ base: newBase, limit: newLimit }); //don't have to splice
                return { base: newBase, limit: newLimit };
            }
            if (insertionIndex === -1) {
                return undefined;
            }
            this.processAllocs.splice(insertionIndex, 0, { base: newBase, limit: newLimit });
            return { base: newBase, limit: newLimit };
        }
        //Frees the memory from the given base address to its corresponding limit address.
        //Memory is zeroed here.
        //Uses binary search to find the base address in this.processAllocs.
        free(base) {
            let left = 0;
            let right = this.processAllocs.length;
            let mid;
            while (left <= right) {
                mid = Math.floor((left + right) / 2);
                if (base === this.processAllocs[mid].base) {
                    for (let i = base; i <= this.processAllocs[mid].limit; i++) {
                        _MemoryController.write(i, 0); //zero-out
                    }
                    this.processAllocs.splice(mid, 1);
                    return;
                }
                if (base < this.processAllocs[mid].base) {
                    right = mid - 1;
                }
                else {
                    left = mid + 1;
                }
            }
            console.error("Unreachable statement");
        }
        //Writes to virtual memory.
        //Returns whether it was successful.
        write(vPtr, value) {
            const pPtr = this.translate(vPtr);
            if (pPtr === undefined) {
                return false;
            }
            _MemoryController.write(pPtr, value);
            return true;
        }
        //Reads from virtual memory.
        //Returns the byte or undefined if unsuccessful.
        read(vPtr) {
            const pPtr = this.translate(vPtr);
            if (pPtr === undefined) {
                return undefined;
            }
            return _MemoryController.read(pPtr);
        }
    }
    TSOS.MMU = MMU;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=mmu.js.map