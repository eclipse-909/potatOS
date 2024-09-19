/* ------------
   Interrupt.ts
   ------------ */

module TSOS {
	export class Interrupt {
		constructor(public irq: IRQ, public params: any[]) {}
	}
}