/* ------------
   Queue.ts

   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the JavaScript Array documentation at
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
   Look at the push and shift methods, as they are the least obvious here.

   ------------ */

module TSOS {
	export class Queue<T> {
		private q: T[];

		constructor() {this.q = [];}

		public getSize(): number {return this.q.length;}

		public isEmpty(): boolean {return (this.q.length === 0);}

		public enqueue(element: T): void {this.q.push(element);}

		public dequeue(): T | null {
			let retVal = null;
			if (this.q.length > 0) {
				retVal = this.q.shift();
			}
			return retVal;
		}

		public toString(): string {
			let retVal = "";
			for (const i in this.q) {
				retVal += "[" + this.q[i] + "] ";
			}
			return retVal;
		}

		public peek(): T | null {
			return this.q.length === 0? null : this.q[0];
		}

		public clear(): void {
			this.q = [];//this feels so wrong, I like manual memory management
		}
	}
}