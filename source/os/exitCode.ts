module TSOS {
	export class ExitCode {
		public code: number;
		public description: string | undefined;

		constructor(code: number, desc: string) {
			this.code = code;
			this.description = desc;
		}

		public isSuccess(): boolean {return this.code === 0;}

		public shellDesc(): string {
			return this.description? `${this.description}\n` : "";
		}

		public processDesc(pid: number): string {
			if (this.code === 0) {
				return `Process ${pid} exited successfully.`;
			} else if (this.code < 128) {
				return `Error in process ${pid}: - ${this.description} - exit code ${this.code}`;
			} else {
				return `Fatal error - process ${pid} exited abnormally: ${this.description} - exit code ${this.code}`;
			}
		}

		public static SUCCESS: ExitCode = new ExitCode(0, "");

		public static GENERIC_ERROR: ExitCode = new ExitCode(1, "generic error");
		public static SHELL_MISUSE: ExitCode = new ExitCode(2, "invalid command or arguments");
		public static CANNOT_EXECUTE_COMMAND: ExitCode = new ExitCode(3, "cannot execute command");
		public static COMMAND_NOT_FOUND: ExitCode = new ExitCode(4, "command not found");
		public static TERMINATED_BY_CTRL_C: ExitCode = new ExitCode(5, "terminated by CTRL + C");
		public static PROC_KILLED: ExitCode = new ExitCode(6, "process killed manually");

		public static ILLEGAL_INSTRUCTION: ExitCode = new ExitCode(128, "illegal instruction");
		public static SEGMENTATION_FAULT: ExitCode = new ExitCode(129, "segmentation fault");
	}
}