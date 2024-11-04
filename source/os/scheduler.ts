module TSOS {
	export enum ScheduleMode {
		//Round-robin
		RR,
		//Non-preemptive first-come-first-served
		NP_FCFS,
		//Preemptive shortest-job-fist (job length is an inaccurate/possibly wrong estimate)
		P_SJF
	}

	export class Scheduler {
		public currPCB: ProcessControlBlock | null;
		private readyQueue: Queue<ProcessControlBlock>;
		private residentPcbs: Map<number, ProcessControlBlock>;
		public scheduleMode: ScheduleMode;
		//The number of clock cycles a process will run before it is switched (ScheduleMode.RR only)
		public quantum: number;
		//The cycle number being counted for the quantum limit (ScheduleMode.RR only)
		public cycle: number;

		constructor() {
			this.currPCB = null;
			this.readyQueue = new Queue<ProcessControlBlock>();
			this.residentPcbs = new Map<number, TSOS.ProcessControlBlock>();
			this.scheduleMode = ScheduleMode.RR;
			this.quantum = 6;
			this.cycle = 0;
		}

		//Loads the pcb into the residentPcbs map
		public load(pcb: ProcessControlBlock): void {
			this.residentPcbs.set(pcb.pid, pcb);
		}

		//Enqueues the pcb into the readyQueue. Inserts it if using ScheduleMode.P_SJF.
		public ready(pcb: ProcessControlBlock): void {
			pcb.status = Status.ready;
			if (this.scheduleMode !== ScheduleMode.RR || this.quantum > 0) {
				this.readyQueue.enqueue(pcb);
			} else {
				this.readyQueue.push_front(pcb);//The queue is reversed if q < 0
			}
			if (this.scheduleMode === ScheduleMode.P_SJF) {
				this.readyQueue.sort((a: ProcessControlBlock, b: ProcessControlBlock): number => {
					return a.timeEstimate - b.timeEstimate;
				});
				const next: ProcessControlBlock | null = this.readyQueue.peek();
				if (next !== null && this.currPCB !== null && next.timeEstimate < this.currPCB.timeEstimate) {
					_KernelInterruptQueue.enqueue(new Interrupt(IRQ.contextSwitch, []));//preemptive
					return;
				}
			}
			if (this.currPCB === null) {
				_KernelInterruptQueue.enqueue(new Interrupt(IRQ.contextSwitch, []));
			}
		}

		//Moves the pcb with the given pid from the residentPcb map and readies it into the readyQueue with this.ready().
		//Returns the pcb or undefined.
		public run(pid: number): ProcessControlBlock | undefined {
			let pcb: ProcessControlBlock | undefined = this.residentPcbs.get(pid);
			if (pcb === undefined) {return undefined;}
			this.residentPcbs.delete(pid);
			this.ready(pcb);
			return pcb;
		}

		//Readies the currPCB back into the readyQueue with this.ready().
		//Puts the next pcb from the readyQueue in currPCB.
		//Returns true.
		//Nothing happens if the readyQueue is empty, and returns false.
		public next(): boolean {
			if (this.readyQueue.isEmpty()) {
				return false;
			}
			if (this.currPCB !== null) {
				this.currPCB.status = Status.ready
				_Scheduler.updateCurrPCB();
				this.ready(this.currPCB);
			}
			let nextPcb: ProcessControlBlock;
			if (this.quantum > 0) {
				nextPcb = this.readyQueue.dequeue();
			} else {
				nextPcb = this.readyQueue.pop();//The queue is reversed if q < 0
			}
			nextPcb.status = Status.running;
			this.currPCB = nextPcb;
			return true;
		}

		//Returns an array of the currPCB, followed by the readyQueue, followed by the residentPcbs.
		public allProcs(): ProcessControlBlock[] {
			let arr: ProcessControlBlock[] = [];
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
		public clearMem(): void {
			this.residentPcbs.forEach((_value: ProcessControlBlock, key: number): void => {
				this.remove(key);
			});
		}

		//Increments cpuTime and waitTime of all running/ready processes
		public updatePcbTime(): void {
			this.currPCB.cpuTime++;
			for (const pcb of this.readyQueue.asArr()) {
				pcb.waitTime++;
			}
		}

		//Removes a pcb from the currPCB, readyQueue, or residentPcb map if it exists.
		//Returns if successful.
		public remove(pid: number): boolean {
			//check currPCB
			if (this.currPCB !== null && this.currPCB.pid === pid) {
				this.currPCB.status = Status.terminated;
				this.currPCB.free();
				this.currPCB = null;
				return true;
			} else {
				//check readyQueue
				const readyArr: ProcessControlBlock[] = this.readyQueue.asArr();
				for (let i: number = 0; i < this.readyQueue.asArr().length; i++) {
					if (readyArr[i].pid === pid) {
						readyArr[i].status = Status.terminated;
						readyArr[i].free();
						this.readyQueue.remove(i);
						return true;
					}
				}
				//check residentPcbs
				let pcb: ProcessControlBlock | undefined = _Scheduler.residentPcbs.get(pid);
				if (pcb !== undefined) {
					_Scheduler.residentPcbs.delete(pid);
					pcb.status = Status.terminated;
					pcb.free();
					return true;
				}
			}
			return false;
		}

		//Updates the values in the currPCB with the values in the CPU
		public updateCurrPCB(): void {
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
}