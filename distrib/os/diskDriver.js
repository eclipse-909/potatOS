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
        DiskAction[DiskAction["OpenReadClose"] = 6] = "OpenReadClose";
        DiskAction[DiskAction["OpenWriteClose"] = 7] = "OpenWriteClose";
        DiskAction[DiskAction["Delete"] = 8] = "Delete";
        DiskAction[DiskAction["Copy"] = 9] = "Copy";
        DiskAction[DiskAction["Rename"] = 10] = "Rename";
        DiskAction[DiskAction["Ls"] = 11] = "Ls";
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
        //params[1] must always be a stderr.
        krnDskAction(params) {
            //TODO: Check that the params are valid and osTrapError if not.
            const stderr = params[1];
            let err;
            switch (params[0]) {
                case DiskAction.Format:
                    //params[2] is a boolean for if it's a full format
                    _Kernel.krnTrace("Formatting disk");
                    err = _DiskController.format(params[2]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.Create:
                    //params[2] is a function that is called after the file has been created
                    //params[3] is the file name
                    _Kernel.krnTrace(`Creating file ${params[3]}`);
                    err = _FileSystem.create(params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    else if (params[2] !== null) {
                        params[2]();
                    }
                    break;
                case DiskAction.Open:
                    //params[2] is a function that is called after the file has been opened
                    //params[3] is the file name
                    _Kernel.krnTrace(`Opening file ${params[3]}`);
                    err = _FileSystem.open(params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    else if (params[2] !== null) {
                        params[2]();
                    }
                    break;
                case DiskAction.Close:
                    //params[2] is the file name
                    _Kernel.krnTrace(`Closing file ${params[2]}`);
                    err = _FileSystem.close(params[2]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.Read:
                    //params[2] is a function to call on the file content after reading the output
                    //params[3] is the file name
                    _Kernel.krnTrace(`Reading file ${params[3]}`);
                    const res = _FileSystem.read(params[3]);
                    if (res instanceof TSOS.DiskError) {
                        if (stderr !== null && res.description !== undefined) {
                            stderr.error([res.description]);
                        }
                        break;
                    }
                    params[2](res);
                    break;
                case DiskAction.Write:
                    //params[2] is the file name
                    //params[3] is the content to write
                    _Kernel.krnTrace(`Writing to file ${params[2]}`);
                    err = _FileSystem.write(params[2], params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.OpenReadClose:
                    //params[2] is a function to call on the file content after reading the output
                    //params[3] is the file name
                    _Kernel.krnTrace(`Opening file ${params[3]}`);
                    err = _FileSystem.open(params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                        break;
                    }
                    _Kernel.krnTrace(`Reading file ${params[3]}`);
                    const result = _FileSystem.read(params[3]);
                    if (result instanceof TSOS.DiskError) {
                        if (stderr !== null && result.description !== undefined) {
                            stderr.error([result.description]);
                        }
                    }
                    else {
                        params[2](result);
                    }
                    _Kernel.krnTrace(`Closing file ${params[3]}`);
                    err = _FileSystem.close(params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.OpenWriteClose:
                    //params[2] is the file name
                    //params[3] is the content to write
                    _Kernel.krnTrace(`Opening file ${params[2]}`);
                    err = _FileSystem.open(params[2]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                        break;
                    }
                    _Kernel.krnTrace(`Writing to file ${params[2]}`);
                    err = _FileSystem.write(params[2], params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    _Kernel.krnTrace(`Closing file ${params[2]}`);
                    err = _FileSystem.close(params[2]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.Delete:
                    //params[2] is the file name
                    _Kernel.krnTrace(`Deleting file ${params[2]}`);
                    err = _FileSystem.delete(params[2]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.Copy:
                    //params[2] is the file name
                    //params[3] is the copy-file name
                    _Kernel.krnTrace(`Copying file ${params[2]} to ${params[3]}`);
                    err = _FileSystem.copy(params[2], params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.Rename:
                    //params[2] is the file name
                    //params[3] is the new file name
                    _Kernel.krnTrace(`Renaming file ${params[2]} to ${params[3]}`);
                    err = _FileSystem.rename(params[2], params[3]);
                    if (stderr !== null && err.description !== undefined) {
                        stderr.error([err.description]);
                    }
                    break;
                case DiskAction.Ls:
                    //params[2] is stdout
                    //params[3] is a boolean - whether to show hidden open_files
                    //params[4] is a boolean - whether to list each file on a new line
                    _Kernel.krnTrace("Listing files");
                    const files = _FileSystem.ls(params[3]);
                    if (files instanceof TSOS.DiskError) {
                        if (stderr !== null && files.description !== undefined) {
                            stderr.error([files.description]);
                        }
                        break;
                    }
                    if (files.length > 0) {
                        params[2].output([files.join(params[4] ? "\n" : " ")]);
                    }
                    break;
            }
        }
    }
    TSOS.DiskDriver = DiskDriver;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=diskDriver.js.map