/* ------------
     CPU.ts

     Routines for the host CPU simulation, NOT for the OS itself.
     In this manner, it's A LITTLE BIT like a hypervisor,
     in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
     that hosts our client OS. But that analogy only goes so far, and the prevLines are blurred, because we are using
     TypeScript/JavaScript in both the host and client environments.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

module TSOS {
	export class Cpu {
		constructor(public PC: number = 0,
					public IR: OpCode = OpCode.BRK,
		            public Acc: number = 0,
		            public Xreg: number = 0,
		            public Yreg: number = 0,
		            public Zflag: boolean = false,
		            public isExecuting: boolean = false,
		            public paused: boolean = false) {
		}

		public init(): void {
			this.PC = 0;
			this.IR = OpCode.BRK;
			this.Acc = 0;
			this.Xreg = 0;
			this.Yreg = 0;
			this.Zflag = false;
			this.isExecuting = false;
		}

		fetch(): number | undefined {
			const buffer: number | undefined = _MMU.read(this.PC);
			if (buffer === undefined) {
				return undefined;
			}
			this.PC++;
			return buffer;
		}

		segFault(): void {
			Control.hostLog("Memory access violation", "CPU");
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, ExitCode.SEGMENTATION_FAULT]));
		}

		illegalInstruction(): void {
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, ExitCode.ILLEGAL_INSTRUCTION]));
		}

		public cycle(): void {
			_Kernel.krnTrace('CPU cycle');
			if (_Scheduler.scheduleMode === ScheduleMode.RR) {
				_Scheduler.cycle++;
			}
			// TODO: Accumulate CPU usage and profiling statistics here.
			_Scheduler.currPCB.timeEstimate--;
			// Do the real work here. Be sure to set this.isExecuting appropriately.

			//fetch
			const byte: number | undefined = this.fetch();
			if (byte === undefined) {return this.segFault();}
			const opcode: OpCode | undefined = OpCode[byte as unknown as keyof typeof OpCode];
			if (opcode === undefined) {
				return this.illegalInstruction();
			}
			this.IR = byte;
			let arg0: number | undefined;
			let arg1: number | undefined;
			let buffer: number | undefined;

			//decode and execute
			switch (this.IR) {
				case OpCode.LDAi:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					this.Acc = arg0;
					break;
				case OpCode.LDAa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					buffer = _MMU.read(leToU16(arg0, arg1));
					if (buffer === undefined) {return this.segFault();}
					this.Acc = buffer;
					break;
				case OpCode.STAa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					if (!_MMU.write(leToU16(arg0, arg1), this.Acc)) {return this.segFault();}
					Control.updateMemDisplay();
					break;
				case OpCode.TXA:
					this.Acc = this.Xreg;
					break;
				case OpCode.TYA:
					this.Acc = this.Yreg;
					break;
				case OpCode.ADCa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					buffer = _MMU.read(leToU16(arg0, arg1));
					if (buffer === undefined) {return this.segFault();}
					if (buffer < 0x80) {
						this.Acc += buffer;
					} else {
						this.Acc -= 0x100 - buffer;
					}
					if (this.Acc > 0xFF) {
						this.Acc -= 0xFF;
					} else if (this.Acc < 0x00) {
						this.Acc += 0x100;
					}
					break;
				case OpCode.LDXi:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					this.Xreg = arg0;
					break;
				case OpCode.LDXa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					buffer = _MMU.read(leToU16(arg0, arg1));
					if (buffer === undefined) {return this.segFault();}
					this.Xreg = buffer;
					break;
				case OpCode.TAX:
					this.Xreg = this.Acc;
					break;
				case OpCode.LDYi:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					this.Yreg = arg0;
					break;
				case OpCode.LDYa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					buffer = _MMU.read(leToU16(arg0, arg1));
					if (buffer === undefined) {return this.segFault();}
					this.Yreg = buffer;
					break;
				case OpCode.TAY:
					this.Yreg = this.Acc;
					break;
				case OpCode.NOP:break;
				case OpCode.BRK:
					return _KernelInterruptQueue.enqueue(new Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, ExitCode.SUCCESS]));
				case OpCode.CPXa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					buffer = _MMU.read(leToU16(arg0, arg1));
					if (buffer === undefined) {return this.segFault();}
					this.Zflag = this.Xreg === buffer;
					break;
				case OpCode.BNEr:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					if (!this.Zflag) {
						//wrap around limit and base address of current PCB
						this.PC += arg0;
						const maxVPtr: number = _Scheduler.currPCB.limit - _Scheduler.currPCB.base;
						if (this.PC > maxVPtr) {
							this.PC -= maxVPtr + 1;
						}
					}
					break;
				case OpCode.INCa:
					arg0 = this.fetch();
					if (arg0 === undefined) {return this.segFault();}
					arg1 = this.fetch();
					if (arg1 === undefined) {return this.segFault();}
					const vPtr: number = leToU16(arg0, arg1);
					buffer = _MMU.read(vPtr) + 1;
					if (buffer === undefined) {return this.segFault();}
					if (buffer > 0xFF) {
						buffer = 0x00;
					}
					if (!_MMU.write(vPtr, buffer)) {return this.segFault();}
					Control.updateMemDisplay();
					break;
				case OpCode.SYS:
					let params: any[] = [_Scheduler.currPCB.stdOut, this.Yreg];
					switch (this.Xreg) {
						case 0x01://print number in Y reg
							_KernelInterruptQueue.enqueue(new Interrupt(IRQ.writeIntConsole, params));
							break;
						case 0x02://print C string at indirect address given by Y reg
							_KernelInterruptQueue.enqueue(new Interrupt(IRQ.writeStrConsole, params));
							break;
						// case 0x03://print C string at absolute address given in operand
						// 	//I know the specifications for this class don't include this system call,
						// 	//but I wanted to make it backwards-compatible with the emulator I made in org and arch.
						// 	//Prof. Gormanly said he added some instructions and this system call to the instruction set in this class.
						// 	arg0 = this.fetch();
						// 	if (arg0 === undefined) {return this.segFault();}
						// 	arg1 = this.fetch();
						// 	if (arg1 === undefined) {return this.segFault();}
						// 	params[1] = leToU16(arg0, arg1);
						// 	_KernelInterruptQueue.enqueue(new Interrupt(IRQ.writeStrConsole, params));
						// 	break;
						default:
							Control.hostLog("Invalid system call argument", "CPU");
							return this.illegalInstruction();
					}
					break;
				default:
					return this.illegalInstruction();
			}
			Control.updateCpuDisplay();
			//check for round-robin quantum
			//this is done here to prevent context switches during step-through debugging
			if (_Scheduler.scheduleMode === ScheduleMode.RR && (_Scheduler.cycle === _Scheduler.quantum * -1 || _Scheduler.cycle === _Scheduler.quantum)) {
				_Scheduler.cycle = 0;
				_KernelInterruptQueue.enqueue(new Interrupt(IRQ.contextSwitch, []));
			}
			_Scheduler.updatePcbTime();
		}
	}

	//3-letter mnemonic + the addressing mode.
	//I copied this from my Computer Organization and Architecture emulator which is why I will be including more instructions than is necessary for this course.
	export enum OpCode {
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
		SYS  = 0xFF     //syscall
	}
}