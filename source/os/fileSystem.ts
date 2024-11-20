module TSOS {
	export class FileSystem {
		//Since the shell is the only thing that uses files, and files cannot be opened in two places simultaneously,
		//we might as well just have a map right here that tracks the open files.
		public open_files: Map<string, FCB>;

		public constructor() {
			this.open_files = new Map<string, FCB>();
		}

		public create(file_name: string): DiskError {
			if (this.open_files.has(file_name)) {
				return DiskError.FILE_OPEN;
			}
			const fcb: FCB | DiskError = FCB.create(file_name);
			if (fcb instanceof DiskError) {
				return fcb;
			}
			this.open_files.set(file_name, fcb);
			return DiskError.SUCCESS;
		}

		public open(file_name: string): DiskError {
			if (this.open_files.has(file_name)) {
				return DiskError.FILE_OPEN;
			}
			const fcb: FCB | DiskError = FCB.open(file_name);
			if (fcb instanceof DiskError) {
				return fcb;
			}
			this.open_files.set(file_name, fcb);
			return DiskError.SUCCESS;
		}

		public close(file_name: string): DiskError {
			if (!this.open_files.has(file_name)) {
				return DiskError.FILE_NOT_OPEN;
			}
			this.open_files.delete(file_name);
			return DiskError.SUCCESS;
		}

		//I file must be opened before being read.
		public read(file_name: string): string | DiskError {
			if (!_DiskController.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			if (!this.open_files.has(file_name)) {
				return DiskError.FILE_NOT_OPEN;
			}
			return this.open_files.get(file_name).input().join("");
		}

		//I file must be opened before being written to.
		public write(file_name: string, content: string): DiskError {
			if (!_DiskController.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			if (!this.open_files.has(file_name)) {
				return DiskError.FILE_NOT_OPEN;
			}
			const res: DiskError | void = this.open_files.get(file_name).output([content]);
			if (res instanceof DiskError) {
				return res;
			}
			return DiskError.SUCCESS;
		}

		public delete(file_name: string): DiskError {
			if (this.open_files.has(file_name)) {
				return DiskError.FILE_OPEN;
			}
			return _DiskController.delete(file_name);
		}

		public copy(file_name: string, copied_file_name: string): DiskError {
			if (!_DiskController.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			let res: DiskError = this.open(file_name);
			if (res.code !== 0) {
				return res;
			}
			res = this.create(copied_file_name);
			if (res.code !== 0) {
				this.close(file_name);
				return res;
			}
			const content: string | DiskError = this.read(file_name);
			if (content instanceof DiskError) {
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

		public rename(file_name: string, new_file_name: string): DiskError {
			const fcb: FCB = this.open_files.get(file_name);
			const res: DiskError = _DiskController.rename(file_name, new_file_name);
			if (res.code !== 0) {
				return res;
			}
			this.open_files.delete(file_name);
			this.open_files.set(file_name, fcb);
			return DiskError.SUCCESS;
		}

		public ls(sh_hidden: boolean): string[] | DiskError {
			if (!_DiskController.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			return _DiskController.get_all_files().filter(file => {
				return sh_hidden || !file.startsWith(".");
			});
		}
	}
}