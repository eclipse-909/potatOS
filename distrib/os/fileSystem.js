var TSOS;
(function (TSOS) {
    class FileSystem {
        files;
        constructor() {
            this.files = new Map();
        }
        create(file_name) {
            if (this.files.has(file_name)) {
                return TSOS.DiskError.FILE_EXISTS;
            }
            const fcb = TSOS.FCB.new(file_name);
            if (fcb instanceof TSOS.DiskError) {
                return fcb;
            }
            this.files.set(file_name, fcb);
            return TSOS.DiskError.SUCCESS;
        }
        read(file_name) {
            if (!this.files.has(file_name)) {
                return TSOS.DiskError.FILE_NOT_FOUND;
            }
            return this.files.get(file_name).input().join("");
        }
        write(file_name, content) {
            if (!this.files.has(file_name)) {
                return TSOS.DiskError.FILE_NOT_FOUND;
            }
            this.files.get(file_name).output([content]);
            return TSOS.DiskError.SUCCESS;
        }
        delete(file_name) {
            if (!this.files.has(file_name)) {
                return TSOS.DiskError.FILE_NOT_FOUND;
            }
            _DiskController.delete(this.files.get(file_name).tsb);
            this.files.delete(file_name);
            return TSOS.DiskError.SUCCESS;
        }
        copy(file_name, copied_file_name) {
            let res = this.create(copied_file_name);
            if (res.code !== 0) {
                return res;
            }
            const content = this.read(file_name);
            if (content instanceof TSOS.DiskError) {
                return content;
            }
            return this.write(copied_file_name, content);
        }
        rename(file_name, new_file_name) {
            if (!this.files.has(file_name)) {
                return TSOS.DiskError.FILE_NOT_FOUND;
            }
            const fcb = this.files.get(file_name);
            const res = _DiskController.rename(fcb.tsb, new_file_name);
            if (res.code !== 0) {
                return res;
            }
            this.files.delete(file_name);
            this.files.set(file_name, fcb);
            return TSOS.DiskError.SUCCESS;
        }
        ls(sh_hidden) {
            let files = [];
            this.files.forEach((_, key) => {
                if (key.startsWith(".") && !sh_hidden) {
                    return;
                }
                files.push(key);
            });
            return files;
        }
    }
    TSOS.FileSystem = FileSystem;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=fileSystem.js.map