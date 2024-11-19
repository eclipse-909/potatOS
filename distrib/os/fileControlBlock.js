var TSOS;
(function (TSOS) {
    class FCB {
        tsb;
        locked;
        constructor() {
            this.tsb = 0;
            this.locked = false;
        }
        static new(file_name) {
            let fcb = new FCB();
            const res = _DiskController.create(file_name);
            if (res instanceof TSOS.DiskError) {
                return res;
            }
            fcb.tsb = res;
            return fcb;
        }
        error(buffer) { _DiskController.write(this.tsb, buffer.join("")); }
        input() { return [_DiskController.read(this.tsb)]; }
        output(buffer) { _DiskController.write(this.tsb, buffer.join("")); }
    }
    TSOS.FCB = FCB;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=fileControlBlock.js.map