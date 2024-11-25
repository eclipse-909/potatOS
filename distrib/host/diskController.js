var TSOS;
(function (TSOS) {
    let DiskErrorCode;
    (function (DiskErrorCode) {
        DiskErrorCode[DiskErrorCode["Success"] = 0] = "Success";
        DiskErrorCode[DiskErrorCode["FileNotFound"] = 1] = "FileNotFound";
        DiskErrorCode[DiskErrorCode["FileExists"] = 2] = "FileExists";
        DiskErrorCode[DiskErrorCode["DiskNotFormatted"] = 3] = "DiskNotFormatted";
        DiskErrorCode[DiskErrorCode["StorageFull"] = 4] = "StorageFull";
        DiskErrorCode[DiskErrorCode["FileNameTooLong"] = 5] = "FileNameTooLong";
        DiskErrorCode[DiskErrorCode["FileOpen"] = 6] = "FileOpen";
        DiskErrorCode[DiskErrorCode["FileNotOpen"] = 7] = "FileNotOpen";
        DiskErrorCode[DiskErrorCode["Unrecoverable"] = 8] = "Unrecoverable";
    })(DiskErrorCode = TSOS.DiskErrorCode || (TSOS.DiskErrorCode = {}));
    class DiskError {
        code;
        description;
        constructor(code, desc) {
            this.code = code;
            this.description = desc;
        }
        static SUCCESS = new DiskError(DiskErrorCode.Success, undefined);
        static FILE_NOT_FOUND = new DiskError(DiskErrorCode.FileNotFound, "File not found.");
        static FILE_EXISTS = new DiskError(DiskErrorCode.FileExists, "File name already exists.");
        static DISK_NOT_FORMATTED = new DiskError(DiskErrorCode.DiskNotFormatted, "Disk is not formatted.");
        static STORAGE_FULL = new DiskError(DiskErrorCode.StorageFull, "Disk's storage is full.");
        static FILE_NAME_TOO_LONG = new DiskError(DiskErrorCode.FileNameTooLong, "File name too long.");
        static FILE_OPEN = new DiskError(DiskErrorCode.FileOpen, "File is open.");
        static FILE_NOT_OPEN = new DiskError(DiskErrorCode.FileNotOpen, "File is not open.");
        static UNRECOVERABLE = new DiskError(DiskErrorCode.Unrecoverable, "File cannot be recovered.");
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
        constructor() {
            if (sessionStorage.getItem("formatted") === null) {
                sessionStorage.setItem("formatted", "false");
            }
        }
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
        file_exists(file_name) { return this.get_file(file_name) !== 0; }
        get_file(file_name) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const arr = encoder.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
                    if ((arr[0] === 0) || (s === 0 && b === 0)) {
                        continue;
                    }
                    if (decoder.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[2])) === file_name) {
                        return this.fromTSB(0, s, b);
                    }
                }
            }
            return 0;
        }
        get_all_files() {
            let files = [];
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const arr = encoder.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
                    if ((arr[0] === 0) || (s === 0 && b === 0)) {
                        continue;
                    }
                    files.push(decoder.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[2])));
                }
            }
            return files;
        }
        is_formatted() { return sessionStorage.getItem("formatted") === "true"; }
        format(full) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            if (!this.is_formatted() || full) {
                //full
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
            }
            else {
                //quick
                for (let t = 0; t < TRACKS; t++) {
                    for (let s = 0; s < SECTORS; s++) {
                        for (let b = 0; b < BLOCKS; b++) {
                            const key = this.tsbKey(t, s, b);
                            let arr = encoder.encode(sessionStorage.getItem(key));
                            arr[0] = t === 0 && s === 0 && b === 0 ? 1 : 0;
                            sessionStorage.setItem(key, decoder.decode(arr));
                        }
                    }
                }
            }
            sessionStorage.setItem("formatted", "true");
            return DiskError.SUCCESS;
        }
        //Returns the tsb of the next unused block in directory space, or 0 if storage is full.
        nextFreeDir() {
            const encoder = new TextEncoder();
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const arr = encoder.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
                    if (arr[0] === 0) {
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
                            if (blocks.length === n) {
                                return blocks;
                            }
                        }
                    }
                }
            }
            return [];
        }
        create(file_name) {
            if (!this.is_formatted()) {
                return DiskError.DISK_NOT_FORMATTED;
            }
            if (this.file_exists(file_name)) {
                return DiskError.FILE_EXISTS;
            }
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
            //set file in directory
            const dirTSB = this.toTSB(dir);
            let dirArr = new Uint8Array(BLOCK_SIZE);
            dirArr[0] = 1;
            dirArr[2] = fileNameArr.length;
            for (let i = 0; i < fileNameArr.length; i++) {
                dirArr[i + DIR_RESERVED] = fileNameArr[i];
            }
            const decoder = new TextDecoder();
            sessionStorage.setItem(this.tsbKey(dirTSB.t, dirTSB.s, dirTSB.b), decoder.decode(dirArr));
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
            let dirArr = arr;
            const dirKey = key;
            if (arr[0] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to write to an unused block in the disk.");
            }
            const content_arr = encoder.encode(content);
            let bytes_written = 0;
            tsb = arr[1];
            //delete all blocks in the file space
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = encoder.encode(sessionStorage.getItem(key));
                if (arr[0] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
                }
                tsb = arr[1];
                arr[0] = 0;
                sessionStorage.setItem(key, decoder.decode(arr));
            }
            //get new blocks in file space
            const blocks = this.nextFreeFiles(Math.ceil(content_arr.length / (BLOCK_SIZE - FILE_RESERVED)));
            if (blocks.length === 0) {
                return DiskError.STORAGE_FULL;
            }
            dirArr[1] = blocks[0]; //set new tsb link
            dirArr[3] = content_arr.length & 0xFF; //set length of data
            dirArr[4] = (content_arr.length >> 8) & 0xFF;
            sessionStorage.setItem(dirKey, decoder.decode(dirArr));
            //write into new blocks in file space
            for (let i = 0; i < blocks.length; i++) {
                TSB = this.toTSB(blocks[i]);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = new Uint8Array(BLOCK_SIZE);
                arr[0] = 1;
                if (i + 1 < blocks.length) {
                    arr[1] = blocks[i + 1];
                }
                for (let ii = FILE_RESERVED; ii < BLOCK_SIZE && bytes_written < content_arr.length; ii++) {
                    arr[ii] = content_arr[bytes_written];
                    bytes_written++;
                }
                sessionStorage.setItem(key, decoder.decode(arr));
            }
            return DiskError.SUCCESS;
        }
        delete(file_name) {
            if (!this.is_formatted()) {
                return DiskError.DISK_NOT_FORMATTED;
            }
            let tsb = this.get_file(file_name);
            if (tsb === 0) {
                return DiskError.FILE_NOT_FOUND;
            }
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let TSB = this.toTSB(tsb);
            let key = this.tsbKey(TSB.t, TSB.s, TSB.b);
            let arr = encoder.encode(sessionStorage.getItem(key));
            if (arr[0] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
            }
            arr[0] = 0;
            sessionStorage.setItem(key, decoder.decode(arr));
            tsb = arr[1];
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = encoder.encode(sessionStorage.getItem(key));
                if (arr[0] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
                }
                tsb = arr[1];
                arr[0] = 0;
                sessionStorage.setItem(key, decoder.decode(arr));
            }
            return DiskError.SUCCESS;
        }
        rename(file_name, new_file_name) {
            if (!this.is_formatted()) {
                return DiskError.DISK_NOT_FORMATTED;
            }
            let tsb = this.get_file(file_name);
            if (tsb === 0) {
                return DiskError.FILE_NOT_FOUND;
            }
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
        recover(file_name) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let tsb = -1;
            let found = false;
            let length = 0;
            let tsbs = [];
            let arr;
            let key;
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    if (s == 0 && b == 0) {
                        continue;
                    }
                    key = this.tsbKey(0, s, b);
                    arr = encoder.encode(sessionStorage.getItem(key));
                    if (decoder.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[2])) !== file_name) {
                        continue;
                    }
                    if (found) {
                        return DiskError.UNRECOVERABLE;
                    }
                    if (arr[0] === 1) {
                        return DiskError.FILE_EXISTS;
                    }
                    found = true;
                    tsbs.push(this.fromTSB(0, s, b));
                    tsb = arr[1];
                    length = (arr[4] << 8) | arr[3];
                }
            }
            if (!found) {
                return DiskError.UNRECOVERABLE;
            }
            while (tsb !== 0) {
                tsbs.push(tsb);
                const TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = encoder.encode(sessionStorage.getItem(key));
                if (arr[0] === 1 || (tsbs.length - 2) * (BLOCK_SIZE - FILE_RESERVED) > length) {
                    return DiskError.UNRECOVERABLE;
                }
                tsb = arr[1];
            }
            if ((tsbs.length - 1) * (BLOCK_SIZE - FILE_RESERVED) < length) {
                return DiskError.UNRECOVERABLE;
            }
            for (const block of tsbs) {
                const TSB = this.toTSB(block);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = encoder.encode(sessionStorage.getItem(key));
                arr[0] = 1;
                sessionStorage.setItem(key, decoder.decode(arr));
            }
            return DiskError.SUCCESS;
        }
        garbageCollect() {
            const encoder = new TextEncoder();
            let tsb = -1;
            let tsbs = [];
            let arr;
            let key;
            //get directory TSBs
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    if (s == 0 && b == 0) {
                        continue;
                    }
                    key = this.tsbKey(0, s, b);
                    arr = encoder.encode(sessionStorage.getItem(key));
                    tsb = arr[1];
                    tsbs.push(tsb);
                }
            }
            //get file TSBs
            const len = tsbs.length;
            for (let i = 0; i < len; i++) {
                tsb = tsbs[0];
                while (tsb !== 0) {
                    const TSB = this.toTSB(tsb);
                    key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                    arr = encoder.encode(sessionStorage.getItem(key));
                    tsb = arr[1];
                    if (tsb !== 0) {
                        tsbs.push(tsb);
                    }
                }
            }
            //Delete all untracked TSBs
            for (let t = 1; t < TRACKS; t++) {
                for (let s = 0; s < SECTORS; s++) {
                    for (let b = 0; b < BLOCKS; b++) {
                        if (tsbs.findIndex(block => { return block === this.fromTSB(t, s, b); }) === -1) {
                            const TSB = this.toTSB(tsb);
                            key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                            arr = encoder.encode(sessionStorage.getItem(key));
                            arr[1] = 0;
                        }
                    }
                }
            }
        }
        defragment() { }
    }
    TSOS.DiskController = DiskController;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=diskController.js.map