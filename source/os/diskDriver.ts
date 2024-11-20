module TSOS {
	export enum DiskAction {
		Format,
		Create,
		Open,
		Close,
		Read,
		Write,
		OpenReadClose,
		OpenWriteClose,
		Delete,
		Copy,
		Rename,
		Ls,
		ClearDisk
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
		//params[1] must always be a stderr.
		public krnDskAction(params: any[]): void {
			//TODO: Check that the params are valid and osTrapError if not.
			const stderr: ErrStream<string[]> | null = params[1];
			let err: DiskError;
			switch (params[0] as DiskAction) {
				case DiskAction.Format:
					//no additional params
					_Kernel.krnTrace("Formatting disk");
					err = _DiskController.format();
					if (stderr !== null && err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Create:
					//params[2] is the file name
					_Kernel.krnTrace(`Creating file ${params[2]}`);
					err = _FileSystem.create(params[2]);
					if (stderr !== null && err.description !== undefined) {
						stderr.error([err.description]);
					}
					break;
				case DiskAction.Open:
					//params[2] is the file name
					_Kernel.krnTrace(`Opening file ${params[2]}`);
					err = _FileSystem.open(params[2]);
					if (stderr !== null && err.description !== undefined) {
						stderr.error([err.description]);
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
					const res: string | DiskError = _FileSystem.read(params[3]);
					if (res instanceof DiskError) {
						if (stderr !== null && res.description !== undefined) {
							stderr.error([res.description]);
						}
						break;
					}
					(params[2] as (content: string) => void)(res);
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
					const result: string | DiskError = _FileSystem.read(params[3]);
					if (result instanceof DiskError) {
						if (stderr !== null && result.description !== undefined) {
							stderr.error([result.description]);
						}
					} else {
						(params[2] as (content: string) => void)(result);
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
					const files: string[] | DiskError = _FileSystem.ls(params[3]);
					if (files instanceof DiskError) {
						if (stderr !== null && files.description !== undefined) {
							stderr.error([files.description]);
						}
						break;
					}
					(params[2] as OutStream<string[]>).output([files.join(params[4]? "\n" : " ")]);//TODO do I need to join the open_files into one string, or leave it like this?
					break;
				case DiskAction.ClearDisk:
					//No additional params
					_Kernel.krnTrace("Erasing disk");
					_DiskController.clear_disk();
					break;
			}
		}
	}
}