module TSOS {
	//A functional builder-pattern for making software interrupts relating to the file system
	class FileCommand {
		private diskAction: DiskAction;
		private on_success: null | ((stderr: ErrStream<string[]>, params: any[]) => void);
		private on_error: null | ((stderr: ErrStream<string[]>, err: DiskError) => void);
		private callback: null | ((stderr: ErrStream<string[]>, params: any[]) => void);
		private readonly params: any[];

		public constructor(diskAction: DiskAction, params: any[]) {
			this.diskAction = diskAction;
			this.on_success = null;
			this.on_error = null;
			this.callback = null;
			this.params = params;
		}

		//Does the file command only if the previous command succeeds.
		public and_try(next: FileCommand): FileCommand {
			if (this.on_success === null) {
				this.on_success = (stderr: ErrStream<string[]>, _params: any[]): void => {
					next.execute(stderr);
				};
			} else {
				const fn: (stderr: ErrStream<string[]>, _params: any[]) => void = this.on_success;
				this.on_success = (stderr: ErrStream<string[]>, params: any[]): void => {
					fn(stderr, params);
					next.execute(stderr);
				};
			}
			return this;
		}

		//Executes the function only if the previous command fails.
		public catch(on_error: (stderr: ErrStream<string[]>, err: DiskError) => void): FileCommand {
			if (this.on_error === null) {
				this.on_error = on_error;
			} else {
				const fn: (stderr: ErrStream<string[]>, err: DiskError) => void = this.on_error;
				this.on_error = (stderr: ErrStream<string[]>, err: DiskError): void => {
					fn(stderr, err);
					on_error(stderr, err);
				};
			}
			return this;
		}

		//Will always do the file command regardless of if the previous one succeeds or fails.
		public and_do(next: FileCommand): FileCommand {
			if (this.callback === null) {
				this.callback = (stderr: ErrStream<string[]>, _params: any[]): void => {
					next.execute(stderr);
				};
			} else {
				const fn: (stderr: ErrStream<string[]>, params: any[]) => void = this.callback;
				this.callback = (stderr: ErrStream<string[]>, params: any[]): void => {
					fn(stderr, params);
					next.execute(stderr);
				};
			}
			return this;
		}

		//Will execute the function only if the previous command succeeds.
		public and_try_run(on_success: (stderr: ErrStream<string[]>, params: any[]) => void): FileCommand {
			if (this.on_success === null) {
				this.on_success = on_success;
			} else {
				const fn: (stderr: ErrStream<string[]>, params: any[]) => void = this.on_success;
				this.on_success = (stderr: ErrStream<string[]>, params: any[]): void => {
					fn(stderr, params);
					on_success(stderr, params);
				};
			}
			return this;
		}

		//Will always execute the function regardless of if the previous one succeeds or fails.
		public and_do_run(callback: (stderr: ErrStream<string[]>, params: any[]) => void): FileCommand {
			if (this.callback === null) {
				this.callback = callback;
			} else {
				const fn: (stderr: ErrStream<string[]>, params: any[]) => void = this.callback;
				this.callback = (stderr: ErrStream<string[]>, params: any[]): void => {
					fn(stderr, params);
					callback(stderr, params);
				};
			}
			return this;
		}

		public execute(stderr: ErrStream<string[]>): void {
			if (this.on_success !== null) {
				const fn: (stderr: ErrStream<string[]>, params: any[]) => void = this.on_success;
				this.on_success = (_stderr: ErrStream<string[]>, params: any[]): void => {
					fn(stderr, params);
				};
			}
			if (this.on_error !== null) {
				const fn: (stderr: ErrStream<string[]>, err: DiskError) => void = this.on_error;
				this.on_error = (_stderr: ErrStream<string[]>, err: DiskError): void => {
					fn(stderr, err)
				};
			}
			if (this.callback !== null) {
				const fn: (stderr: ErrStream<string[]>, params: any[]) => void = this.callback;
				this.callback = (_stderr: ErrStream<string[]>, params: any[]): void => {
					fn(stderr, params);
				};
			}
			_KernelInterruptQueue.enqueue(new Interrupt(IRQ.disk, [this.diskAction, this.on_success, this.on_error, this.callback].concat(this.params)));
		}
	}

	export class FileSystem {
		//Since the shell is the only thing that uses files, and files cannot be opened in two places simultaneously,
		//we might as well just have a map right here that tracks the open files.
		public open_files: Map<string, FCB>;

		public constructor() {
			this.open_files = new Map<string, FCB>();
		}

		public format(full: boolean): FileCommand {
			return new FileCommand(DiskAction.Format, [full]);
		}

		public create(file_name: string): FileCommand {
			return new FileCommand(DiskAction.Create, [file_name]);
		}

		public open(file_name: string): FileCommand {
			return new FileCommand(DiskAction.Open, [file_name]);
		}

		public close(file_name: string): FileCommand {
			return new FileCommand(DiskAction.Close, [file_name]);
		}

		//The file must be opened before being read.
		public read(file_name: string): FileCommand {
			return new FileCommand(DiskAction.Read, [file_name]);
		}

		//The file must be opened before being written to.
		public write(file_name: string, content: string): FileCommand {
			return new FileCommand(DiskAction.Write, [file_name, content]);
		}

		public delete(file_name: string): FileCommand {
			return new FileCommand(DiskAction.Delete, [file_name]);
		}

		public copy(file_name: string, copied_file_name: string): FileCommand {
			return this.open(file_name)
				.and_try(this.read(file_name)
					.and_try(this.create(copied_file_name)
						.and_try_run((_stderr: ErrStream<string[]>, params: any[]): void => {
							this.write(copied_file_name, params[0])
								.catch((stderr: ErrStream<string[]>, err: DiskError): void => {stderr.error([err.description]);});
						})
						.catch((stderr: ErrStream<string[]>, err: DiskError): void => {stderr.error([err.description]);})
						.and_do(this.close(copied_file_name))
					)
					.catch((stderr: ErrStream<string[]>, err: DiskError): void => {stderr.error([err.description]);})
					.and_do(this.close(file_name))
				)
				.catch((stderr: ErrStream<string[]>, err: DiskError): void => {stderr.error([err.description]);});
		}

		public rename(file_name: string, new_file_name: string): FileCommand {
			return new FileCommand(DiskAction.Rename, [file_name, new_file_name]);
		}

		public ls(stdout: OutStream<string[]>, sh_hidden: boolean, new_line: boolean): FileCommand {
			return new FileCommand(DiskAction.Ls, [stdout, sh_hidden, new_line]);
		}

		public recover(file_name: string): FileCommand {
			return new FileCommand(DiskAction.Recover, [file_name]);
		}

		public garbageCollect(): FileCommand {
			return new FileCommand(DiskAction.GarbageCollect, []);
		}

		public defragment(): FileCommand {
			return new FileCommand(DiskAction.Defragment, []);
		}
	}
}