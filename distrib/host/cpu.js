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
        Acc;
        Xreg;
        Yreg;
        Zflag;
        isExecuting;
        constructor(PC = 0, Acc = 0, Xreg = 0, Yreg = 0, Zflag = false, isExecuting = false) {
            this.PC = PC;
            this.Acc = Acc;
            this.Xreg = Xreg;
            this.Yreg = Yreg;
            this.Zflag = Zflag;
            this.isExecuting = isExecuting;
        }
        init() {
            this.PC = 0;
            this.Acc = 0;
            this.Xreg = 0;
            this.Yreg = 0;
            this.Zflag = false;
            this.isExecuting = false;
        }
        fetch() {
            const pPtr = _MMU.toPhysical(this.PC);
            if (pPtr === undefined) {
                return undefined;
            }
            const buffer = _MemoryController.read(pPtr);
            this.PC++;
            return buffer;
        }
        segFault() {
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IQR.kill, []));
            _StdOut.putText("Process exited abnormally - segmentation fault");
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
            const IR = byte;
            if (!Object.values(OpCode).includes(IR)) {
                //TODO kill process and display illegal instruction
                return;
            }
            let arg0;
            let arg1;
            let pPtr;
            let buffer;
            //decode and execute
            switch (IR) {
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
                    pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
                    if (pPtr === undefined) {
                        return this.segFault();
                    }
                    this.Acc = _MemoryController.read(pPtr);
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
                    pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
                    if (pPtr === undefined) {
                        return this.segFault();
                    }
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
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    arg1 = this.fetch();
                    if (arg1 === undefined) {
                        return this.segFault();
                    }
                    pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
                    if (pPtr === undefined) {
                        return this.segFault();
                    }
                    buffer = _MemoryController.read(pPtr);
                    if (buffer < 0x80) {
                        this.Acc += buffer;
                    }
                    else {
                        this.Acc -= 0x100 - buffer;
                    }
                    if (this.Acc > 0xFF) {
                        this.Acc -= 0xFF;
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
                    pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
                    if (pPtr === undefined) {
                        return this.segFault();
                    }
                    this.Xreg = _MemoryController.read(pPtr);
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
                    pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
                    if (pPtr === undefined) {
                        return this.segFault();
                    }
                    this.Yreg = _MemoryController.read(pPtr);
                    this.Zflag = this.Yreg === 0;
                    break;
                case OpCode.TAY:
                    this.Yreg = this.Acc;
                    this.Zflag = this.Acc === 0;
                    break;
                case OpCode.NOP: break;
                case OpCode.BRK:
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IQR.kill, []));
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
                    pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
                    if (pPtr === undefined) {
                        return this.segFault();
                    }
                    this.Zflag = this.Xreg === _MemoryController.read(pPtr);
                    break;
                case OpCode.BNEr:
                    arg0 = this.fetch();
                    if (arg0 === undefined) {
                        return this.segFault();
                    }
                    if (this.Zflag) {
                        if (arg0 < 0x80) {
                            this.PC += arg0;
                        }
                        else {
                            this.PC -= 0x100 - arg0;
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
                    pPtr = _MMU.toPhysical(leToU16(arg0, arg1));
                    if (pPtr === undefined) {
                        return this.segFault();
                    }
                    buffer = _MemoryController.read(pPtr) + 1;
                    if (this.Acc > 0xFF) {
                        this.Acc = 0;
                    }
                    this.Zflag = this.Acc === 0;
                    _MemoryController.write(pPtr, buffer);
                    break;
                case OpCode.SYS:
                    let iqr;
                    let params = [];
                    if (this.Xreg === 0x01) {
                        iqr = IQR.writeIntConsole;
                        params[0] = this.Yreg;
                    }
                    else if (this.Xreg === 0x02) {
                        iqr = IQR.writeStrConsole;
                        if (this.Yreg < 0x80) {
                            params[0] = this.PC + this.Yreg;
                        }
                        else {
                            params[0] = this.PC - 0x100 + this.Yreg;
                        }
                    }
                    _KernelInterruptQueue.enqueue(new TSOS.Interrupt(iqr, params));
                    break;
            }
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
    })(OpCode || (OpCode = {}));
})(TSOS || (TSOS = {}));
//# sourceMappingURL=cpu.js.map