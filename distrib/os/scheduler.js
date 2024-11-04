var TSOS;
(function (TSOS) {
    let ScheduleMode;
    (function (ScheduleMode) {
        //Round-robin
        ScheduleMode[ScheduleMode["RR"] = 0] = "RR";
        //Non-preemptive first-come-first-served
        ScheduleMode[ScheduleMode["NP_FCFS"] = 1] = "NP_FCFS";
        //Preemptive shortest-job-fist (job length is an inaccurate/possibly wrong estimate)
        ScheduleMode[ScheduleMode["P_SJF"] = 2] = "P_SJF";
    })(ScheduleMode = TSOS.ScheduleMode || (TSOS.ScheduleMode = {}));
    class Scheduler {
        currPCB;
        readyQueue;
        residentPcbs;
        scheduleMode;
        //The number of clock cycles a process will run before it is switched (ScheduleMode.RR only)
        quantum;
        //The cycle number being counted for the quantum limit (ScheduleMode.RR only)
        cycle;
        constructor() {
            this.currPCB = null;
            this.readyQueue = new TSOS.Queue();
            this.residentPcbs = new Map();
            this.scheduleMode = ScheduleMode.RR;
            this.quantum = 6;
            this.cycle = 0;
        }
        //Loads the pcb into the residentPcbs map
        load(pcb) {
            this.residentPcbs.set(pcb.pid, pcb);
        }
        //Enqueues the pcb into the readyQueue. Inserts it if using ScheduleMode.P_SJF.
        ready(pcb) {
            pcb.status = TSOS.Status.ready;
            if (this.scheduleMode !== ScheduleMode.RR || this.quantum > 0) {
                this.readyQueue.enqueue(pcb);
            }
            else {
                this.readyQueue.push_front(pcb); //The queue is reversed if q < 0
            }
            if (this.scheduleMode === ScheduleMode.P_SJF) {
                this.readyQueue.sort((a, b) => {
                    return a.timeEstimate - b.timeEstimate;
                });
                const readyArr = this.readyQueue.asArr();
                if (readyArr[this.quantum > 0 ? 0 : readyArr.length - 1].timeEstimate < this.currPCB.timeEstimate) {
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.contextSwitch, [])); //preemptive
                    return;
                }
            }
            if (this.currPCB === null) {
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.contextSwitch, []));
            }
        }
        //Moves the pcb with the given pid from the residentPcb map and readies it into the readyQueue with this.ready().
        //Returns the pcb or undefined.
        run(pid) {
            let pcb = this.residentPcbs.get(pid);
            if (pcb === undefined) {
                return undefined;
            }
            this.residentPcbs.delete(pid);
            this.ready(pcb);
            return pcb;
        }
        //Readies the currPCB back into the readyQueue with this.ready().
        //Puts the next pcb from the readyQueue in currPCB.
        //Returns true.
        //Nothing happens if the readyQueue is empty, and returns false.
        next() {
            if (this.readyQueue.isEmpty()) {
                return false;
            }
            if (this.currPCB !== null) {
                this.currPCB.status = TSOS.Status.ready;
                _Scheduler.updateCurrPCB();
                this.ready(this.currPCB);
            }
            let nextPcb;
            if (this.quantum > 0) {
                nextPcb = this.readyQueue.dequeue();
            }
            else {
                nextPcb = this.readyQueue.pop(); //The queue is reversed if q < 0
            }
            nextPcb.status = TSOS.Status.running;
            this.currPCB = nextPcb;
            return true;
        }
        //Returns an array of the currPCB, followed by the readyQueue, followed by the residentPcbs.
        allProcs() {
            let arr = [];
            if (this.currPCB !== null) {
                arr.push(this.currPCB);
            }
            arr = arr.concat(this.readyQueue.asArr());
            this.residentPcbs.forEach(pcb => {
                arr.push(pcb);
            });
            return arr;
        }
        //Removes all resident processes
        clearMem() {
            this.residentPcbs.forEach((_value, key) => {
                this.remove(key);
            });
        }
        //Increments cpuTime and waitTime of all running/ready processes
        updatePcbTime() {
            this.currPCB.cpuTime++;
            for (const pcb of this.readyQueue.asArr()) {
                pcb.waitTime++;
            }
        }
        //Removes a pcb from the currPCB, readyQueue, or residentPcb map if it exists.
        //Returns if successful.
        remove(pid) {
            //check currPCB
            if (this.currPCB !== null && this.currPCB.pid === pid) {
                this.currPCB.status = TSOS.Status.terminated;
                this.currPCB.free();
                this.currPCB = null;
                return true;
            }
            else {
                //check readyQueue
                const readyArr = this.readyQueue.asArr();
                for (let i = 0; i < this.readyQueue.asArr().length; i++) {
                    if (readyArr[i].pid === pid) {
                        readyArr[i].status = TSOS.Status.terminated;
                        readyArr[i].free();
                        this.readyQueue.remove(i);
                        return true;
                    }
                }
                //check residentPcbs
                let pcb = _Scheduler.residentPcbs.get(pid);
                if (pcb !== undefined) {
                    _Scheduler.residentPcbs.delete(pid);
                    pcb.status = TSOS.Status.terminated;
                    pcb.free();
                    return true;
                }
            }
            return false;
        }
        //Updates the values in the currPCB with the values in the CPU
        updateCurrPCB() {
            if (this.currPCB !== null) {
                this.currPCB.IR = _CPU.IR;
                this.currPCB.PC = _CPU.PC;
                this.currPCB.Acc = _CPU.Acc;
                this.currPCB.Xreg = _CPU.Xreg;
                this.currPCB.Yreg = _CPU.Yreg;
                this.currPCB.Zflag = _CPU.Zflag;
            }
        }
    }
    TSOS.Scheduler = Scheduler;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=scheduler.js.map