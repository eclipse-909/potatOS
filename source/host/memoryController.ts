module TSOS {
	//Interfaces with the memory to perform read and write operations.
	export class MemoryController {
		ram: Uint8Array;//I could use a Uint8ClampedArray, but I'm already checking for the range, and it would introduce extra overhead.

		constructor() {
			this.ram = new Uint8Array(MEM_SIZE);
		}

		//pointer validation is done by the MMU
		public read(ptr: number): number {return this.ram[ptr];}

		//pointer validation is done by the MMU
		public write(ptr: number, data: number): void {this.ram[ptr] = data;}
	}
}