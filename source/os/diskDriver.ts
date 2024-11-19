module TSOS {
	export enum DiskAction {
		Format,
		Create,
		Read,
		Write,
		Delete,
		Copy,
		Rename,
		Ls
	}

	export class DiskDriver extends DeviceDriver {
		constructor() {
			super();
			this.driverEntry = this.krnDskDriverEntry;
			this.isr = this.krnDskAction;
		}

		public krnDskDriverEntry(): void {
			// Initialization routine for this, the kernel-mode Disk Device Driver.
			this.status = "loaded";
			// More?
		}

		//params[0] must always be a DiskAction.
		//params[1] must always be a stderr.
		public krnDskAction(params: any[]): void {
			//TODO: Check that the params are valid and osTrapError if not.
			const stderr: ErrStream<string[]> = params[1];
			let err: DiskError;
			switch (params[0] as DiskAction) {
				case DiskAction.Format:
					//no additional params
					_Kernel.krnTrace("Formatting disk");
					err = _DiskController.format();
					if (err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Create:
					//params[2] is the file name
					_Kernel.krnTrace("Creating file");
					err = _FileSystem.create(params[2]);
					if (err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Read:
					//params[2] is stdout
					//params[3] is the file name
					_Kernel.krnTrace("Reading file");
					const res: string | DiskError = _FileSystem.read(params[3]);
					if (res instanceof DiskError) {
						if (res.description !== undefined) {
							stderr.error([res.description]);
						}
						break;
					}
					(params[2] as OutStream<string[]>).output([res]);
					break;
				case DiskAction.Write:
					//params[2] is the file name
					//params[3] is the content to write
					_Kernel.krnTrace("Writing to file");
					err = _FileSystem.write(params[2], params[3]);
					if (err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Delete:
					//params[2] is the file name
					_Kernel.krnTrace("Deleting file");
					err = _FileSystem.delete(params[2]);
					if (err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Copy:
					//params[2] is the file name
					//params[3] is the copy-file name
					_Kernel.krnTrace("Copying file");
					err = _FileSystem.copy(params[2], params[3]);
					if (err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Rename:
					//params[2] is the file name
					//params[3] is the new file name
					_Kernel.krnTrace("Renaming file");
					err = _FileSystem.rename(params[2], params[3]);
					if (err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Ls:
					//params[2] is a boolean - whether to show hidden files
					_Kernel.krnTrace("Listing files");
					const files: string[] = _FileSystem.ls(params[2]);
					(params[2] as OutStream<string[]>).output(files);//TODO do I need to join the files into one string, or leave it like this?
					break;
			}
		}
	}
}