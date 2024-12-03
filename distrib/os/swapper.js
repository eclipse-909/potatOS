var TSOS;
(function (TSOS) {
    class Swapper {
        roll_in(pcb_in) {
            const file_in = `.swap${pcb_in.pid}`;
            _FileSystem.read(file_in)
                .and_try_run((stderr, params) => {
                const bin_in = _DiskController.encode(params[0]);
                const alloc = _MMU.malloc(bin_in.length);
                if (alloc === undefined) {
                    if (_MMU.fixedSegments) {
                        _Kernel.krnTrapError("Failed to roll-in on swap. Out of memory.");
                    }
                    else {
                        stderr.error(["Failed to roll-in on swap. Out of memory."]);
                        TSOS.kill(pcb_in.pid, TSOS.ExitCode.GENERIC_ERROR);
                    }
                    return;
                }
                pcb_in.base = alloc.base;
                pcb_in.limit = alloc.limit;
                pcb_in.segment = Math.floor(pcb_in.base / 0x100);
                pcb_in.onDisk = false;
                //write bin to memory
                bin_in.forEach((value, vPtr) => {
                    //Bypass MMU because the MMU can only read and write to memory for processes that are running
                    _MemoryController.write(pcb_in.base + vPtr, value);
                });
                TSOS.Control.updatePcbDisplay();
            })
                .catch((_stderr, err) => {
                _Kernel.krnTrapError(`Failed to roll-in on swap. Could not read swap file. ${err.description}`);
            })
                .execute(_StdErr);
            TSOS.Control.updatePcbDisplay();
        }
        swap(pcb_out, pcb_in) {
            //autobots, roll out
            if (pcb_out === null) {
                this.roll_in(pcb_in);
                return;
            }
            let bin_out = new Uint8Array(pcb_out.limit - pcb_out.base + 1);
            for (let i = pcb_out.base; i <= pcb_out.limit; i++) {
                bin_out[i - pcb_out.base] = _MemoryController.read(i);
            }
            const file_out = `.swap${pcb_out.pid}`;
            const write_command = _FileSystem.write(file_out, _DiskController.decode(bin_out))
                .and_do_run((_stderr, _params) => {
                pcb_out.free_mem();
                pcb_out.base = -1;
                pcb_out.limit = -1;
                pcb_out.segment = -1;
                pcb_out.onDisk = true;
                this.roll_in(pcb_in);
            })
                .catch((_stderr, err) => {
                _Kernel.krnTrapError(`Failed to roll-out on swap. Could not write to swap file. ${err.description}`);
            });
            if (_DiskController.file_exists(file_out)) {
                if (_FileSystem.open_files.has(file_out)) {
                    write_command.execute(_StdErr);
                }
                else {
                    _FileSystem.open(file_out)
                        .and_try(write_command)
                        .catch((_stderr, err) => {
                        _Kernel.krnTrapError(`Failed to roll-out on swap. Could not open swap file. ${err.description}`);
                    })
                        .execute(_StdErr);
                }
            }
            else {
                _FileSystem.create(file_out)
                    .and_try(write_command)
                    .catch((_stderr, err) => {
                    _Kernel.krnTrapError(`Failed to roll-out on swap. Could not create swap file. ${err.description}`);
                })
                    .execute(_StdErr);
            }
        }
    }
    TSOS.Swapper = Swapper;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=swapper.js.map