module TSOS {
	//Interfaces with the memory to perform read and write operations.
	export class MemoryController {
		ram: Uint8Array;

		constructor() {
			this.ram = new Uint8Array(MEM_SIZE);
		}

		//reads from physical memory
		public read(pPtr: number): number {return this.ram[pPtr];}

		//writes to physical memory
		public write(pPtr: number, data: number): void {this.ram[pPtr] = data;}
	}
}