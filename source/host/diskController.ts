module TSOS {
	export enum DiskErrorCode {
		Success,
		FileNotFound,
		FileExists,
		DiskFormatted,
		StorageFull,
		FileNameTooLong
	}

	export class DiskError {
		code: DiskErrorCode;
		description: string | undefined;

		private constructor(code: number, desc: string) {
			this.code = code;
			this.description = desc;
		}

		public static SUCCESS: DiskError = new DiskError(DiskErrorCode.Success, undefined);
		public static FILE_NOT_FOUND: DiskError = new DiskError(DiskErrorCode.FileNotFound, "File not found.\n");
		public static FILE_EXISTS: DiskError = new DiskError(DiskErrorCode.FileExists, "File name already exists.\n");
		public static DISK_FORMATTED: DiskError = new DiskError(DiskErrorCode.DiskFormatted, "Disk already formatted.\n");
		public static STORAGE_FULL: DiskError = new DiskError(DiskErrorCode.StorageFull, "Disk's storage is full.\n");
		public static FILE_NAME_TOO_LONG: DiskError = new DiskError(DiskErrorCode.FileNameTooLong, "File name too long.\n");
	}

	const TRACKS: number = 4;
	const SECTORS: number = 8;
	const BLOCKS: number = 8;
	const BLOCK_SIZE: number = 64;
	//1 for in-use flag, 1 for tsb, 1 for length of file name in bytes, 2 for length of data in little-endian bytes
	const DIR_RESERVED: number = 5;
	//1 for in-use flag, 1 for tsb
	const FILE_RESERVED: number = 2;

	export class DiskController {
		private formatted: boolean;

		public constructor() {this.formatted = false;}

		//t: 0b1100_0000
		//s: 0b0011_1000
		//b: 0b0000_0111
		private fromTSB(t: number, s: number, b: number): number {return (t << 6) | (s << 3) | b;}

		private toTSB(byte: number): {t: number, s: number, b: number} {
			return {
				t: (byte >> 6) & 0b11,
				s: (byte >> 3) & 0b111,
				b: byte & 0b111
			};
		}

		private tsbKey(t: number, s: number, b: number): string {return t.toString() + s.toString() + b.toString();}

		public format(): DiskError {
			if (this.formatted) {return DiskError.DISK_FORMATTED;}
			const decoder: TextDecoder = new TextDecoder();
			for (let t: number = 0; t < TRACKS; t++) {
				for (let s: number = 0; s < SECTORS; s++) {
					for (let b: number = 0; b < BLOCKS; b++) {
						let arr: Uint8Array = new Uint8Array(BLOCK_SIZE);
						if (t === 0 && s === 0 && b === 0) {
							arr[0] = 1;
						}
						sessionStorage.setItem(this.tsbKey(t, s, b), decoder.decode(arr));
					}
				}
			}
			this.formatted = true;
		}

		//Returns the tsb of the next unused block in directory space, or 0 if storage is full.
		private nextFreeDir(): number {
			let tsb: number = 0;
			const encoder: TextEncoder = new TextEncoder();
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const block: string = sessionStorage.getItem(this.tsbKey(0, s, b));
					const arr: Uint8Array = encoder.encode(block);
					if (tsb === 0 && arr[0] === 0) {
						return this.fromTSB(0, s, b);
					}
				}
			}
			return 0;
		}

		//Returns the TSBs of the next n unused block in file space, or [] if storage is full
		private nextFreeFiles(n: number): number[] {
			const encoder: TextEncoder = new TextEncoder();
			let blocks: number[] = [];
			for (let t: number = 1; t < TRACKS; t++) {
				for (let s: number = 0; s < SECTORS; s++) {
					for (let b: number = 0; b < BLOCKS; b++) {
						const block: string = sessionStorage.getItem(this.tsbKey(t, s, b));
						const arr: Uint8Array = encoder.encode(block);
						if (arr[0] === 0) {
							blocks.push(this.fromTSB(t, s, b));
							if (block.length === n) {
								return blocks;
							}
						}
					}
				}
			}
			return [];
		}

		public create(file_name: string): number | DiskError {
			//get space for file in directory
			const encoder: TextEncoder = new TextEncoder();
			const fileNameArr: Uint8Array = encoder.encode(file_name);
			if (fileNameArr.length > BLOCK_SIZE - DIR_RESERVED) {
				return DiskError.FILE_NAME_TOO_LONG;
			}
			const dir: number = this.nextFreeDir();
			if (dir === 0) {
				return DiskError.STORAGE_FULL;
			}
			//get space for file data
			const blocks: number[] = this.nextFreeFiles(1);
			if (blocks.length === 0) {
				return DiskError.STORAGE_FULL;
			}
			//set file in directory
			const dirTSB: {t: number, s: number, b: number} = this.toTSB(dir);
			let dirArr: Uint8Array = new Uint8Array(BLOCK_SIZE);
			dirArr[0] = 1;
			dirArr[1] = blocks[0];
			for (let i: number = 0; i < fileNameArr.length; i++) {
				dirArr[i + DIR_RESERVED] = fileNameArr[i];
			}
			const decoder: TextDecoder = new TextDecoder();
			sessionStorage.setItem(this.tsbKey(dirTSB.t, dirTSB.s, dirTSB.b), decoder.decode(dirArr));//data is zeroed-out
			//set file data
			const fileTSB: {t: number, s: number, b: number} = this.toTSB(blocks[0]);
			let fileArr: Uint8Array = new Uint8Array(64);
			fileArr[0] = 1;
			sessionStorage.setItem(this.tsbKey(fileTSB.t, fileTSB.s, fileTSB.b), decoder.decode(fileArr));
			return dir;
		}

		public read(tsb: number): string {
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let arr: Uint8Array = encoder.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
			if (arr[0] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
			}
			let content: string = "";
			let data_len: number = (arr[4] << 8) | arr[3];//length in little-endian
			tsb = arr[1];
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				arr = encoder.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
				if (arr[0] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
				}
				tsb = arr[1];
				if (data_len <= BLOCK_SIZE - FILE_RESERVED) {
					content += decoder.decode(arr.slice(FILE_RESERVED, data_len + FILE_RESERVED));
				} else {
					content += decoder.decode(arr.slice(FILE_RESERVED));
				}
				data_len -= BLOCK_SIZE - FILE_RESERVED;
			}
			return content;
		}

		public write(tsb: number, content: string): void {
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = encoder.encode(sessionStorage.getItem(key));
			if (arr[0] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
			}
			const content_arr: Uint8Array = encoder.encode(content);
			let bytes_written: number = 0;
			tsb = arr[1];
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = encoder.encode(sessionStorage.getItem(key));
				if (arr[0] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
				}
				if (bytes_written === content_arr.length) {
					arr[0] = 0;
				}
				let i: number = FILE_RESERVED;
				for (; i < arr.length && bytes_written < content_arr.length; i++) {
					arr[i] = content_arr[bytes_written];
					bytes_written++;
				}
				if (bytes_written === content_arr.length) {
					for (; i < content_arr.length; i++) {
						arr[i] = 0;
					}
				}
				tsb = arr[1];
				sessionStorage.setItem(key, decoder.decode(arr));
			}
		}

		public delete(tsb: number): void {
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = encoder.encode(sessionStorage.getItem(key));
			if (arr[0] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
			}
			arr[0] = 0;
			tsb = arr[1];
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = encoder.encode(sessionStorage.getItem(key));
				if (arr[0] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
				}
				tsb = arr[1];
				arr[0] = 0;
				sessionStorage.setItem(key, decoder.decode(arr));
			}
		}

		public rename(tsb: number, new_file_name: string): DiskError {
			if (new_file_name.length > BLOCK_SIZE - DIR_RESERVED) {
				return DiskError.FILE_NAME_TOO_LONG;
			}
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			const key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = encoder.encode(sessionStorage.getItem(key));
			const file_name_arr: Uint8Array = encoder.encode(new_file_name);
			arr[2] = file_name_arr.length;
			for (let i: number = 0; i < file_name_arr.length; i++) {
				arr[i + DIR_RESERVED] = file_name_arr[i];
			}
			sessionStorage.setItem(key, decoder.decode(arr));
			return DiskError.SUCCESS;
		}
	}
}