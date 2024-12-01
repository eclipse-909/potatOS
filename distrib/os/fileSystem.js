var TSOS;
(function (TSOS) {
    //A functional builder-pattern for making software interrupts relating to the file system
    class FileCommand {
        diskAction;
        on_success;
        on_error;
        callback;
        params;
        constructor(diskAction, params) {
            this.diskAction = diskAction;
            this.on_success = null;
            this.on_error = null;
            this.callback = null;
            this.params = params;
        }
        //Does the file command only if the previous command succeeds.
        and_try(next) {
            if (this.on_success === null) {
                this.on_success = (stderr, _params) => {
                    next.execute(stderr);
                };
            }
            else {
                const fn = this.on_success;
                this.on_success = (stderr, params) => {
                    fn(stderr, params);
                    next.execute(stderr);
                };
            }
            return this;
        }
        //Executes the function only if the previous command fails.
        catch(on_error) {
            if (this.on_error === null) {
                this.on_error = on_error;
            }
            else {
                const fn = this.on_error;
                this.on_error = (stderr, err) => {
                    fn(stderr, err);
                    on_error(stderr, err);
                };
            }
            return this;
        }
        //Will always do the file command regardless of if the previous one succeeds or fails.
        and_do(next) {
            if (this.callback === null) {
                this.callback = (stderr, _params) => {
                    next.execute(stderr);
                };
            }
            else {
                const fn = this.callback;
                this.callback = (stderr, params) => {
                    fn(stderr, params);
                    next.execute(stderr);
                };
            }
            return this;
        }
        //Will execute the function only if the previous command succeeds.
        and_try_run(on_success) {
            if (this.on_success === null) {
                this.on_success = on_success;
            }
            else {
                const fn = this.on_success;
                this.on_success = (stderr, params) => {
                    fn(stderr, params);
                    on_success(stderr, params);
                };
            }
            return this;
        }
        //Will always execute the function regardless of if the previous one succeeds or fails.
        and_do_run(callback) {
            if (this.callback === null) {
                this.callback = callback;
            }
            else {
                const fn = this.callback;
                this.callback = (stderr, params) => {
                    fn(stderr, params);
                    callback(stderr, params);
                };
            }
            return this;
        }
        execute(stderr) {
            if (this.on_success !== null) {
                const fn = this.on_success;
                this.on_success = (_stderr, params) => {
                    fn(stderr, params);
                };
            }
            if (this.on_error !== null) {
                const fn = this.on_error;
                this.on_error = (_stderr, err) => {
                    fn(stderr, err);
                };
            }
            if (this.callback !== null) {
                const fn = this.callback;
                this.callback = (_stderr, params) => {
                    fn(stderr, params);
                };
            }
            _KernelInterruptQueue.enqueue(new TSOS.Interrupt(IRQ.disk, [this.diskAction, this.on_success, this.on_error, this.callback].concat(this.params)));
        }
    }
    class FileSystem {
        //Since the shell is the only thing that uses files, and files cannot be opened in two places simultaneously,
        //we might as well just have a map right here that tracks the open files.
        open_files;
        constructor() {
            this.open_files = new Map();
        }
        format(full) {
            return new FileCommand(TSOS.DiskAction.Format, [full]);
        }
        create(file_name) {
            return new FileCommand(TSOS.DiskAction.Create, [file_name]);
        }
        open(file_name) {
            return new FileCommand(TSOS.DiskAction.Open, [file_name]);
        }
        close(file_name) {
            return new FileCommand(TSOS.DiskAction.Close, [file_name]);
        }
        //The file must be opened before being read.
        read(file_name) {
            return new FileCommand(TSOS.DiskAction.Read, [file_name]);
        }
        //The file must be opened before being written to.
        write(file_name, content) {
            return new FileCommand(TSOS.DiskAction.Write, [file_name, content]);
        }
        delete(file_name) {
            return new FileCommand(TSOS.DiskAction.Delete, [file_name]);
        }
        copy(file_name, copied_file_name) {
            return this.open(file_name)
                .and_try(this.read(file_name)
                .and_try(this.create(copied_file_name)
                .and_try_run((_stderr, params) => {
                this.write(copied_file_name, params[0])
                    .catch((stderr, err) => { stderr.error([err.description]); });
            })
                .catch((stderr, err) => { stderr.error([err.description]); })
                .and_do(this.close(copied_file_name)))
                .catch((stderr, err) => { stderr.error([err.description]); })
                .and_do(this.close(file_name)))
                .catch((stderr, err) => { stderr.error([err.description]); });
        }
        rename(file_name, new_file_name) {
            return new FileCommand(TSOS.DiskAction.Rename, [file_name, new_file_name]);
        }
        ls(stdout, sh_hidden, new_line) {
            return new FileCommand(TSOS.DiskAction.Ls, [stdout, sh_hidden, new_line]);
        }
        recover(file_name) {
            return new FileCommand(TSOS.DiskAction.Recover, [file_name]);
        }
        garbageCollect() {
            return new FileCommand(TSOS.DiskAction.GarbageCollect, []);
        }
        defragment() {
            return new FileCommand(TSOS.DiskAction.Defragment, []);
        }
    }
    TSOS.FileSystem = FileSystem;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=fileSystem.js.map