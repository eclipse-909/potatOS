module TSOS {
	export class FCB implements OutStream<string[]>, InStream<string[]>, ErrStream<string[]> {
		public tsb: number;

		private constructor() {
			this.tsb = 0;
		}

		public static create(file_name: string): FCB | DiskError {
			let fcb: FCB = new FCB();
			const res: number | DiskError = _DiskController.create(file_name);
			if (res instanceof DiskError) {
				return res;
			}
			fcb.tsb = res;
			return fcb;
		}

		public static open(file_name: string): FCB | DiskError {
			let fcb: FCB = new FCB();
			const tsb: number = _DiskController.get_file(file_name);
			if (tsb === 0) {
				return DiskError.FILE_NOT_FOUND;
			}
			fcb.tsb = tsb;
			return fcb
		}

		error(buffer: string[]): void | DiskError {return _DiskController.append(this.tsb, buffer.join(""));}
		input(): string[] {return [_DiskController.read(this.tsb)];}
		output(buffer: string[]): void | DiskError {return _DiskController.append(this.tsb, buffer.join(""));}
	}
}