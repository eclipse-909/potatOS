/* ------------
   Queue.ts

   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the JavaScript Array documentation at
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
   Look at the push and shift methods, as they are the least obvious here.

   ------------ */
var TSOS;
(function (TSOS) {
    //This is barely even a queue anymore. It has kind of turned into a multi-purposed array-based data structure.
    class Queue {
        q;
        constructor() { this.q = []; }
        getSize() { return this.q.length; }
        isEmpty() { return (this.q.length === 0); }
        enqueue(element) { this.q.push(element); }
        dequeue() {
            let retVal = null;
            if (this.q.length > 0) {
                retVal = this.q.shift();
            }
            return retVal;
        }
        toString() {
            let retVal = "";
            for (const i in this.q) {
                retVal += "[" + this.q[i] + "] ";
            }
            return retVal;
        }
        peek() {
            return this.q.length === 0 ? null : this.q[0];
        }
        //If a callback is not provided, the elements are garbage collected.
        //Otherwise, each element is dequeued one at a time, and the callback is called on each one.
        clear(callback = null) {
            if (callback === null) {
                this.q = []; //this feels so wrong, I like manual memory management
            }
            else {
                while (!this.isEmpty()) {
                    callback(this.dequeue());
                }
            }
        }
        asArr() { return this.q; }
        remove(index) {
            if (index < 0 || index >= this.q.length) {
                return null;
            }
            return this.q.splice(index, 1)[0];
        }
        //Inserts the element into the front of the queue
        push_front(element) {
            this.q.unshift(element);
        }
        //Removes the element from the back of the queue
        pop() {
            return this.q.pop();
        }
    }
    TSOS.Queue = Queue;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=queue.js.map