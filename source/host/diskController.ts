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

	//TODO include size and create date
	//1 for in-use flag, 1 for tsb, 1 for length of file name in bytes, 2 for length of data in little-endian bytes, 2 for date stored as 0bMMMM_DDDD 0bDYYY_YYYY which represents MM/DD/YY
	const DIR_RESERVED: number = 7;
	//1 for in-use flag, 1 for tsb
	const FILE_RESERVED: number = 2;

	const IN_USE_INDEX: number = 0;
	const TSB_INDEX: number = 1;
	const FILE_NAME_LEN_INDEX: number = 2;
	const DATA_LEN_LOW_INDEX: number = 3;
	const DATA_LEN_HIGH_INDEX: number = 4;
	const DATE_LOW_INDEX: number = 5;
	const DATE_HIGH_INDEX: number = 6;

	export class DiskController {
		public constructor() {
			if (sessionStorage.getItem("formatted") === null) {
				sessionStorage.setItem("formatted", "false");
			}
		}

		public decode(arr: Uint8Array): string {
			let str: string = '';
			for (let i: number = 0; i < arr.length; i++) {
				str += String.fromCharCode(arr[i]);
			}
			return str;
		}

		public encode(str: string): Uint8Array {
			const arr = new Uint8Array(str.length);
			for (let i: number = 0; i < str.length; i++) {
				arr[i] = str.charCodeAt(i);
			}
			return arr;
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

		//returns TSB of file, or 0 if it doesn't exist
		public get_file(file_name: string): number {
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const arr: Uint8Array = this.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
					if ((arr[IN_USE_INDEX] === 0) || (s === 0 && b === 0)) {continue;}
					if (this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])) === file_name) {
						return this.fromTSB(0, s, b);
					}
				}
			}
			return 0;
		}

		public get_all_files(): string[] {
			let files: string[] = [];
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const val: string = sessionStorage.getItem(this.tsbKey(0, s, b));
					const arr: Uint8Array = this.encode(val);
					if ((arr[IN_USE_INDEX] === 0) || (s === 0 && b === 0)) {continue;}
					files.push(this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])));
				}
			}
			return files;
		}

		public file_size(tsb: number): number {
			const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			const arr: Uint8Array = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
			return BLOCK_SIZE * (Math.ceil(((arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX]) / (BLOCK_SIZE - FILE_RESERVED)) + 1);
		}

		public file_create_date(tsb: number): string {
			const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			const arr: Uint8Array = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
			const month: number = arr[DATE_LOW_INDEX] >> 4 & 0b1111;
			const day: number = (arr[DATE_LOW_INDEX] << 1 | arr[DATE_HIGH_INDEX] >> 7) & 0b11111;
			const year: number = arr[DATE_HIGH_INDEX] & 0b1111111;
			const formattedMonth: string = month.toString().padStart(2, "0");
			const formattedDay: string = day.toString().padStart(2, "0");
			const formattedYear: string = (year % 100).toString().padStart(2, "0");
			return `${formattedMonth}/${formattedDay}/${formattedYear}`;
		}

		public is_formatted(): boolean {return sessionStorage.getItem("formatted") === "true";}

		public format(full: boolean): DiskError {
			if (!this.is_formatted() || full) {
				//full
				for (let t: number = 0; t < TRACKS; t++) {
					for (let s: number = 0; s < SECTORS; s++) {
						for (let b: number = 0; b < BLOCKS; b++) {
							let arr: Uint8Array = new Uint8Array(BLOCK_SIZE);
							if (t === 0 && s === 0 && b === 0) {
								arr[IN_USE_INDEX] = 1;
							}
							sessionStorage.setItem(this.tsbKey(t, s, b), this.decode(arr));
						}
					}
				}
			} else {
				//quick
				for (let t: number = 0; t < TRACKS; t++) {
					for (let s: number = 0; s < SECTORS; s++) {
						for (let b: number = 0; b < BLOCKS; b++) {
							const key: string = this.tsbKey(t, s, b);
							let arr: Uint8Array = this.encode(sessionStorage.getItem(key));
							arr[IN_USE_INDEX] = t === 0 && s === 0 && b === 0? 1 : 0;
							sessionStorage.setItem(key, this.decode(arr));
						}
					}
				}
			}
			sessionStorage.setItem("formatted", "true");
			Control.updateDiskDisplay();
			return DiskError.SUCCESS;
		}

		//Returns the tsb of the next unused block in directory space, or 0 if storage is full.
		private nextFreeDir(): number {
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const arr: Uint8Array = this.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
					if (arr[IN_USE_INDEX] === 0) {
						return this.fromTSB(0, s, b);
					}
				}
			}
			return 0;
		}

		//Returns the TSBs of the next n unused block in file space, or [] if storage is full
		private nextFreeFiles(n: number): number[] {
			let blocks: number[] = [];
			for (let t: number = 1; t < TRACKS; t++) {
				for (let s: number = 0; s < SECTORS; s++) {
					for (let b: number = 0; b < BLOCKS; b++) {
						const block: string = sessionStorage.getItem(this.tsbKey(t, s, b));
						const arr: Uint8Array = this.encode(block);
						if (arr[IN_USE_INDEX] === 0) {
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
			const fileNameArr: Uint8Array = this.encode(file_name);
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
			dirArr[IN_USE_INDEX] = 1;
			dirArr[FILE_NAME_LEN_INDEX] = fileNameArr.length;
			const now: Date = new Date();
			const month: number = now.getMonth() + 1;
			const day: number = now.getDate();
			const year: number = now.getFullYear() % 100;
			dirArr[DATE_LOW_INDEX] = (month << 4) | (day >> 1);
			dirArr[DATE_HIGH_INDEX] = ((day << 7) | (year & 0b1111111)) & 0xFF;
			for (let i: number = 0; i < fileNameArr.length; i++) {
				dirArr[i + DIR_RESERVED] = fileNameArr[i];
			}
			sessionStorage.setItem(this.tsbKey(dirTSB.t, dirTSB.s, dirTSB.b), this.decode(dirArr));
			Control.updateDiskDisplay();
			return dir;
		}

		public read(tsb: number): string {
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let arr: Uint8Array = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
			if (arr[IN_USE_INDEX] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
			}
			let content: string = "";
			let data_len: number = (arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX];//length in little-endian
			tsb = arr[TSB_INDEX];
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				arr = this.encode(sessionStorage.getItem(this.tsbKey(TSB.t, TSB.s, TSB.b)));
				if (arr[IN_USE_INDEX] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to read an unused block in the disk.");
				}
				tsb = arr[TSB_INDEX];
				if (data_len <= BLOCK_SIZE - FILE_RESERVED) {
					content += this.decode(arr.slice(FILE_RESERVED, data_len + FILE_RESERVED));
				} else {
					content += this.decode(arr.slice(FILE_RESERVED));
				}
				data_len -= BLOCK_SIZE - FILE_RESERVED;
			}
			return content;
		}

		public write(tsb: number, content: string): DiskError {
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = this.encode(sessionStorage.getItem(key));
			let dirArr: Uint8Array = arr;
			const dirKey: string = key;
			if (arr[IN_USE_INDEX] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to write to an unused block in the disk.");
			}
			const content_arr: Uint8Array = this.encode(content);
			let bytes_written: number = 0;
			tsb = arr[TSB_INDEX];
			//delete all blocks in the file space
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = this.encode(sessionStorage.getItem(key));
				if (arr[IN_USE_INDEX] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
				}
				tsb = arr[TSB_INDEX];
				arr[IN_USE_INDEX] = 0;
				sessionStorage.setItem(key, this.decode(arr));
			}
			//stop early if erasing content
			if (content_arr.length === 0) {
				dirArr[TSB_INDEX] = 0;
				sessionStorage.setItem(dirKey, this.decode(dirArr));
				Control.updateDiskDisplay();
				return DiskError.SUCCESS;
			}
			//get new blocks in file space
			const blocks: number[] = this.nextFreeFiles(Math.ceil(content_arr.length / (BLOCK_SIZE - FILE_RESERVED)));
			if (blocks.length === 0) {
				return DiskError.STORAGE_FULL;
			}
			dirArr[TSB_INDEX] = blocks[0];//set new tsb link
			dirArr[DATA_LEN_LOW_INDEX] = content_arr.length & 0xFF;//set length of data
			dirArr[DATA_LEN_HIGH_INDEX] = (content_arr.length >> 8) & 0xFF;
			sessionStorage.setItem(dirKey, this.decode(dirArr));
			//write into new blocks in file space
			for (let i: number = 0; i < blocks.length; i++) {
				TSB = this.toTSB(blocks[i]);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = new Uint8Array(BLOCK_SIZE);
				arr[IN_USE_INDEX] = 1;
				if (i + 1 < blocks.length) {
					arr[TSB_INDEX] = blocks[i + 1];
				}
				for (let ii: number = FILE_RESERVED; ii < BLOCK_SIZE && bytes_written < content_arr.length; ii++) {
					arr[ii] = content_arr[bytes_written];
					bytes_written++;
				}
				sessionStorage.setItem(key, this.decode(arr));
			}
			Control.updateDiskDisplay();
			return DiskError.SUCCESS;
		}

		public append(tsb: number, content: string): DiskError {
			//TODO you could write out all the logic to make this slightly faster, but this is so much easier
			const new_content:string = this.read(tsb) + content;
			return this.write(tsb, new_content);
		}

		public delete(file_name: string): DiskError {
			if (!this.is_formatted()) {return DiskError.DISK_NOT_FORMATTED;}
			let tsb: number = this.get_file(file_name);
			if (tsb === 0) {
				return DiskError.FILE_NOT_FOUND;
			}
			let TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			let key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = this.encode(sessionStorage.getItem(key));
			if (arr[IN_USE_INDEX] === 0) {
				//unreachable
				_Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
			}
			arr[IN_USE_INDEX] = 0;
			sessionStorage.setItem(key, this.decode(arr));
			tsb = arr[TSB_INDEX];
			while (tsb !== 0) {
				TSB = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = this.encode(sessionStorage.getItem(key));
				if (arr[IN_USE_INDEX] === 0) {
					//unreachable
					_Kernel.krnTrapError("Attempted to delete an unused block in the disk.");
				}
				tsb = arr[TSB_INDEX];
				arr[IN_USE_INDEX] = 0;
				sessionStorage.setItem(key, this.decode(arr));
			}
			Control.updateDiskDisplay();
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
			const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
			const key: string = this.tsbKey(TSB.t, TSB.s, TSB.b);
			let arr: Uint8Array = this.encode(sessionStorage.getItem(key));
			const file_name_arr: Uint8Array = this.encode(new_file_name);
			arr[FILE_NAME_LEN_INDEX] = file_name_arr.length;
			for (let i: number = 0; i < file_name_arr.length; i++) {
				arr[i + DIR_RESERVED] = file_name_arr[i];
			}
			sessionStorage.setItem(key, this.decode(arr));
			Control.updateDiskDisplay();
			return DiskError.SUCCESS;
		}

		public recover(file_name: string): DiskError {
			let tsb: number = -1;
			let found: boolean = false;
			let length: number = 0;
			let tsbs: number[] = [];
			let arr: Uint8Array;
			let key: string;
			//look for file with matching name
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					if (s == 0 && b == 0) {continue;}
					key = this.tsbKey(0, s, b);
					arr = this.encode(sessionStorage.getItem(key));
					if (this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])) !== file_name) {continue;}
					if (found) {
						return DiskError.UNRECOVERABLE;
					}
					if (arr[IN_USE_INDEX] === 1) {
						return DiskError.FILE_EXISTS;
					}
					found = true;
					tsbs.push(this.fromTSB(0, s, b));
					tsb = arr[TSB_INDEX];
					length = (arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX];
				}
			}
			if (!found) {
				return DiskError.UNRECOVERABLE;
			}
			//loop through linked blocks to gather possible data
			while (tsb !== 0) {
				tsbs.push(tsb);
				const TSB: {t: number, s: number, b: number} = this.toTSB(tsb);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = this.encode(sessionStorage.getItem(key));
				if (arr[IN_USE_INDEX] === 1 || (tsbs.length - 2) * (BLOCK_SIZE - FILE_RESERVED) > length) {
					return DiskError.UNRECOVERABLE;
				}
				tsb = arr[TSB_INDEX];
			}
			//make sure the length matches
			if ((tsbs.length - 1) * (BLOCK_SIZE - FILE_RESERVED) < length) {
				return DiskError.UNRECOVERABLE;
			}
			//set blocks as in-use
			for (const block of tsbs) {
				const TSB: {t: number, s: number, b: number} = this.toTSB(block);
				key = this.tsbKey(TSB.t, TSB.s, TSB.b);
				arr = this.encode(sessionStorage.getItem(key));
				arr[IN_USE_INDEX] = 1;
				sessionStorage.setItem(key, this.decode(arr));
			}
			Control.updateDiskDisplay();
			return DiskError.SUCCESS;
		}

		public garbageCollect(): void {
			let tsb: number = -1;
			let tsbs: number[] = [];
			let arr: Uint8Array;
			let key: string;
			//get directory TSBs
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					if (s == 0 && b == 0) {continue;}
					key = this.tsbKey(0, s, b);
					arr = this.encode(sessionStorage.getItem(key));
					tsb = arr[TSB_INDEX];
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
					arr = this.encode(sessionStorage.getItem(key));
					tsb = arr[TSB_INDEX];
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
							arr = this.encode(sessionStorage.getItem(key));
							arr[TSB_INDEX] = 0;
						}
					}
				}
			}
			Control.updateDiskDisplay();
		}

		private save_disk(): string[][][] {
			let disk: string[][][] = [];
			for (let t: number = 0; t < TRACKS; t++) {
				const row: string[][] = [];
				for (let s: number = 0; s < SECTORS; s++) {
					const col: string[] = new Array(BLOCKS).fill("");
					row.push(col);
				}
				disk.push(row);
			}
			for (let t: number = 0; t < TRACKS; t++) {
				for (let s: number = 0; s < SECTORS; s++) {
					for (let b: number = 0; b < BLOCKS; b++) {
						disk[t][s][b] = sessionStorage.getItem(this.tsbKey(t,s,b));
					}
				}
			}
			return disk;
		}

		private load_disk(disk: string[][][]): void {
			for (let t: number = 0; t < TRACKS; t++) {
				for (let s: number = 0; s < SECTORS; s++) {
					for (let b: number = 0; b < BLOCKS; b++) {
						sessionStorage.setItem(this.tsbKey(t,s,b), disk[t][s][b]);
					}
				}
			}
		}

		public defragment(): DiskError {
			const disk: string[][][] = this.save_disk();
			const files: {name: string, tsb: number, data: string | null}[] = [];
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const arr: Uint8Array = this.encode(sessionStorage.getItem(this.tsbKey(0, s, b)));
					if ((arr[IN_USE_INDEX] === 0) || (s === 0 && b === 0)) {continue;}
					files.push({name: this.decode(arr.slice(DIR_RESERVED, DIR_RESERVED + arr[FILE_NAME_LEN_INDEX])), tsb: this.fromTSB(0, s, b), data: null});
				}
			}
			for (const file of files) {
				file.data = this.read(file.tsb);
			}
			this.format(true);
			for (const file of files) {
				const tsb: number | DiskError = this.create(file.name);
				if (tsb instanceof DiskError) {
					this.load_disk(disk);
					return tsb;
				}
				if (file.data === null || file.data.length === 0) {continue;}
				this.write(tsb, file.data);
			}
			Control.updateDiskDisplay();
			return DiskError.SUCCESS;
		}

		public get_html_table_file_index_string(): string {
			let str: string = "";
			for (let s: number = 0; s < SECTORS; s++) {
				for (let b: number = 0; b < BLOCKS; b++) {
					const key: string = this.tsbKey(0, s, b);
					const item: string = sessionStorage.getItem(key);
					const arr: Uint8Array = this.encode(item);
					const TSB: {t: number, s: number, b: number} = this.toTSB(arr[TSB_INDEX]);
					str += `<tr>`
						+ `<td>${key}</td>`
						+ `<td>${arr[IN_USE_INDEX]}</td>`
						+ `<td>${this.tsbKey(TSB.t, TSB.s, TSB.b)}</td>`
						+ `<td>${arr[FILE_NAME_LEN_INDEX]}</td>`
						+ `<td>${(arr[DATA_LEN_HIGH_INDEX] << 8) | arr[DATA_LEN_LOW_INDEX]}</td>`
						+ `<td>${this.file_create_date(this.fromTSB(0, s, b))}</td>`
						+ `<td>${item.substring(DIR_RESERVED)}</td>`
						+ `</tr>`;
				}
			}
			return str;
		}

		public get_html_table_file_string(): string {
			let str: string = "";
			for (let t: number = 1; t < TRACKS; t++) {
				for (let s: number = 0; s < SECTORS; s++) {
					for (let b: number = 0; b < BLOCKS; b++) {
						const key: string = this.tsbKey(t, s, b);
						const item: string = sessionStorage.getItem(key);
						const arr: Uint8Array = this.encode(item);
						const TSB: { t: number, s: number, b: number } = this.toTSB(arr[TSB_INDEX]);
						str += `<tr>`
							+ `<td>${key}</td>`
							+ `<td>${arr[IN_USE_INDEX]}</td>`
							+ `<td>${this.tsbKey(TSB.t, TSB.s, TSB.b)}</td>`
							+ `<td>${item.substring(FILE_RESERVED)}</td>`
							+ `</tr>`;
					}
				}
			}
			return str;
		}
	}
}