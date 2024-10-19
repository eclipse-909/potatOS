module TSOS {
	export const MEM_BLOCK_SIZE: number = 256;

	export enum AllocMode {
		//Size determined by MEM_BLOCK_SIZE
		Fixed,
		FirstFit,
		BestFit,
		WorstFit
	}

	//Processes are non-relocatable, so virtual addresses are used in the process which are translated to physical addresses.
	//Allocation mode can be changed after boot, but this does not change the existing process allocations in memory, only new allocations.
	export class MMU {
		public allocMode: AllocMode;
		//pid -> {base, limit}. Base and limit are physical addresses.
		//This array will always be sorted
		private processAllocs: {base: number, limit: number}[];

		constructor() {
			this.allocMode = AllocMode.Fixed;
			this.processAllocs = [];
		}

		//Translates virtual to physical address using the currently-running PCBs base address.
		private translate(vPtr: number): number | undefined {
			//if (_Scheduler.currPCB === undefined) {return undefined;}//If this crashes, this is a logical error by the developer
			const pPtr: number = vPtr + _Scheduler.currPCB.base;
			if (pPtr < _Scheduler.currPCB.base || pPtr > _Scheduler.currPCB.limit) {
				return undefined;
			}
			return pPtr;
		}

		//Uses the allocation mode to allocate *size* number of bytes for a new process in memory.
		//Size is ignored if allocation mode is fixed.
		//Returns the base and limit address of the process, or undefined if it could not allocate.
		//Base and limit are physical addresses and should be stored in the new PCB.
		public malloc(size?: number): {base: number, limit: number} | undefined {
			switch (this.allocMode) {
				case AllocMode.Fixed://BUG cannot allocate second process for some reason
					//Like first fit, but with equal block sizes. This is why we fallthrough here
					size = MEM_BLOCK_SIZE;
				case AllocMode.FirstFit:
					return this.firstFit(size);
				case AllocMode.BestFit:
					return this.bestFit(size);
				case TSOS.AllocMode.WorstFit:
					return this.worstFit(size);
			}
		}

		private firstFit(size: number): {base: number, limit: number} | undefined {
			let newBase: number = 0x0000;
			let newLimit: number = 0x0000;
			if (size <= 0) {return undefined;}
			if (this.processAllocs.length === 0) {
				newLimit = newBase + size - 1;
				if (newLimit >= MEM_SIZE) {return undefined;}
				this.processAllocs.push({base: newBase, limit: newLimit});
				return {base: newBase, limit: newLimit};
			}
			for (let i: number = 0; i < this.processAllocs.length - 1; i++) {
				//If there is room between this process limit and the next process base
				if (this.processAllocs[i+1].base - this.processAllocs[i].limit > size) {
					newBase = this.processAllocs[i].limit + 1;
					newLimit = newBase + size - 1;
					if (newLimit >= MEM_SIZE) {return undefined;}
					this.processAllocs.splice(i+1, 0, {base: newBase, limit: newLimit});
					return {base: newBase, limit: newLimit};
				}
			}
			return undefined;
		}

		private bestFit(size: number): {base: number, limit: number} | undefined {
			let newBase: number = 0x0000;
			let newLimit: number = 0x0000;
			let insertionIndex: number = -1;
			if (size <= 0) {return undefined;}
			if (this.processAllocs.length === 0) {
				newLimit = newBase + size - 1;
				if (newLimit >= MEM_SIZE) {return undefined;}
				this.processAllocs.push({base: newBase, limit: newLimit});
				return {base: newBase, limit: newLimit};
			}
			let minSize: number = MEM_SIZE;//Just a large number
			for (let i: number = 0; i < this.processAllocs.length; i++) {
				//If there is room between this process limit and the next process base
				let thisSize: number = this.processAllocs[i+1].base - this.processAllocs[i].limit;
				if (thisSize > size && thisSize < minSize && this.processAllocs[i].limit + 1 + size < MEM_SIZE) {
					newBase = this.processAllocs[i].limit + 1;
					newLimit = newBase + size - 1;
					minSize = thisSize;
					insertionIndex = i + 1;
				}
			}
			if (insertionIndex === -1) {return undefined;}
			this.processAllocs.splice(insertionIndex, 0, {base: newBase, limit: newLimit});
			return {base: newBase, limit: newLimit};
		}

		private worstFit(size: number): {base: number, limit: number} | undefined {
			let newBase: number = 0x0000;
			let newLimit: number = 0x0000;
			let insertionIndex: number = -1;
			if (size <= 0) {return undefined;}
			if (this.processAllocs.length === 0) {
				newLimit = newBase + size - 1;
				if (newLimit >= MEM_SIZE) {return undefined;}
				this.processAllocs.push({base: newBase, limit: newLimit});
				return {base: newBase, limit: newLimit};
			}
			let maxSize: number = 0;//small number
			for (let i: number = 0; i < this.processAllocs.length; i++) {
				//If there is room between this process limit and the next process base
				let thisSize: number = this.processAllocs[i+1].base - this.processAllocs[i].limit;
				if (thisSize > size && thisSize > maxSize && this.processAllocs[i].limit + 1 + size < MEM_SIZE) {
					newBase = this.processAllocs[i].limit + 1;
					newLimit = newBase + size - 1;
					maxSize = thisSize;
					insertionIndex = i + 1;
				}
			}
			if (insertionIndex === -1) {return undefined;}
			this.processAllocs.splice(insertionIndex, 0, {base: newBase, limit: newLimit});
			return {base: newBase, limit: newLimit};
		}

		//Frees the memory from the given base address to its corresponding limit address.
		//Memory is zeroed here.
		//Uses binary search to find the base address in this.processAllocs.
		public free(base: number): void {
			let left: number = 0;
			let right: number = this.processAllocs.length;
			let mid: number;
			while (left <= right) {
				mid = Math.floor((left + right) / 2);
				if (base === this.processAllocs[mid].base) {
					for (let i: number = base; i <= this.processAllocs[mid].limit; i++) {
						_MemoryController.write(i, 0);
					}
					this.processAllocs.splice(mid, 1);
					return;
				}
				if (base < this.processAllocs[mid].base) {
					right = mid - 1;
				} else {
					left = mid + 1;
				}
			}
			//TODO maybe crash the program here?
		}

		//Writes to virtual memory.
		//Returns whether it was successful.
		public write(vPtr: number, value: number): boolean {
			const pPtr: number | undefined = this.translate(vPtr);
			if (pPtr === undefined) {return false;}
			_MemoryController.write(pPtr, value);
			return true;
		}

		//Reads from virtual memory.
		//Returns the byte or undefined if unsuccessful.
		public read(vPtr: number): number | undefined {
			const pPtr: number | undefined = this.translate(vPtr);
			if (pPtr === undefined) {return undefined;}
			return _MemoryController.read(pPtr);
		}
	}
}