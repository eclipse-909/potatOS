module TSOS {
	export class Scheduler {
		public currPCB: ProcessControlBlock | null;
		public pcbQueue: Queue<ProcessControlBlock>;
		public residentPcbs: Map<number, ProcessControlBlock>;

		constructor() {
			this.currPCB = null;
			this.pcbQueue = new Queue<ProcessControlBlock>();
			this.residentPcbs = new Map<number, TSOS.ProcessControlBlock>();
		}
	}
}