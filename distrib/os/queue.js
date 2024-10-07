/* ------------
   Queue.ts

   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the JavaScript Array documentation at
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
   Look at the push and shift methods, as they are the least obvious here.

   ------------ */
var TSOS;
(function (TSOS) {
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
    }
    TSOS.Queue = Queue;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=queue.js.map