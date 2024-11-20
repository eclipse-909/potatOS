var TSOS;
(function (TSOS) {
    class FCB {
        tsb;
        constructor() {
            this.tsb = 0;
        }
        static create(file_name) {
            let fcb = new FCB();
            const res = _DiskController.create(file_name);
            if (res instanceof TSOS.DiskError) {
                return res;
            }
            fcb.tsb = res;
            return fcb;
        }
        static open(file_name) {
            let fcb = new FCB();
            const tsb = _DiskController.get_file(file_name);
            if (tsb === 0) {
                return TSOS.DiskError.FILE_NOT_FOUND;
            }
            fcb.tsb = tsb;
            return fcb;
        }
        error(buffer) { return _DiskController.write(this.tsb, buffer.join("")); }
        input() { return [_DiskController.read(this.tsb)]; }
        output(buffer) { return _DiskController.write(this.tsb, buffer.join("")); }
    }
    TSOS.FCB = FCB;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=fileControlBlock.js.map