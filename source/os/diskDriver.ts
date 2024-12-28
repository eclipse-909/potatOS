module TSOS {
	export enum DiskAction {
		Format,
		Create,
		Open,
		Close,
		Read,
		Write,
		Append,
		Delete,
		Rename,
		Ls,
		Recover,
		GarbageCollect,
		Defragment
	}

	export class DiskDriver extends DeviceDriver {
		constructor() {
			super();
			this.driverEntry = this.krnDskDriverEntry;
			this.isr = this.krnDskAction;
		}

		public krnDskDriverEntry(): void {
			// Initialization routine for this, the kernel-mode Disk System Device Driver.
			this.status = "loaded";
			// More?
		}

		//params[0] must always be a DiskAction.
		//params[1] must always be a callback function called when the action succeeds.
		//params[2] must always be a callback function called when the action fails.
		//params[3] must always be a callback function called when the action finishes regardless of failure.
		public krnDskAction(params: any[]): void {
			//TODO: Check that the params are valid and osTrapError if not.
			const on_success: null | ((stderr: ErrStream<string[]>, params: any[]) => void) = params[1];
			const on_error: null | ((stderr: ErrStream<string[]>, err: DiskError) => void) = params[2];
			const callback: null | ((stderr: ErrStream<string[]>, params: any[]) => void) = params[3];
			let err: DiskError | null = null;
			let fcb: DiskError | FCB;
			let file: string;
			let content: string;
			switch (params[0] as DiskAction) {
				case DiskAction.Format:
					//params[4] is a boolean for if it's a full format
					_Kernel.krnTrace("Formatting disk");
					err = _DiskController.format(params[4]);
					if (err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Create:
					//params[4] is the file name
					file = params[4];
					_Kernel.krnTrace(`Creating file ${file}`);
					if (_FileSystem.open_files.has(file)) {
						err = DiskError.FILE_OPEN;
					} else {
						fcb = FCB.create(file);
						if (fcb instanceof DiskError) {
							err = fcb;
						} else {
							_FileSystem.open_files.set(file, fcb);
						}
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Open:
					//params[4] is the file name
					file = params[4];
					_Kernel.krnTrace(`Opening file ${file}`);
					if (_FileSystem.open_files.has(file)) {
						err = DiskError.FILE_OPEN;
					} else {
						fcb = FCB.open(file);
						if (fcb instanceof DiskError) {
							err = fcb;
						} else {
							_FileSystem.open_files.set(file, fcb);
						}
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Close:
					//params[4] is the file name
					file = params[4];
					_Kernel.krnTrace(`Closing file ${file}`);
					if (!_FileSystem.open_files.has(file)) {
						err = DiskError.FILE_NOT_OPEN;
					} else {
						_FileSystem.open_files.delete(file);
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Read:
					//params[4] is the file name
					file = params[4];
					_Kernel.krnTrace(`Reading file ${file}`);
					if (!_DiskController.is_formatted()) {
						err = DiskError.DISK_NOT_FORMATTED;
					} else {
						if (!_FileSystem.open_files.has(file)) {
							err = DiskError.FILE_NOT_OPEN;
						}
					}
					if (err === null || err.code === 0) {
						on_success?.(null, _FileSystem.open_files.get(file).input());
					} else {
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
						err = DiskError.DISK_NOT_FORMATTED;
					} else {
						if (!_FileSystem.open_files.has(file)) {
							err = DiskError.FILE_NOT_OPEN;
						} else {
							const fcb: FCB = _FileSystem.open_files.get(file);
							let res: DiskError | void = _DiskController.write(fcb.tsb, "");
							if (res.code === DiskErrorCode.Success) {
								res = fcb.output([content]);
							}
							if (res instanceof DiskError) {
								err = res;
							}
						}
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
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
						err = DiskError.DISK_NOT_FORMATTED;
					} else {
						if (!_FileSystem.open_files.has(file)) {
							err = DiskError.FILE_NOT_OPEN;
						} else {
							const res: DiskError | void = _FileSystem.open_files.get(file).output([content]);
							if (res instanceof DiskError) {
								err = res;
							}
						}
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Delete:
					//params[4] is the file name
					file = params[4];
					_Kernel.krnTrace(`Deleting file ${file}`);
					if (_FileSystem.open_files.has(file)) {
						err = DiskError.FILE_OPEN;
					} else {
						_DiskController.delete(file);
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Rename:
					//params[4] is the file name
					file = params[4];
					//params[5] is the new file name
					const new_file: string = params[5];
					_Kernel.krnTrace(`Renaming file ${file} to ${new_file}`);
					if (_FileSystem.open_files.has(file)) {
						err = DiskError.FILE_OPEN;
					} else {
						err = _DiskController.rename(file, new_file);
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Ls:
					//params[4] is stdout
					const stdout: OutStream<string[]> = params[4];
					//params[5] is a boolean - whether to show hidden open_files
					const sh_hidden: boolean = params[5];
					//params[6] is a boolean - whether to list each file on a new line
					const new_line: boolean = params[6];
					_Kernel.krnTrace("Listing files");
					if (!_DiskController.is_formatted()) {
						err = DiskError.DISK_NOT_FORMATTED;
					} else {
						const files: string[] | DiskError = _DiskController.get_all_files().filter(file => {
							return sh_hidden || !file.startsWith(".");
						});
						if (files instanceof DiskError) {
							err = files;
						} else if (files.length > 0) {
							stdout.output([files.join(new_line ? "\n" : " ")]);
						}
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
				case DiskAction.Recover:
					//params[4] is the file name
					file = params[4];
					_Kernel.krnTrace(`Attempting to recover ${file}`);
					if (!_DiskController.is_formatted()) {
						err = DiskError.DISK_NOT_FORMATTED;
					} else {
						err = _DiskController.recover(file);
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
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
						err = DiskError.FILE_OPEN;
					} else {
						err = _DiskController.defragment();
					}
					if (err === null || err.code === 0) {
						on_success?.(null, []);
					} else {
						on_error?.(null, err);
					}
					callback?.(null, []);
					break;
			}
		}
	}
}