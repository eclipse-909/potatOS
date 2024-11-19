module TSOS {
	export class FCB implements OutStream<string[]>, InStream<string[]>, ErrStream<string[]> {
		public tsb: number;
		public locked: boolean;

		private constructor() {
			this.tsb = 0;
			this.locked = false;
		}

		public static new(file_name: string): FCB | DiskError {
			let fcb: FCB = new FCB();
			const res: number | DiskError = _DiskController.create(file_name);
			if (res instanceof DiskError) {
				return res;
			}
			fcb.tsb = res;
			return fcb;
		}

		error(buffer: string[]): void {_DiskController.write(this.tsb, buffer.join(""));}
		input(): string[] {return [_DiskController.read(this.tsb)];}
		output(buffer: string[]): void {_DiskController.write(this.tsb, buffer.join(""));}
	}
}