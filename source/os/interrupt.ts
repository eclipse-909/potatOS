/* ------------
   Interrupt.ts
   ------------ */

module TSOS {
	export class Interrupt {
		constructor(public irq: IQR, public params: any[]) {
		}
	}
}
