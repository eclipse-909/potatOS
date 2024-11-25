module TSOS {
	export enum DiskErrorCode {
		Success,
		FileNotFound,
		FileExists,
		DiskNotFormatted,
		StorageFull,
		FileNameTooLong,
		FileOpen,
		FileNotOpen,
		Unrecoverable
	}

	export class DiskError {
		code: DiskErrorCode;
		description: string | undefined;

		private constructor(code: number, desc: string) {
			this.code = code;
			this.description = desc;
		}

		public static SUCCESS: DiskError = new DiskError(DiskErrorCode.Success, undefined);
		public static FILE_NOT_FOUND: DiskError = new DiskError(DiskErrorCode.FileNotFound, "File not found.");
		public static FILE_EXISTS: DiskError = new DiskError(DiskErrorCode.FileExists, "File name already exists.");
		public static DISK_NOT_FORMATTED: DiskError = new DiskError(DiskErrorCode.DiskNotFormatted, "Disk is not formatted.");
		public static STORAGE_FULL: DiskError = new DiskError(DiskErrorCode.StorageFull, "Disk's storage is full.");
		public static FILE_NAME_TOO_LONG: DiskError = new DiskError(DiskErrorCode.FileNameTooLong, "File name too long.");
		public static FILE_OPEN: DiskError = new DiskError(DiskErrorCode.FileOpen, "File is open.");
		public static FILE_NOT_OPEN: DiskError = new DiskError(DiskErrorCode.FileNotOpen, "File is not open.");
		public static UNRECOVERABLE: DiskError = new DiskError(DiskErrorCode.Unrecoverable, "File cannot be recovered.");
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
		public constructor() {
			if (sessionStorage.getItem("formatted") === null) {
				sessionStorage.setItem("formatted", "false");
			}
		}

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

		public file_exists(file_name: string): boolean {return this.get_file(file_name) !== 0;}

		public get_file(file_name: string): number {
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const arr: Uint8Array = encoder.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
					if ((arr[0] === 0) || (s === 0 && b === 0)) {continue;}
					if (decoder.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[2])) === file_name) {
						return this.fromTSB(0, s, b);
					}
				}
			}
			return 0;
		}

		public get_all_files(): string[] {
			let files: string[] = [];
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const arr: Uint8Array = encoder.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
					if ((arr[0] === 0) || (s === 0 && b === 0)) {continue;}
					files.push(decoder.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[2])));
				}
			}
			return files;
		}

		public is_formatted(): boolean {return sessionStorage.getItem("formatted") === "true";}

		public format(full: boolean): DiskError {
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			if (!this.is_formatted() || full) {
				//full
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
			} else {
				//quick
				for (let t: number = 0; t < TRACKS; t++) {
					for (let s: number = 0; s < SECTORS; s++) {
						for (let b: number = 0; b < BLOCKS; b++) {
							const key: string = this.tsbKey(t, s, b);
							let arr: Uint8Array = encoder.encode(sessionStorage.getItem(key));
							arr[0] = t === 0 && s === 0 && b === 0? 1 : 0;
							sessionStorage.setItem(key, decoder.decode(arr));
						}
					}
				}
			}
			sessionStorage.setItem("formatted", "true");
			return DiskError.SUCCESS;
		}

		//Returns the tsb of the next unused block in directory space, or 0 if storage is full.
		private nextFreeDir(): number {
			const encoder: TextEncoder = new TextEncoder();
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const arr: Uint8Array = encoder.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
					if (arr[0] === 0) {
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
							if (blocks.length === n) {
								return blocks;
							}
						}
					}
				}
			}
			return [];
		}

		public create(file_name: string): number | DiskError {
			if (!this.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			if (this.file_exists(file_name)) {return DiskError.FILE_EXISTS;}
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
			//set file in directory
			const dirTSB: {t: number, s: number, b: number} = this.toTSB(dir);
			let dirArr: Uint8Array = new Uint8Array(BLOCK_SIZE);
			dirArr[0] = 1;
			dirArr[2] = fileNameArr.length;
			for (let i: number = 0; i < fileNameArr.length; i++) {
				dirArr[i + DIR_RESERVED] = fileNameArr[i];
			}
			const decoder: TextDecoder = new TextDecoder();
			sessionStorage.setItem(this.tsbKey(dirTSB.t, dirTSB.s, dirTSB.b), decoder.decode(dirArr));
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

		public write(tsb: number, content: string): DiskError {
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = encoder.encode(sessionStorage.getItem(key));
			let dirArr: Uint8Array = arr;
			const dirKey: string = key;
			if (arr[0] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to write to an unused block in the disk.");
			}
			const content_arr: Uint8Array = encoder.encode(content);
			let bytes_written: number = 0;
			tsb = arr[1];
			//delete all blocks in the file space
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = encoder.encode(sessionStorage.getItem(key));
				if (arr[0] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
				}
				tsb = arr[1];
				arr[0] = 0;
				sessionStorage.setItem(key, decoder.decode(arr));
			}
			//get new blocks in file space
			const blocks: number[] = this.nextFreeFiles(Math.ceil(content_arr.length / (BLOCK_SIZE - FILE_RESERVED)));
			if (blocks.length === 0) {
				return DiskError.STORAGE_FULL;
			}
			dirArr[1] = blocks[0];//set new tsb link
			dirArr[3] = content_arr.length & 0xFF;//set length of data
			dirArr[4] = (content_arr.length >> 8) & 0xFF;
			sessionStorage.setItem(dirKey, decoder.decode(dirArr));
			//write into new blocks in file space
			for (let i: number = 0; i < blocks.length; i++) {
				TSB = this.toTSB(blocks[i]);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = new Uint8Array(BLOCK_SIZE);
				arr[0] = 1;
				if (i + 1 < blocks.length) {
					arr[1] = blocks[i + 1];
				}
				for (let ii: number = FILE_RESERVED; ii < BLOCK_SIZE && bytes_written < content_arr.length; ii++) {
					arr[ii] = content_arr[bytes_written];
					bytes_written++;
				}
				sessionStorage.setItem(key, decoder.decode(arr));
			}
			return DiskError.SUCCESS;
		}

		public delete(file_name: string): DiskError {
			if (!this.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			let tsb: number = this.get_file(file_name);
			if (tsb === 0) {
				return DiskError.FILE_NOT_FOUND;
			}
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = encoder.encode(sessionStorage.getItem(key));
			if (arr[0] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
			}
			arr[0] = 0;
			sessionStorage.setItem(key, decoder.decode(arr));
			tsb = arr[1];
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = encoder.encode(sessionStorage.getItem(key));
				if (arr[0] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
				}
				tsb = arr[1];
				arr[0] = 0;
				sessionStorage.setItem(key, decoder.decode(arr));
			}
			return DiskError.SUCCESS;
		}

		public rename(file_name: string, new_file_name: string): DiskError {
			if (!this.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			let tsb: number = this.get_file(file_name);
			if (tsb === 0) {
				return DiskError.FILE_NOT_FOUND;
			}
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

		public recover(file_name: string): DiskError {
			const encoder: TextEncoder = new TextEncoder();
			const decoder: TextDecoder = new TextDecoder();
			let tsb: number = -1;
			let found: boolean = false;
			let length: number = 0;
			let tsbs: number[] = [];
			let arr: Uint8Array;
			let key: string;
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					if (s == 0 && b == 0) {continue;}
					key = this.tsbKey(0, s, b);
					arr = encoder.encode(sessionStorage.getItem(key));
					if (decoder.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[2])) !== file_name) {continue;}
					if (found) {
						return DiskError.UNRECOVERABLE;
					}
					if (arr[0] === 1) {
						return DiskError.FILE_EXISTS;
					}
					found = true;
					tsbs.push(this.fromTSB(0, s, b));
					tsb = arr[1];
					length = (arr[4] << 8) | arr[3];
				}
			}
			if (!found) {
				return DiskError.UNRECOVERABLE;
			}
			while (tsb !== 0) {
				tsbs.push(tsb);
				const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = encoder.encode(sessionStorage.getItem(key));
				if (arr[0] === 1 || (tsbs.length - 2) * (BLOCK_SIZE - FILE_RESERVED) > length) {
					return DiskError.UNRECOVERABLE;
				}
				tsb = arr[1];
			}
			if ((tsbs.length - 1) * (BLOCK_SIZE - FILE_RESERVED) < length) {
				return DiskError.UNRECOVERABLE;
			}
			for (const block of tsbs) {
				const TSB: {t: number, s: number, b: number} = this.toTSB(block);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = encoder.encode(sessionStorage.getItem(key));
				arr[0] = 1;
				sessionStorage.setItem(key, decoder.decode(arr));
			}
			return DiskError.SUCCESS;
		}

		public garbageCollect(): void {
			const encoder: TextEncoder = new TextEncoder();
			let tsb: number = -1;
			let tsbs: number[] = [];
			let arr: Uint8Array;
			let key: string;
			//get directory TSBs
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					if (s == 0 && b == 0) {continue;}
					key = this.tsbKey(0, s, b);
					arr = encoder.encode(sessionStorage.getItem(key));
					tsb = arr[1];
					tsbs.push(tsb);
				}
			}
			//get file TSBs
			const len: number = tsbs.length;
			for (let i: number = 0; i < len; i++) {
				tsb = tsbs[0];
				while (tsb !== 0) {
					const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
					key = this.tsbKey(TSB.t, TSB.s, TSB.b);
					arr = encoder.encode(sessionStorage.getItem(key));
					tsb = arr[1];
					if (tsb !== 0) {
						tsbs.push(tsb);
					}
				}
			}
			//Delete all untracked TSBs
			for (let t: number = 1; t < TRACKS; t++) {
				for (let s: number = 0; s < SECTORS; s++) {
					for (let b: number = 0; b < BLOCKS; b++) {
						if (tsbs.findIndex(block => {return block === this.fromTSB(t, s, b);}) === -1) {
							const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
							key = this.tsbKey(TSB.t, TSB.s, TSB.b);
							arr = encoder.encode(sessionStorage.getItem(key));
							arr[1] = 0;
						}
					}
				}
			}
		}

		public defragment(): void {}
	}
}