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
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.SEGMENTATION_FAULT]));
        }
        illegalInstruction() {
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.ILLEGAL_INSTRUCTION]));
        }
        cycle() {
            _Kernel.krnTrace('CPU cycle');
            // TODO: Accumulate CPU usage and profiling statistics here.
            // Do the real work here. Be sure to set this.isExecuting appropriately.
            //fetch
            const byte = this.fetch();
            if (byte === undefined) {
                return this.segFault();
            }
            this.IR = byte;
            if (!Object.values(OpCode).includes(this.IR)) {
                return this.illegalInstruction();
            }
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
                    this.Zflag = this.Acc === 0;
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
                    this.Acc = _MMU.read(leToU16(arg0, arg1));
                    if (this.Acc === undefined) {
                        return this.segFault();
                    }
                    this.Zflag = this.Acc === 0;
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
                    this.Zflag = this.Acc === 0;
                    break;
                case OpCode.LDXi:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    this.Xreg = arg0;
                    this.Zflag = this.Xreg === 0;
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
                    this.Xreg = _MMU.read(leToU16(arg0, arg1));
                    if (this.Xreg === undefined) {
                        return this.segFault();
                    }
                    this.Zflag = this.Xreg === 0;
                    break;
                case OpCode.TAX:
                    this.Xreg = this.Acc;
                    this.Zflag = this.Acc === 0;
                    break;
                case OpCode.LDYi:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    this.Yreg = arg0;
                    this.Zflag = this.Yreg === 0;
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
                    this.Yreg = _MMU.read(leToU16(arg0, arg1));
                    if (this.Yreg === undefined) {
                        return this.segFault();
                    }
                    this.Zflag = this.Yreg === 0;
                    break;
                case OpCode.TAY:
                    this.Yreg = this.Acc;
                    this.Zflag = this.Acc === 0;
                    break;
                case OpCode.NOP: break;
                case OpCode.BRK:
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.kill, [_Scheduler.currPCB.pid, TSOS.ExitCode.SUCCESS]));
                    break;
                case OpCode.CPXa:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    this.Zflag = this.Xreg === _MMU.read(leToU16(arg0, arg1));
                    if (this.Zflag === undefined) {
                        return this.segFault();
                    }
                    break;
                case OpCode.BNEr:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    if (!this.Zflag) {
                        if (arg0 < 0x80) {
                            this.PC += arg0;
                        }
                        else {
                            this.PC -= 0x100 - arg0;
                        }
                        if (this.PC > 0xFFFF) {
                            this.PC -= 0xFFFF;
                        }
                        else if (this.PC < 0x0000) {
                            this.PC += 0x10000;
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
                        buffer = 0;
                    }
                    this.Zflag = buffer === 0;
                    if (!_MMU.write(vPtr, buffer)) {
                        return this.segFault();
                    }
                    break;
                case OpCode.SYS:
                    let iqr;
                    let params = [_Scheduler.currPCB.stdOut];
                    switch (this.Xreg) {
                        case 0x01: //print number in Y reg
                            iqr = IRQ.writeIntConsole;
                            params[1] = this.Yreg;
                            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(iqr, params));
                            break;
                        case 0x02: //print C string at indirect address given by Y reg
                            iqr = IRQ.writeStrConsole;
                            if (this.Yreg < 0x80) {
                                params[1] = this.PC + this.Yreg;
                            }
                            else {
                                params[1] = this.PC - 0x100 + this.Yreg;
                            }
                            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(iqr, params));
                            break;
                        case 0x03: //print C string at absolute address given in operand
                            //I know the specifications for this class don't include this system call,
                            //but I wanted to make it backwards-compatible with the emulator I made in org and arch.
                            //Prof. Gormanly said he added some instructions and this system call to the instruction set in this class.
                            iqr = IRQ.writeStrConsole;
                            arg0 = this.fetch();
                            if (arg0 === undefined) {
                                return this.segFault();
                            }
                            arg1 = this.fetch();
                            if (arg1 === undefined) {
                                return this.segFault();
                            }
                            params[1] = leToU16(arg0, arg1);
                            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(iqr, params));
                            break;
                        default:
                            //TODO what happens when the system call has an invalid argument?
                            //Right now nothing will happen and it's undefined behavior that kinda works like a NOP
                            break;
                    }
                    break;
                default:
                    this.illegalInstruction();
            }
            TSOS.Control.updateCpuDisplay();
            TSOS.Control.updateMemDisplay();
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
        OpCode[OpCode["SYS"] = 255] = "SYS"; //syscall may have operands
    })(OpCode = TSOS.OpCode || (TSOS.OpCode = {}));
})(TSOS || (TSOS = {}));
//# sourceMappingURL=cpu.js.map