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
var TSOS;
(function (TSOS) {
    class Cpu {
        PC;
        IR;
        Acc;
        Xreg;
        Yreg;
        Zflag;
        isExecuting;
        paused;
        constructor(PC = 0, IR = OpCode.BRK, Acc = 0, Xreg = 0, Yreg = 0, Zflag = false, isExecuting = false, paused = false) {
            this.PC = PC;
            this.IR = IR;
            this.Acc = Acc;
            this.Xreg = Xreg;
            this.Yreg = Yreg;
            this.Zflag = Zflag;
            this.isExecuting = isExecuting;
            this.paused = paused;
        }
        init() {
            this.PC = 0;
            this.IR = OpCode.BRK;
            this.Acc = 0;
            this.Xreg = 0;
            this.Yreg = 0;
            this.Zflag = false;
            this.isExecuting = false;
        }
        fetch() {
            const buffer = _MMU.read(this.PC);
            if (buffer === undefined) {
                return undefined;
            }
            this.PC++;
            return buffer;
        }
        segFault() {
            TSOS.Control.hostLog("Memory access violation", "CPU");
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.SEGMENTATION_FAULT]));
        }
        illegalInstruction() {
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.ILLEGAL_INSTRUCTION]));
        }
        cycle() {
            _Kernel.krnTrace('CPU cycle');
            if (_Scheduler.scheduleMode === TSOS.ScheduleMode.RR) {
                _Scheduler.cycle++;
            }
            // TODO: Accumulate CPU usage and profiling statistics here.
            _Scheduler.currPCB.timeEstimate--;
            // Do the real work here. Be sure to set this.isExecuting appropriately.
            //fetch
            const byte = this.fetch();
            if (byte === undefined) {
                return this.segFault();
            }
            const opcode = OpCode[byte];
            if (opcode === undefined) {
                return this.illegalInstruction();
            }
            this.IR = byte;
            let arg0;
            let arg1;
            let buffer;
            //decode and execute
            switch (this.IR) {
                case OpCode.LDAi:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    this.Acc = arg0;
                    break;
                case OpCode.LDAa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    buffer = _MMU.read(leToU16(arg0, arg1));
                    if (buffer === undefined) {
                        return this.segFault();
                    }
                    this.Acc = buffer;
                    break;
                case OpCode.STAa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    if (!_MMU.write(leToU16(arg0, arg1), this.Acc)) {
                        return this.segFault();
                    }
                    TSOS.Control.updateMemDisplay();
                    break;
                case OpCode.TXA:
                    this.Acc = this.Xreg;
                    break;
                case OpCode.TYA:
                    this.Acc = this.Yreg;
                    break;
                case OpCode.ADCa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    buffer = _MMU.read(leToU16(arg0, arg1));
                    if (buffer === undefined) {
                        return this.segFault();
                    }
                    if (buffer < 0x80) {
                        this.Acc += buffer;
                    }
                    else {
                        this.Acc -= 0x100 - buffer;
                    }
                    if (this.Acc > 0xFF) {
                        this.Acc -= 0xFF;
                    }
                    else if (this.Acc < 0x00) {
                        this.Acc += 0x100;
                    }
                    break;
                case OpCode.LDXi:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    this.Xreg = arg0;
                    break;
                case OpCode.LDXa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    buffer = _MMU.read(leToU16(arg0, arg1));
                    if (buffer === undefined) {
                        return this.segFault();
                    }
                    this.Xreg = buffer;
                    break;
                case OpCode.TAX:
                    this.Xreg = this.Acc;
                    break;
                case OpCode.LDYi:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    this.Yreg = arg0;
                    break;
                case OpCode.LDYa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    buffer = _MMU.read(leToU16(arg0, arg1));
                    if (buffer === undefined) {
                        return this.segFault();
                    }
                    this.Yreg = buffer;
                    break;
                case OpCode.TAY:
                    this.Yreg = this.Acc;
                    break;
                case OpCode.NOP: break;
                case OpCode.BRK:
                    return _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.SUCCESS]));
                case OpCode.CPXa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    buffer = _MMU.read(leToU16(arg0, arg1));
                    if (buffer === undefined) {
                        return this.segFault();
                    }
                    this.Zflag = this.Xreg === buffer;
                    break;
                case OpCode.BNEr:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    if (!this.Zflag) {
                        //wrap around limit and base address of current PCB
                        this.PC += arg0;
                        const maxVPtr = _Scheduler.currPCB.limit - _Scheduler.currPCB.base;
                        if (this.PC > maxVPtr) {
                            this.PC -= maxVPtr + 1;
                        }
                    }
                    break;
                case OpCode.INCa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    const vPtr = leToU16(arg0, arg1);
                    buffer = _MMU.read(vPtr) + 1;
                    if (buffer === undefined) {
                        return this.segFault();
                    }
                    if (buffer > 0xFF) {
                        buffer = 0x00;
                    }
                    if (!_MMU.write(vPtr, buffer)) {
                        return this.segFault();
                    }
                    TSOS.Control.updateMemDisplay();
                    break;
                case OpCode.SYS:
                    let params = [_Scheduler.currPCB.stdOut, this.Yreg];
                    switch (this.Xreg) {
                        case 0x01: //print number in Y reg
                            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.writeIntConsole, params));
                            break;
                        case 0x02: //print C string at indirect address given by Y reg
                            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.writeStrConsole, params));
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
                            TSOS.Control.hostLog("Invalid system call argument", "CPU");
                            return this.illegalInstruction();
                    }
                    break;
                default:
                    return this.illegalInstruction();
            }
            TSOS.Control.updateCpuDisplay();
            //check for round-robin quantum
            //this is done here to prevent context switches during step-through debugging
            if (_Scheduler.scheduleMode === TSOS.ScheduleMode.RR && (_Scheduler.cycle === _Scheduler.quantum * -1 || _Scheduler.cycle === _Scheduler.quantum)) {
                _Scheduler.cycle = 0;
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.contextSwitch, []));
            }
            _Scheduler.updatePcbTime();
        }
    }
    TSOS.Cpu = Cpu;
    //3-letter mnemonic + the addressing mode.
    //I copied this from my Computer Organization and Architecture emulator which is why I will be including more instructions than is necessary for this course.
    let OpCode;
    (function (OpCode) {
        OpCode[OpCode["LDAi"] = 169] = "LDAi";
        OpCode[OpCode["LDAa"] = 173] = "LDAa";
        OpCode[OpCode["STAa"] = 141] = "STAa";
        OpCode[OpCode["TXA"] = 138] = "TXA";
        OpCode[OpCode["TYA"] = 152] = "TYA";
        OpCode[OpCode["ADCa"] = 109] = "ADCa";
        OpCode[OpCode["LDXi"] = 162] = "LDXi";
        OpCode[OpCode["LDXa"] = 174] = "LDXa";
        OpCode[OpCode["TAX"] = 170] = "TAX";
        OpCode[OpCode["LDYi"] = 160] = "LDYi";
        OpCode[OpCode["LDYa"] = 172] = "LDYa";
        OpCode[OpCode["TAY"] = 168] = "TAY";
        OpCode[OpCode["NOP"] = 234] = "NOP";
        OpCode[OpCode["BRK"] = 0] = "BRK";
        OpCode[OpCode["CPXa"] = 236] = "CPXa";
        OpCode[OpCode["BNEr"] = 208] = "BNEr";
        OpCode[OpCode["INCa"] = 238] = "INCa";
        OpCode[OpCode["SYS"] = 255] = "SYS"; //syscall
    })(OpCode = TSOS.OpCode || (TSOS.OpCode = {}));
})(TSOS || (TSOS = {}));
//# sourceMappingURL=cpu.js.map