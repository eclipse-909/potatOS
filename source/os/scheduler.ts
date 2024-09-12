module TSOS {
	export class Scheduler {
		public currPCB: ProcessControlBlock | null;
		public pcbQueue: Queue<ProcessControlBlock>;
		public idlePcbs: Map<number, ProcessControlBlock>;

		constructor() {
			this.currPCB = null;
			this.pcbQueue = new Queue<ProcessControlBlock>();
			this.idlePcbs = new Map<number, TSOS.ProcessControlBlock>();
		}
	}
}