/* ------------
     CPU.ts

     Routines for the host CPU simulation, NOT for the OS itself.
     In this manner, it's A LITTLE BIT like a hypervisor,
     in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
     that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
     TypeScript/JavaScript in both the host and client environments.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

module TSOS {

	export class Cpu {

		constructor(public PC: number = 0,
		            public Acc: number = 0,
		            public Xreg: number = 0,
		            public Yreg: number = 0,
		            public Zflag: boolean = false,
		            public isExecuting: boolean = false) {
		}

		public init(): void {
			this.PC = 0;
			this.Acc = 0;
			this.Xreg = 0;
			this.Yreg = 0;
			this.Zflag = false;
			this.isExecuting = false;
		}

		fetch(): number | undefined {
			const pPtr: number | undefined = _MMU.toPhysical(this.PC);
			if (pPtr === undefined) {
				return undefined;
			}
			const buffer: number = _MemoryController.read(pPtr);
			this.PC++;
			return buffer;
		}

		segFault(): void {
			_KernelInterruptQueue.enqueue(new Interrupt(IQR.kill, [/*TODO get currently-running process ID*/]));
		}

		public cycle(): void {
			_Kernel.krnTrace('CPU cycle');
			// TODO: Accumulate CPU usage and profiling statistics here.
			// Do the real work here. Be sure to set this.isExecuting appropriately.

			//fetch
			const byte: number | undefined = this.fetch();
			if (byte === undefined) {return this.segFault();}
			const IR: OpCode = byte as OpCode;
			if (!Object.values(OpCode).includes(IR)) {
				//TODO kill process and display illegal instruction
				return;
			}
			let arg0: number | undefined;
			let arg1: number | undefined;
			let pPtr: number | undefined;
			let buffer: number;

			//decode and execute
			switch (IR) {
				case OpCode.LDAi:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					this.Acc = arg0;
					this.Zflag = this.Acc === 0;
					break;
				case OpCode.LDAa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
					if (pPtr === undefined) {return this.segFault();}
					this.Acc = _MemoryController.read(pPtr);
					this.Zflag = this.Acc === 0;
					break;
				case OpCode.STAa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
					if (pPtr === undefined) {return this.segFault();}
					_MemoryController.write(pPtr, this.Acc);
					break;
				case OpCode.TXA:
					this.Acc = this.Xreg;
					this.Zflag = this.Acc === 0;
					break;
				case OpCode.TYA:
					this.Acc = this.Yreg;
					this.Zflag = this.Acc === 0;
					break;
				case OpCode.ADCa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
					if (pPtr === undefined) {return this.segFault();}
					buffer = _MemoryController.read(pPtr);
					if (buffer < 0x80) {
						this.Acc += buffer;
					} else {
						this.Acc -= 0x100 - buffer;
					}
					if (this.Acc > 0xFF) {
						this.Acc -= 0xFF;
					}
					this.Zflag = this.Acc === 0;
					break;
				case OpCode.LDXi:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					this.Xreg = arg0;
					this.Zflag = this.Xreg === 0;
					break;
				case OpCode.LDXa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
					if (pPtr === undefined) {return this.segFault();}
					this.Xreg = _MemoryController.read(pPtr);
					this.Zflag = this.Xreg === 0;
					break;
				case OpCode.TAX:
					this.Xreg = this.Acc;
					this.Zflag = this.Acc === 0;
					break;
				case OpCode.LDYi:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					this.Yreg = arg0;
					this.Zflag = this.Yreg === 0;
					break;
				case OpCode.LDYa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
					if (pPtr === undefined) {return this.segFault();}
					this.Yreg = _MemoryController.read(pPtr);
					this.Zflag = this.Yreg === 0;
					break;
				case OpCode.TAY:
					this.Yreg = this.Acc;
					this.Zflag = this.Acc === 0;
					break;
				case OpCode.NOP:break;
				case OpCode.BRK:
					_KernelInterruptQueue.enqueue(new Interrupt(IQR.kill, [/*TODO get currently-running process ID*/]));
					break;
				case OpCode.CPXa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
					if (pPtr === undefined) {return this.segFault();}
					this.Zflag = this.Xreg === _MemoryController.read(pPtr);
					break;
				case OpCode.BNEr:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					if (this.Zflag) {
						if (arg0 < 0x80) {
							this.PC += arg0;
						} else {
							this.PC -= 0x100 - arg0;
						}
					}
					break;
				case OpCode.INCa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
					if (pPtr === undefined) {return this.segFault();}
					buffer = _MemoryController.read(pPtr) + 1;
					if (this.Acc > 0xFF) {
						this.Acc = 0;
					}
					this.Zflag = this.Acc === 0;
					_MemoryController.write(pPtr, buffer);
					break;
				case OpCode.SYS:
					let iqr: IQR;
					let params: any[] = [];
					if (this.Xreg === 0x01) {
						iqr = IQR.writeIntConsole;
						params[0] = this.Yreg;
					} else if (this.Xreg === 0x02) {
						iqr = IQR.writeStrConsole;
						if (this.Yreg < 0x80) {
							params[0] = this.PC + this.Yreg;
						} else {
							params[0] = this.PC - 0x100 + this.Yreg;
						}
					}
					_KernelInterruptQueue.enqueue(new Interrupt(iqr, params));
					break;
			}
		}
	}

	//3-letter mnemonic + the addressing mode.
	//I copied this from my Computer Organization and Architecture emulator which is why I will be including more instructions than is necessary for this course.
	enum OpCode {
		LDAi = 0xA9,    //load immediate u8 into a
		LDAa = 0xAD,    //load value from memory into a
		STAa = 0x8D,    //store a into memory
		TXA  = 0x8A,    //transfer x to a
		TYA  = 0x98,    //transfer y to a
		ADCa = 0x6D,    //add value from memory to a
		LDXi = 0xA2,    //load immediate u8 into x
		LDXa = 0xAE,    //load value from memory into x
		TAX  = 0xAA,    //transfer a to x
		LDYi = 0xA0,    //load immediate u8 into y
		LDYa = 0xAC,    //load value from memory into y
		TAY  = 0xA8,    //transfer a to y
		NOP  = 0xEA,    //no operation
		BRK  = 0x00,    //break
		CPXa = 0xEC,    //compare x with value from memory
		BNEr = 0xD0,    //branch if zero-flag != 0
		INCa = 0xEE,    //increment a
		SYS  = 0xFF     //syscall may have operands
	}
}
