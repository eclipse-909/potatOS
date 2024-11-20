var TSOS;
(function (TSOS) {
    class FileSystem {
        //Since the shell is the only thing that uses files, and files cannot be opened in two places simultaneously,
        //we might as well just have a map right here that tracks the open files.
        open_files;
        constructor() {
            this.open_files = new Map();
        }
        create(file_name) {
            if (this.open_files.has(file_name)) {
                return TSOS.DiskError.FILE_OPEN;
            }
            const fcb = TSOS.FCB.create(file_name);
            if (fcb instanceof TSOS.DiskError) {
                return fcb;
            }
            this.open_files.set(file_name, fcb);
            return TSOS.DiskError.SUCCESS;
        }
        open(file_name) {
            if (this.open_files.has(file_name)) {
                return TSOS.DiskError.FILE_OPEN;
            }
            const fcb = TSOS.FCB.open(file_name);
            if (fcb instanceof TSOS.DiskError) {
                return fcb;
            }
            this.open_files.set(file_name, fcb);
            return TSOS.DiskError.SUCCESS;
        }
        close(file_name) {
            if (!this.open_files.has(file_name)) {
                return TSOS.DiskError.FILE_NOT_OPEN;
            }
            this.open_files.delete(file_name);
            return TSOS.DiskError.SUCCESS;
        }
        //I file must be opened before being read.
        read(file_name) {
            if (!_DiskController.is_formatted()) {
                return TSOS.DiskError.DISK_NOT_FORMATTED;
            }
            if (!this.open_files.has(file_name)) {
                return TSOS.DiskError.FILE_NOT_OPEN;
            }
            return this.open_files.get(file_name).input().join("");
        }
        //I file must be opened before being written to.
        write(file_name, content) {
            if (!_DiskController.is_formatted()) {
                return TSOS.DiskError.DISK_NOT_FORMATTED;
            }
            if (!this.open_files.has(file_name)) {
                return TSOS.DiskError.FILE_NOT_OPEN;
            }
            const res = this.open_files.get(file_name).output([content]);
            if (res instanceof TSOS.DiskError) {
                return res;
            }
            return TSOS.DiskError.SUCCESS;
        }
        delete(file_name) {
            if (this.open_files.has(file_name)) {
                return TSOS.DiskError.FILE_OPEN;
            }
            return _DiskController.delete(file_name);
        }
        copy(file_name, copied_file_name) {
            if (!_DiskController.is_formatted()) {
                return TSOS.DiskError.DISK_NOT_FORMATTED;
            }
            let res = this.open(file_name);
            if (res.code !== 0) {
                return res;
            }
            res = this.create(copied_file_name);
            if (res.code !== 0) {
                this.close(file_name);
                return res;
            }
            const content = this.read(file_name);
            if (content instanceof TSOS.DiskError) {
                this.close(file_name);
                this.close(copied_file_name);
                return content;
            }
            res = this.close(file_name);
            if (res.code !== 0) {
                this.close(copied_file_name);
                return res;
            }
            res = this.write(copied_file_name, content);
            if (res.code !== 0) {
                this.close(copied_file_name);
                return res;
            }
            return this.close(copied_file_name);
        }
        rename(file_name, new_file_name) {
            const fcb = this.open_files.get(file_name);
            const res = _DiskController.rename(file_name, new_file_name);
            if (res.code !== 0) {
                return res;
            }
            this.open_files.delete(file_name);
            this.open_files.set(file_name, fcb);
            return TSOS.DiskError.SUCCESS;
        }
        ls(sh_hidden) {
            if (!_DiskController.is_formatted()) {
                return TSOS.DiskError.DISK_NOT_FORMATTED;
            }
            return _DiskController.get_all_files().filter(file => {
                return sh_hidden || !file.startsWith(".");
            });
        }
    }
    TSOS.FileSystem = FileSystem;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=fileSystem.js.map