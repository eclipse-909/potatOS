module TSOS {
	//When in user mode, the MMU sits between the OS and the memory to perform address translation and to verify process segments.
	export class MMU {
		//Translates virtual to physical address using the given page table.
		private translate(vPtr: number): number | undefined {
			const pageNumber: number = Math.floor(vPtr / PAGE_SIZE);
			const offset: number = vPtr % PAGE_SIZE;
			const pPage: number | undefined = _Scheduler.currPCB.pageTable.get(pageNumber);
			if (pPage === undefined) {return undefined;}
			return pPage * PAGE_SIZE + offset;
		}

		//Allocates a page in virtual memory for a new process.
		//Returns a pointer to the beginning of the virtual page, or undefined if out of memory.
		malloc(pageTable: Map<number, number>): number | undefined {
			let vPage: number = 1;//start at 1 so we don't use the zero page or null pointers
			while (pageTable.get(vPage)) {
				vPage++;
			}
			if (vPage >= NUM_PAGES) {return undefined;}
			const pPage: number | undefined = _MemoryController.allocatePage();
			if (pPage === undefined) {return undefined;}
			pageTable.set(vPage, pPage);
			return vPage * PAGE_SIZE;
		}

		//Writes to virtual memory.
		//Returns whether it was successful.
		public write(vPtr: number, value: number): boolean {
			//const pPtr: number | undefined = this.translate(vPtr);
			//if (pPtr === undefined) {return false;}
			_MemoryController.write(vPtr, value);//TODO change back to pPtr
			return true;
		}

		//Reads from virtual memory.
		//Returns the byte or undefined if unsuccessful.
		public read(vPtr: number): number | undefined {
			//const pPtr: number | undefined = this.translate(vPtr);
			//if (pPtr === undefined) {return undefined;}
			return _MemoryController.read(vPtr);//TODO change back to pPtr
		}
	}
}