module TSOS {
	export class FileSystem {
		public files: Map<string, FCB>;

		public constructor() {
			this.files = new Map<string, FCB>();
		}

		public create(file_name: string): DiskError {
			if (this.files.has(file_name)) {
				return DiskError.FILE_EXISTS;
			}
			const fcb: FCB | DiskError = FCB.new(file_name);
			if (fcb instanceof DiskError) {
				return fcb;
			}
			this.files.set(file_name, fcb);
			return DiskError.SUCCESS;
		}

		public read(file_name: string): string | DiskError {
			if (!this.files.has(file_name)) {
				return DiskError.FILE_NOT_FOUND;
			}
			return this.files.get(file_name).input().join("");
		}

		public write(file_name: string, content: string): DiskError {
			if (!this.files.has(file_name)) {
				return DiskError.FILE_NOT_FOUND;
			}
			this.files.get(file_name).output([content]);
			return DiskError.SUCCESS;
		}

		public delete(file_name: string): DiskError {
			if (!this.files.has(file_name)) {
				return DiskError.FILE_NOT_FOUND;
			}
			_DiskController.delete(this.files.get(file_name).tsb);
			this.files.delete(file_name);
			return DiskError.SUCCESS;
		}

		public copy(file_name: string, copied_file_name: string): DiskError {
			let res: DiskError = this.create(copied_file_name);
			if (res.code !== 0) {
				return res;
			}
			const content: string | DiskError = this.read(file_name);
			if (content instanceof DiskError) {
				return content;
			}
			return this.write(copied_file_name, content);
		}

		public rename(file_name: string, new_file_name: string): DiskError {
			if (!this.files.has(file_name)) {
				return DiskError.FILE_NOT_FOUND;
			}
			const fcb: FCB = this.files.get(file_name);
			const res: DiskError = _DiskController.rename(fcb.tsb, new_file_name);
			if (res.code !== 0) {
				return res;
			}
			this.files.delete(file_name);
			this.files.set(file_name, fcb);
			return DiskError.SUCCESS;
		}

		public ls(sh_hidden: boolean): string[] {
			let files: string[] = [];
			this.files.forEach((_, key): void => {
				if (key.startsWith(".") && !sh_hidden) {return;}
				files.push(key);
			});
			return files;
		}
	}
}