module TSOS {
	//Interfaces with the memory to perform read and write operations.
	export class MemoryController {
		ram: Uint8Array;
		//TODO move this to memory manager
		//pool of unused pages
		freePages: number[];

		constructor() {
			this.ram = new Uint8Array(MEM_SIZE);
			this.freePages = [];
		}

		//TODO move this to memory manager
		//returns the physical page number allocated, or undefined if out of memory
		allocatePage(): number | undefined {
			if (this.freePages.length === 0) return undefined;
			const page = this.freePages.values().next().value;
			this.freePages.splice(this.freePages.indexOf(page), 1);
			return page;
		}

		//TODO move this to memory manager
		//Forgetting to free the physical page would be the biggest memory leak ever made
		freePage(frameNumber: number): void {
			this.freePages.push(frameNumber);
		}

		//reads from physical memory
		public read(pPtr: number): number {return this.ram[pPtr];}

		//writes to physical memory
		public write(pPtr: number, data: number): void {this.ram[pPtr] = data;}
	}
}