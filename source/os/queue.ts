/* ------------
   Queue.ts

   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the JavaScript Array documentation at
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
   Look at the push and shift methods, as they are the least obvious here.

   ------------ */

module TSOS {
	//This is barely even a queue anymore. It has kind of turned into a multi-purposed array-based data structure.
	export class Queue<T> {
		private q: T[];

		constructor() {this.q = [];}

		public getSize(): number {return this.q.length;}

		public isEmpty(): boolean {return (this.q.length === 0);}

		public enqueue(element: T): void {this.q.push(element);}

		public dequeue(): T | null {
			let retVal: T | null = null;
			if (this.q.length > 0) {
				retVal = this.q.shift();
			}
			return retVal;
		}

		public toString(): string {
			let retVal: string = "";
			for (const i in this.q) {
				retVal += "[" + this.q[i] + "] ";
			}
			return retVal;
		}

		//Returns the next item on the queue or null
		public peek(): T | null {
			return this.q.length === 0? null : this.q[0];
		}

		//If a callback is not provided, the elements are garbage collected.
		//Otherwise, each element is dequeued one at a time, and the callback is called on each one.
		public clear(callback: (element: T) => void | null = null): void {
			if (callback === null) {
				this.q = [];//this feels so wrong, I like manual memory management
			} else {
				while (!this.isEmpty()) {
					callback(this.dequeue());
				}
			}
		}

		public asArr(): T[] {return this.q;}

		public remove(index: number): T | null {
			if (index < 0 || index >= this.q.length) {return null;}
			return this.q.splice(index, 1)[0];
		}

		//Inserts the element into the front of the queue
		public push_front(element: T): void {
			this.q.unshift(element);
		}

		//Removes the element from the back of the queue
		public pop(): T | undefined {
			return this.q.pop();
		}

		public sort(compareFn?: (a: T, b: T) => number): void {
			this.q.sort(compareFn);
		}
	}
}