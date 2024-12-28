var TSOS;
(function (TSOS) {
    let DiskAction;
    (function (DiskAction) {
        DiskAction[DiskAction["Format"] = 0] = "Format";
        DiskAction[DiskAction["Create"] = 1] = "Create";
        DiskAction[DiskAction["Open"] = 2] = "Open";
        DiskAction[DiskAction["Close"] = 3] = "Close";
        DiskAction[DiskAction["Read"] = 4] = "Read";
        DiskAction[DiskAction["Write"] = 5] = "Write";
        DiskAction[DiskAction["Append"] = 6] = "Append";
        DiskAction[DiskAction["Delete"] = 7] = "Delete";
        DiskAction[DiskAction["Rename"] = 8] = "Rename";
        DiskAction[DiskAction["Ls"] = 9] = "Ls";
        DiskAction[DiskAction["Recover"] = 10] = "Recover";
        DiskAction[DiskAction["GarbageCollect"] = 11] = "GarbageCollect";
        DiskAction[DiskAction["Defragment"] = 12] = "Defragment";
    })(DiskAction = TSOS.DiskAction || (TSOS.DiskAction = {}));
    class DiskDriver extends TSOS.DeviceDriver {
        constructor() {
            super();
            this.driverEntry = this.krnDskDriverEntry;
            this.isr = this.krnDskAction;
        }
        krnDskDriverEntry() {
            // Initialization routine for this, the kernel-mode Disk System Device Driver.
            this.status = "loaded";
            // More?
        }
        //params[0] must always be a DiskAction.
        //params[1] must always be a callback function called when the action succeeds.
        //params[2] must always be a callback function called when the action fails.
        //params[3] must always be a callback function called when the action finishes regardless of failure.
        krnDskAction(params) {
            //TODO: Check that the params are valid and osTrapError if not.
            const on_success = params[1];
            const on_error = params[2];
            const callback = params[3];
            let err = null;
            let fcb;
            let file;
            let content;
            switch (params[0]) {
                case DiskAction.Format:
                    //params[4] is a boolean for if it's a full format
                    _Kernel.krnTrace("Formatting disk");
                    err = _DiskController.format(params[4]);
                    if (err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Create:
                    //params[4] is the file name
                    file = params[4];
                    _Kernel.krnTrace(`Creating file ${file}`);
                    if (_FileSystem.open_files.has(file)) {
                        err = TSOS.DiskError.FILE_OPEN;
                    }
                    else {
                        fcb = TSOS.FCB.create(file);
                        if (fcb instanceof TSOS.DiskError) {
                            err = fcb;
                        }
                        else {
                            _FileSystem.open_files.set(file, fcb);
                        }
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Open:
                    //params[4] is the file name
                    file = params[4];
                    _Kernel.krnTrace(`Opening file ${file}`);
                    if (_FileSystem.open_files.has(file)) {
                        err = TSOS.DiskError.FILE_OPEN;
                    }
                    else {
                        fcb = TSOS.FCB.open(file);
                        if (fcb instanceof TSOS.DiskError) {
                            err = fcb;
                        }
                        else {
                            _FileSystem.open_files.set(file, fcb);
                        }
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Close:
                    //params[4] is the file name
                    file = params[4];
                    _Kernel.krnTrace(`Closing file ${file}`);
                    if (!_FileSystem.open_files.has(file)) {
                        err = TSOS.DiskError.FILE_NOT_OPEN;
                    }
                    else {
                        _FileSystem.open_files.delete(file);
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Read:
                    //params[4] is the file name
                    file = params[4];
                    _Kernel.krnTrace(`Reading file ${file}`);
                    if (!_DiskController.is_formatted()) {
                        err = TSOS.DiskError.DISK_NOT_FORMATTED;
                    }
                    else {
                        if (!_FileSystem.open_files.has(file)) {
                            err = TSOS.DiskError.FILE_NOT_OPEN;
                        }
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, _FileSystem.open_files.get(file).input());
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Write:
                    //params[4] is the file name
                    file = params[4];
                    //params[5] is the content to write
                    content = params[5];
                    _Kernel.krnTrace(`Writing to file ${file}`);
                    if (!_DiskController.is_formatted()) {
                        err = TSOS.DiskError.DISK_NOT_FORMATTED;
                    }
                    else {
                        if (!_FileSystem.open_files.has(file)) {
                            err = TSOS.DiskError.FILE_NOT_OPEN;
                        }
                        else {
                            const fcb = _FileSystem.open_files.get(file);
                            let res = _DiskController.write(fcb.tsb, "");
                            if (res.code === TSOS.DiskErrorCode.Success) {
                                res = fcb.output([content]);
                            }
                            if (res instanceof TSOS.DiskError) {
                                err = res;
                            }
                        }
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Append:
                    //params[4] is the file name
                    file = params[4];
                    //params[5] is the content to write
                    content = params[5];
                    _Kernel.krnTrace(`Writing to file ${file}`);
                    if (!_DiskController.is_formatted()) {
                        err = TSOS.DiskError.DISK_NOT_FORMATTED;
                    }
                    else {
                        if (!_FileSystem.open_files.has(file)) {
                            err = TSOS.DiskError.FILE_NOT_OPEN;
                        }
                        else {
                            const res = _FileSystem.open_files.get(file).output([content]);
                            if (res instanceof TSOS.DiskError) {
                                err = res;
                            }
                        }
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Delete:
                    //params[4] is the file name
                    file = params[4];
                    _Kernel.krnTrace(`Deleting file ${file}`);
                    if (_FileSystem.open_files.has(file)) {
                        err = TSOS.DiskError.FILE_OPEN;
                    }
                    else {
                        _DiskController.delete(file);
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Rename:
                    //params[4] is the file name
                    file = params[4];
                    //params[5] is the new file name
                    const new_file = params[5];
                    _Kernel.krnTrace(`Renaming file ${file} to ${new_file}`);
                    if (_FileSystem.open_files.has(file)) {
                        err = TSOS.DiskError.FILE_OPEN;
                    }
                    else {
                        err = _DiskController.rename(file, new_file);
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Ls:
                    //params[4] is stdout
                    const stdout = params[4];
                    //params[5] is a boolean - whether to show hidden open_files
                    const sh_hidden = params[5];
                    //params[6] is a boolean - whether to list each file on a new line
                    const new_line = params[6];
                    _Kernel.krnTrace("Listing files");
                    if (!_DiskController.is_formatted()) {
                        err = TSOS.DiskError.DISK_NOT_FORMATTED;
                    }
                    else {
                        const files = _DiskController.get_all_files().filter(file => {
                            return sh_hidden || !file.startsWith(".");
                        });
                        if (files instanceof TSOS.DiskError) {
                            err = files;
                        }
                        else if (files.length > 0) {
                            stdout.output([files.join(new_line ? "\n" : " ")]);
                        }
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.Recover:
                    //params[4] is the file name
                    file = params[4];
                    _Kernel.krnTrace(`Attempting to recover ${file}`);
                    if (!_DiskController.is_formatted()) {
                        err = TSOS.DiskError.DISK_NOT_FORMATTED;
                    }
                    else {
                        err = _DiskController.recover(file);
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
                case DiskAction.GarbageCollect:
                    //no additional parameters
                    _Kernel.krnTrace("Performing garbage collection on the disk");
                    _DiskController.garbageCollect();
                    on_success?.(null, []);
                    callback?.(null, []);
                    break;
                case DiskAction.Defragment:
                    //no additional parameters
                    _Kernel.krnTrace("Defragmenting the disk");
                    if (_FileSystem.open_files.size > 0) {
                        err = TSOS.DiskError.FILE_OPEN;
                    }
                    else {
                        err = _DiskController.defragment();
                    }
                    if (err === null || err.code === 0) {
                        on_success?.(null, []);
                    }
                    else {
                        on_error?.(null, err);
                    }
                    callback?.(null, []);
                    break;
            }
        }
    }
    TSOS.DiskDriver = DiskDriver;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=diskDriver.js.map