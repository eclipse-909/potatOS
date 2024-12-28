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
    //TODO include size and create date
    //1 for in-use flag, 1 for tsb, 1 for length of file name in bytes, 2 for length of data in little-endian bytes, 2 for date stored as 0bMMMM_DDDD 0bDYYY_YYYY which represents MM/DD/YY
    const DIR_RESERVED = 7;
    //1 for in-use flag, 1 for tsb
    const FILE_RESERVED = 2;
    const IN_USE_INDEX = 0;
    const TSB_INDEX = 1;
    const FILE_NAME_LEN_INDEX = 2;
    const DATA_LEN_LOW_INDEX = 3;
    const DATA_LEN_HIGH_INDEX = 4;
    const DATE_LOW_INDEX = 5;
    const DATE_HIGH_INDEX = 6;
    class DiskController {
        constructor() {
            if (sessionStorage.getItem("formatted") === null) {
                sessionStorage.setItem("formatted", "false");
            }
        }
        decode(arr) {
            let str = '';
            for (let i = 0; i < arr.length; i++) {
                str += String.fromCharCode(arr[i]);
            }
            return str;
        }
        encode(str) {
            const arr = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) {
                arr[i] = str.charCodeAt(i);
            }
            return arr;
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
        //returns TSB of file, or 0 if it doesn't exist
        get_file(file_name) {
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const arr = this.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
                    if ((arr[IN_USE_INDEX] === 0) || (s === 0 && b === 0)) {
                        continue;
                    }
                    if (this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])) === file_name) {
                        return this.fromTSB(0, s, b);
                    }
                }
            }
            return 0;
        }
        get_all_files() {
            let files = [];
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const val = sessionStorage.getItem(this.tsbKey(0, s, b));
                    const arr = this.encode(val);
                    if ((arr[IN_USE_INDEX] === 0) || (s === 0 && b === 0)) {
                        continue;
                    }
                    files.push(this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])));
                }
            }
            return files;
        }
        file_size(tsb) {
            const TSB = this.toTSB(tsb);
            const arr = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
            return BLOCK_SIZE * (Math.ceil(((arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX]) / (BLOCK_SIZE - FILE_RESERVED)) + 1);
        }
        file_create_date(tsb) {
            const TSB = this.toTSB(tsb);
            const arr = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
            const month = arr[DATE_LOW_INDEX] >> 4 & 0b1111;
            const day = (arr[DATE_LOW_INDEX] << 1 | arr[DATE_HIGH_INDEX] >> 7) & 0b11111;
            const year = arr[DATE_HIGH_INDEX] & 0b1111111;
            const formattedMonth = month.toString().padStart(2, "0");
            const formattedDay = day.toString().padStart(2, "0");
            const formattedYear = (year % 100).toString().padStart(2, "0");
            return `${formattedMonth}/${formattedDay}/${formattedYear}`;
        }
        is_formatted() { return sessionStorage.getItem("formatted") === "true"; }
        format(full) {
            if (!this.is_formatted() || full) {
                //full
                for (let t = 0; t < TRACKS; t++) {
                    for (let s = 0; s < SECTORS; s++) {
                        for (let b = 0; b < BLOCKS; b++) {
                            let arr = new Uint8Array(BLOCK_SIZE);
                            if (t === 0 && s === 0 && b === 0) {
                                arr[IN_USE_INDEX] = 1;
                            }
                            sessionStorage.setItem(this.tsbKey(t, s, b), this.decode(arr));
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
                            let arr = this.encode(sessionStorage.getItem(key));
                            arr[IN_USE_INDEX] = t === 0 && s === 0 && b === 0 ? 1 : 0;
                            sessionStorage.setItem(key, this.decode(arr));
                        }
                    }
                }
            }
            sessionStorage.setItem("formatted", "true");
            TSOS.Control.updateDiskDisplay();
            return DiskError.SUCCESS;
        }
        //Returns the tsb of the next unused block in directory space, or 0 if storage is full.
        nextFreeDir() {
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const arr = this.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
                    if (arr[IN_USE_INDEX] === 0) {
                        return this.fromTSB(0, s, b);
                    }
                }
            }
            return 0;
        }
        //Returns the TSBs of the next n unused block in file space, or [] if storage is full
        nextFreeFiles(n) {
            let blocks = [];
            for (let t = 1; t < TRACKS; t++) {
                for (let s = 0; s < SECTORS; s++) {
                    for (let b = 0; b < BLOCKS; b++) {
                        const block = sessionStorage.getItem(this.tsbKey(t, s, b));
                        const arr = this.encode(block);
                        if (arr[IN_USE_INDEX] === 0) {
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
            const fileNameArr = this.encode(file_name);
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
            dirArr[IN_USE_INDEX] = 1;
            dirArr[FILE_NAME_LEN_INDEX] = fileNameArr.length;
            const now = new Date();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            const year = now.getFullYear() % 100;
            dirArr[DATE_LOW_INDEX] = (month << 4) | (day >> 1);
            dirArr[DATE_HIGH_INDEX] = ((day << 7) | (year & 0b1111111)) & 0xFF;
            for (let i = 0; i < fileNameArr.length; i++) {
                dirArr[i + DIR_RESERVED] = fileNameArr[i];
            }
            sessionStorage.setItem(this.tsbKey(dirTSB.t, dirTSB.s, dirTSB.b), this.decode(dirArr));
            TSOS.Control.updateDiskDisplay();
            return dir;
        }
        read(tsb) {
            let TSB = this.toTSB(tsb);
            let arr = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
            if (arr[IN_USE_INDEX] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
            }
            let content = "";
            let data_len = (arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX]; //length in little-endian
            tsb = arr[TSB_INDEX];
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                arr = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
                if (arr[IN_USE_INDEX] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to read an unused block in the disk.");
                }
                tsb = arr[TSB_INDEX];
                if (data_len <= BLOCK_SIZE - FILE_RESERVED) {
                    content += this.decode(arr.slice(FILE_RESERVED, data_len + FILE_RESERVED));
                }
                else {
                    content += this.decode(arr.slice(FILE_RESERVED));
                }
                data_len -= BLOCK_SIZE - FILE_RESERVED;
            }
            return content;
        }
        write(tsb, content) {
            let TSB = this.toTSB(tsb);
            let key = this.tsbKey(TSB.t, TSB.s, TSB.b);
            let arr = this.encode(sessionStorage.getItem(key));
            let dirArr = arr;
            const dirKey = key;
            if (arr[IN_USE_INDEX] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to write to an unused block in the disk.");
            }
            const content_arr = this.encode(content);
            let bytes_written = 0;
            tsb = arr[TSB_INDEX];
            //delete all blocks in the file space
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = this.encode(sessionStorage.getItem(key));
                if (arr[IN_USE_INDEX] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
                }
                tsb = arr[TSB_INDEX];
                arr[IN_USE_INDEX] = 0;
                sessionStorage.setItem(key, this.decode(arr));
            }
            //stop early if erasing content
            if (content_arr.length === 0) {
                dirArr[TSB_INDEX] = 0;
                sessionStorage.setItem(dirKey, this.decode(dirArr));
                TSOS.Control.updateDiskDisplay();
                return DiskError.SUCCESS;
            }
            //get new blocks in file space
            const blocks = this.nextFreeFiles(Math.ceil(content_arr.length / (BLOCK_SIZE - FILE_RESERVED)));
            if (blocks.length === 0) {
                return DiskError.STORAGE_FULL;
            }
            dirArr[TSB_INDEX] = blocks[0]; //set new tsb link
            dirArr[DATA_LEN_LOW_INDEX] = content_arr.length & 0xFF; //set length of data
            dirArr[DATA_LEN_HIGH_INDEX] = (content_arr.length >> 8) & 0xFF;
            sessionStorage.setItem(dirKey, this.decode(dirArr));
            //write into new blocks in file space
            for (let i = 0; i < blocks.length; i++) {
                TSB = this.toTSB(blocks[i]);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = new Uint8Array(BLOCK_SIZE);
                arr[IN_USE_INDEX] = 1;
                if (i + 1 < blocks.length) {
                    arr[TSB_INDEX] = blocks[i + 1];
                }
                for (let ii = FILE_RESERVED; ii < BLOCK_SIZE && bytes_written < content_arr.length; ii++) {
                    arr[ii] = content_arr[bytes_written];
                    bytes_written++;
                }
                sessionStorage.setItem(key, this.decode(arr));
            }
            TSOS.Control.updateDiskDisplay();
            return DiskError.SUCCESS;
        }
        append(tsb, content) {
            //TODO you could write out all the logic to make this slightly faster, but this is so much easier
            const new_content = this.read(tsb) + content;
            return this.write(tsb, new_content);
        }
        delete(file_name) {
            if (!this.is_formatted()) {
                return DiskError.DISK_NOT_FORMATTED;
            }
            let tsb = this.get_file(file_name);
            if (tsb === 0) {
                return DiskError.FILE_NOT_FOUND;
            }
            let TSB = this.toTSB(tsb);
            let key = this.tsbKey(TSB.t, TSB.s, TSB.b);
            let arr = this.encode(sessionStorage.getItem(key));
            if (arr[IN_USE_INDEX] === 0) {
                //unreachable
                _Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
            }
            arr[IN_USE_INDEX] = 0;
            sessionStorage.setItem(key, this.decode(arr));
            tsb = arr[TSB_INDEX];
            while (tsb !== 0) {
                TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = this.encode(sessionStorage.getItem(key));
                if (arr[IN_USE_INDEX] === 0) {
                    //unreachable
                    _Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
                }
                tsb = arr[TSB_INDEX];
                arr[IN_USE_INDEX] = 0;
                sessionStorage.setItem(key, this.decode(arr));
            }
            TSOS.Control.updateDiskDisplay();
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
            const TSB = this.toTSB(tsb);
            const key = this.tsbKey(TSB.t, TSB.s, TSB.b);
            let arr = this.encode(sessionStorage.getItem(key));
            const file_name_arr = this.encode(new_file_name);
            arr[FILE_NAME_LEN_INDEX] = file_name_arr.length;
            for (let i = 0; i < file_name_arr.length; i++) {
                arr[i + DIR_RESERVED] = file_name_arr[i];
            }
            sessionStorage.setItem(key, this.decode(arr));
            TSOS.Control.updateDiskDisplay();
            return DiskError.SUCCESS;
        }
        recover(file_name) {
            let tsb = -1;
            let found = false;
            let length = 0;
            let tsbs = [];
            let arr;
            let key;
            //look for file with matching name
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    if (s == 0 && b == 0) {
                        continue;
                    }
                    key = this.tsbKey(0, s, b);
                    arr = this.encode(sessionStorage.getItem(key));
                    if (this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])) !== file_name) {
                        continue;
                    }
                    if (found) {
                        return DiskError.UNRECOVERABLE;
                    }
                    if (arr[IN_USE_INDEX] === 1) {
                        return DiskError.FILE_EXISTS;
                    }
                    found = true;
                    tsbs.push(this.fromTSB(0, s, b));
                    tsb = arr[TSB_INDEX];
                    length = (arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX];
                }
            }
            if (!found) {
                return DiskError.UNRECOVERABLE;
            }
            //loop through linked blocks to gather possible data
            while (tsb !== 0) {
                tsbs.push(tsb);
                const TSB = this.toTSB(tsb);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = this.encode(sessionStorage.getItem(key));
                if (arr[IN_USE_INDEX] === 1 || (tsbs.length - 2) * (BLOCK_SIZE - FILE_RESERVED) > length) {
                    return DiskError.UNRECOVERABLE;
                }
                tsb = arr[TSB_INDEX];
            }
            //make sure the length matches
            if ((tsbs.length - 1) * (BLOCK_SIZE - FILE_RESERVED) < length) {
                return DiskError.UNRECOVERABLE;
            }
            //set blocks as in-use
            for (const block of tsbs) {
                const TSB = this.toTSB(block);
                key = this.tsbKey(TSB.t, TSB.s, TSB.b);
                arr = this.encode(sessionStorage.getItem(key));
                arr[IN_USE_INDEX] = 1;
                sessionStorage.setItem(key, this.decode(arr));
            }
            TSOS.Control.updateDiskDisplay();
            return DiskError.SUCCESS;
        }
        garbageCollect() {
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
                    arr = this.encode(sessionStorage.getItem(key));
                    tsb = arr[TSB_INDEX];
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
                    arr = this.encode(sessionStorage.getItem(key));
                    tsb = arr[TSB_INDEX];
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
                            arr = this.encode(sessionStorage.getItem(key));
                            arr[TSB_INDEX] = 0;
                        }
                    }
                }
            }
            TSOS.Control.updateDiskDisplay();
        }
        save_disk() {
            let disk = [];
            for (let t = 0; t < TRACKS; t++) {
                const row = [];
                for (let s = 0; s < SECTORS; s++) {
                    const col = new Array(BLOCKS).fill("");
                    row.push(col);
                }
                disk.push(row);
            }
            for (let t = 0; t < TRACKS; t++) {
                for (let s = 0; s < SECTORS; s++) {
                    for (let b = 0; b < BLOCKS; b++) {
                        disk[t][s][b] = sessionStorage.getItem(this.tsbKey(t, s, b));
                    }
                }
            }
            return disk;
        }
        load_disk(disk) {
            for (let t = 0; t < TRACKS; t++) {
                for (let s = 0; s < SECTORS; s++) {
                    for (let b = 0; b < BLOCKS; b++) {
                        sessionStorage.setItem(this.tsbKey(t, s, b), disk[t][s][b]);
                    }
                }
            }
        }
        defragment() {
            const disk = this.save_disk();
            const files = [];
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const arr = this.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
                    if ((arr[IN_USE_INDEX] === 0) || (s === 0 && b === 0)) {
                        continue;
                    }
                    files.push({ name: this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])), tsb: this.fromTSB(0, s, b), data: null });
                }
            }
            for (const file of files) {
                file.data = this.read(file.tsb);
            }
            this.format(true);
            for (const file of files) {
                const tsb = this.create(file.name);
                if (tsb instanceof DiskError) {
                    this.load_disk(disk);
                    return tsb;
                }
                if (file.data === null || file.data.length === 0) {
                    continue;
                }
                this.write(tsb, file.data);
            }
            TSOS.Control.updateDiskDisplay();
            return DiskError.SUCCESS;
        }
        get_html_table_file_index_string() {
            let str = "";
            for (let s = 0; s < SECTORS; s++) {
                for (let b = 0; b < BLOCKS; b++) {
                    const key = this.tsbKey(0, s, b);
                    const item = sessionStorage.getItem(key);
                    const arr = this.encode(item);
                    const TSB = this.toTSB(arr[TSB_INDEX]);
                    str += `<tr>`
                        + `<td>${key}</td>`
                        + `<td>${arr[IN_USE_INDEX]}</td>`
                        + `<td>${this.tsbKey(TSB.t, TSB.s, TSB.b)}</td>`
                        + `<td>${arr[FILE_NAME_LEN_INDEX]}</td>`
                        + `<td>${(arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX]}</td>`
                        + `<td>${this.file_create_date(this.fromTSB(0, s, b))}</td>`
                        + `<td>${item.substring(DIR_RESERVED)}</td>`
                        + `</tr>`;
                }
            }
            return str;
        }
        get_html_table_file_string() {
            let str = "";
            for (let t = 1; t < TRACKS; t++) {
                for (let s = 0; s < SECTORS; s++) {
                    for (let b = 0; b < BLOCKS; b++) {
                        const key = this.tsbKey(t, s, b);
                        const item = sessionStorage.getItem(key);
                        const arr = this.encode(item);
                        const TSB = this.toTSB(arr[TSB_INDEX]);
                        str += `<tr>`
                            + `<td>${key}</td>`
                            + `<td>${arr[IN_USE_INDEX]}</td>`
                            + `<td>${this.tsbKey(TSB.t, TSB.s, TSB.b)}</td>`
                            + `<td>${item.substring(FILE_RESERVED)}</td>`
                            + `</tr>`;
                    }
                }
            }
            return str;
        }
    }
    TSOS.DiskController = DiskController;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=diskController.js.map