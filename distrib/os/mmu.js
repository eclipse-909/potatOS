var TSOS;
(function (TSOS) {
    TSOS.MEM_BLOCK_SIZE = 256;
    let AllocMode;
    (function (AllocMode) {
        //Size determined by MEM_BLOCK_SIZE
        AllocMode[AllocMode["Fixed"] = 0] = "Fixed";
        AllocMode[AllocMode["FirstFit"] = 1] = "FirstFit";
        AllocMode[AllocMode["BestFit"] = 2] = "BestFit";
        AllocMode[AllocMode["WorstFit"] = 3] = "WorstFit";
    })(AllocMode = TSOS.AllocMode || (TSOS.AllocMode = {}));
    //Processes are non-relocatable, so virtual addresses are used in the process which are translated to physical addresses.
    //Allocation mode can be changed after boot, but this does not change the existing process allocations in memory, only new allocations.
    class MMU {
        allocMode;
        //pid -> {base, limit}. Base and limit are physical addresses.
        //This array will always be sorted
        processAllocs;
        constructor() {
            this.allocMode = AllocMode.Fixed;
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
        //Uses the allocation mode to allocate *size* number of bytes for a new process in memory.
        //Size is ignored if allocation mode is fixed.
        //Returns the base and limit address of the process, or undefined if it could not allocate.
        //Base and limit are physical addresses and should be stored in the new PCB.
        malloc(size) {
            switch (this.allocMode) {
                case AllocMode.Fixed: //BUG cannot allocate second process for some reason
                    //Like first fit, but with equal block sizes. This is why we fallthrough here
                    size = TSOS.MEM_BLOCK_SIZE;
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
            if (size <= 0) {
                return undefined;
            }
            if (this.processAllocs.length === 0) {
                newLimit = newBase + size - 1;
                if (newLimit >= MEM_SIZE) {
                    return undefined;
                }
                this.processAllocs.push({ base: newBase, limit: newLimit });
                return { base: newBase, limit: newLimit };
            }
            for (let i = 0; i < this.processAllocs.length - 1; i++) {
                //If there is room between this process limit and the next process base
                if (this.processAllocs[i + 1].base - this.processAllocs[i].limit > size) {
                    newBase = this.processAllocs[i].limit + 1;
                    newLimit = newBase + size - 1;
                    if (newLimit >= MEM_SIZE) {
                        return undefined;
                    }
                    this.processAllocs.splice(i + 1, 0, { base: newBase, limit: newLimit });
                    return { base: newBase, limit: newLimit };
                }
            }
            return undefined;
        }
        bestFit(size) {
            let newBase = 0x0000;
            let newLimit = 0x0000;
            let insertionIndex = -1;
            if (size <= 0) {
                return undefined;
            }
            if (this.processAllocs.length === 0) {
                newLimit = newBase + size - 1;
                if (newLimit >= MEM_SIZE) {
                    return undefined;
                }
                this.processAllocs.push({ base: newBase, limit: newLimit });
                return { base: newBase, limit: newLimit };
            }
            let minSize = MEM_SIZE; //Just a large number
            for (let i = 0; i < this.processAllocs.length; i++) {
                //If there is room between this process limit and the next process base
                let thisSize = this.processAllocs[i + 1].base - this.processAllocs[i].limit;
                if (thisSize > size && thisSize < minSize && this.processAllocs[i].limit + 1 + size < MEM_SIZE) {
                    newBase = this.processAllocs[i].limit + 1;
                    newLimit = newBase + size - 1;
                    minSize = thisSize;
                    insertionIndex = i + 1;
                }
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
            if (size <= 0) {
                return undefined;
            }
            if (this.processAllocs.length === 0) {
                newLimit = newBase + size - 1;
                if (newLimit >= MEM_SIZE) {
                    return undefined;
                }
                this.processAllocs.push({ base: newBase, limit: newLimit });
                return { base: newBase, limit: newLimit };
            }
            let maxSize = 0; //small number
            for (let i = 0; i < this.processAllocs.length; i++) {
                //If there is room between this process limit and the next process base
                let thisSize = this.processAllocs[i + 1].base - this.processAllocs[i].limit;
                if (thisSize > size && thisSize > maxSize && this.processAllocs[i].limit + 1 + size < MEM_SIZE) {
                    newBase = this.processAllocs[i].limit + 1;
                    newLimit = newBase + size - 1;
                    maxSize = thisSize;
                    insertionIndex = i + 1;
                }
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
                        _MemoryController.write(i, 0);
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
            //TODO maybe crash the program here?
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