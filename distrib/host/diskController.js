var TSOS;
(function (TSOS) {
    let DiskErrorCode;
    (function (DiskErrorCode) {
        DiskErrorCode[DiskErrorCode["Success"] = 0] = "Success";
        DiskErrorCode[DiskErrorCode["FileNotFound"] = 1] = "FileNotFound";
        DiskErrorCode[DiskErrorCode["FileExists"] = 2] = "FileExists";
        DiskErrorCode[DiskErrorCode["DiskFormatted"] = 3] = "DiskFormatted";
        DiskErrorCode[DiskErrorCode["StorageFull"] = 4] = "StorageFull";
        DiskErrorCode[DiskErrorCode["FileNameTooLong"] = 5] = "FileNameTooLong";
    })(DiskErrorCode = TSOS.DiskErrorCode || (TSOS.DiskErrorCode = {}));
    class DiskError {
        code;
        description;
        constructor(code, desc) {
            this.code = code;
            this.description = desc;
        }
        static SUCCESS = new DiskError(DiskErrorCode.Success, undefined);
        static FILE_NOT_FOUND = new DiskError(DiskErrorCode.FileNotFound, "File not found.\n");
        static FILE_EXISTS = new DiskError(DiskErrorCode.FileExists, "File name already exists.\n");
        static DISK_FORMATTED = new DiskError(DiskErrorCode.DiskFormatted, "Disk already formatted.\n");
        static STORAGE_FULL = new DiskError(DiskErrorCode.StorageFull, "Disk's storage is full.\n");
        static FILE_NAME_TOO_LONG = new DiskError(DiskErrorCode.FileNameTooLong, "File name too long.\n");
    }
    TSOS.DiskError = DiskError;
    const TRACKS = 4;
    const SECTORS = 8;
    const BLOCKS = 8;
    const BLOCK_SIZE = 64;
    //1 for in-use flag, 1 for tsb, 1 for length of file name in bytes, 2 for length of data in little-endian bytes
    const DIR_RESERVED = 5;
    //1 for in-use flag, 1 for tsb
    const FILE_RESERVED = 2;
    class DiskController {
        formatted;
        constructor() { this.formatted = false; }
        //t: 0b1100_0000
        //s: 0b0011_1000
        //b: 0b0000_0111
        fromTSB(t, s, b) { return (t << 6) | (s << 3) | b; }
        toTSB(byte) {
            return {
                t: (byte >> 6) & 0b11,
                s: (byte >> 3) & 0b111,
                b: byte & 0b111
            };
        }
        tsbKey(t, s, b) { return t.toString() + s.toString() + b.toString(); }
        format() {
            if (this.formatted) {
                return DiskError.DISK_FORMATTED;
            }
            const decoder = new TextDecoder();
            for (let t = 0; t < TRACKS; t++) {
                for (let s = 0; s < SECTORS; s++) {
                    for (let b = 0; b < BLOCKS; b++) {
                        let arr = new Uint8Array(BLOCK_SIZE);
                        if (t === 0 && s === 0 && b === 0) {
                            arr[0] = 1;
                        }
                        sessionStorage.setItem(this.tsbKey(t, s, b), decoder.decode(arr));
                    }
                }
            }
            this.formatted = true;
        }
        //Returns the tsb of the next unused block in directory space, or 0 if storage is full.
        nextFreeDir() {
            let tsb = 0;
            const encoder = new TextEncoder();
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const block = sessionStorage.getItem(this.tsbKey(0, s, b));
                    const arr = encoder.encode(block);
                    if (tsb === 0 && arr[0] === 0) {
                        return this.fromTSB(0, s, b);
                    }
                }
            }
            return 0;
        }
        //Returns the TSBs of the next n unused block in file space, or [] if storage is full
        nextFreeFiles(n) {
            const encoder = new TextEncoder();
            let blocks = [];
            for (let t = 1; t < TRACKS; t++) {
                for (let s = 0; s < SECTORS; s++) {
                    for (let b = 0; b < BLOCKS; b++) {
                        const block = sessionStorage.getItem(this.tsbKey(t, s, b));
                        const arr = encoder.encode(block);
                        if (arr[0] === 0) {
                            blocks.push(this.fromTSB(t, s, b));
                            if (block.length === n) {
                                return blocks;
                            }
                        }
                    }
                }
            }
            return [];
        }
        create(file_name) {
            //get space for file in directory
            const encoder = new TextEncoder();
            const fileNameArr = encoder.encode(file_name);
            if (fileNameArr.length > BLOCK_SIZE - DIR_RESERVED) {
                return DiskError.FILE_NAME_TOO_LONG;
            }
            const dir = this.nextFreeDir();
            if (dir === 0) {
                return DiskError.STORAGE_FULL;
            }
            //get space for file data
            const blocks = this.nextFreeFiles(1);
            if (blocks.length === 0) {
                return DiskError.STORAGE_FULL;
            }
            //set file in directory
            const dirTSB = this.toTSB(dir);
            let dirArr = new Uint8Array(BLOCK_SIZE);
            dirArr[0] = 1;
            dirArr[1] = blocks[0];
            for (let i = 0; i < fileNameArr.length; i++) {
                dirArr[i + DIR_RESERVED] = fileNameArr[i];
            }
            const decoder = new TextDecoder();
            sessionStorage.setItem(this.tsbKey(dirTSB.t, dirTSB.s, dirTSB.b), decoder.decode(dirArr)); //data is zeroed-out
            //set file data
            const fileTSB = this.toTSB(blocks[0]);
            let fileArr = new Uint8Array(64);
            fileArr[0] = 1;
            sessionStorage.setItem(this.tsbKey(fileTSB.t, fileTSB.s, fileTSB.b), decoder.decode(fileArr));
            return dir;
        }
        read(tsb) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let TSB = this.toTSB(tsb);
            let arr = encoder.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
            if (arr[0] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
            }
            let content = "";
            let data_len = (arr[4] << 8) | arr[3]; //length in little-endian
            tsb = arr[1];
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                arr = encoder.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
                if (arr[0] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
                }
                tsb = arr[1];
                if (data_len <= BLOCK_SIZE - FILE_RESERVED) {
                    content += decoder.decode(arr.slice(FILE_RESERVED, data_len + FILE_RESERVED));
                }
                else {
                    content += decoder.decode(arr.slice(FILE_RESERVED));
                }
                data_len -= BLOCK_SIZE - FILE_RESERVED;
            }
            return content;
        }
        write(tsb, content) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let TSB = this.toTSB(tsb);
            let key = this.tsbKey(TSB.t, TSB.s, TSB.b);
            let arr = encoder.encode(sessionStorage.getItem(key));
            if (arr[0] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
            }
            const content_arr = encoder.encode(content);
            let bytes_written = 0;
            tsb = arr[1];
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = encoder.encode(sessionStorage.getItem(key));
                if (arr[0] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
                }
                if (bytes_written === content_arr.length) {
                    arr[0] = 0;
                }
                let i = FILE_RESERVED;
                for (; i < arr.length && bytes_written < content_arr.length; i++) {
                    arr[i] = content_arr[bytes_written];
                    bytes_written++;
                }
                if (bytes_written === content_arr.length) {
                    for (; i < content_arr.length; i++) {
                        arr[i] = 0;
                    }
                }
                tsb = arr[1];
                sessionStorage.setItem(key, decoder.decode(arr));
            }
        }
        delete(tsb) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let TSB = this.toTSB(tsb);
            let key = this.tsbKey(TSB.t, TSB.s, TSB.b);
            let arr = encoder.encode(sessionStorage.getItem(key));
            if (arr[0] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
            }
            arr[0] = 0;
            tsb = arr[1];
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = encoder.encode(sessionStorage.getItem(key));
                if (arr[0] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
                }
                tsb = arr[1];
                arr[0] = 0;
                sessionStorage.setItem(key, decoder.decode(arr));
            }
        }
        rename(tsb, new_file_name) {
            if (new_file_name.length > BLOCK_SIZE - DIR_RESERVED) {
                return DiskError.FILE_NAME_TOO_LONG;
            }
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            const TSB = this.toTSB(tsb);
            const key = this.tsbKey(TSB.t, TSB.s, TSB.b);
            let arr = encoder.encode(sessionStorage.getItem(key));
            const file_name_arr = encoder.encode(new_file_name);
            arr[2] = file_name_arr.length;
            for (let i = 0; i < file_name_arr.length; i++) {
                arr[i + DIR_RESERVED] = file_name_arr[i];
            }
            sessionStorage.setItem(key, decoder.decode(arr));
            return DiskError.SUCCESS;
        }
    }
    TSOS.DiskController = DiskController;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=diskController.js.map