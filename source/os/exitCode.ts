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
			switch (this.code) {
				case 0:
					return `Process ${pid} exited successfully.`;
				case 1:
				case 2:
				case 126:
				case 127:
					return `Error in process ${pid}: ${this.description} - exit code ${this.code}`;
				case 132:
				case 139:
				case 130:
					return `Fatal error - process ${pid} exited abnormally: ${this.description} - exit code ${this.code}`;
			}
		}

		public static SUCCESS = new ExitCode(0, "");
		public static GENERIC_ERROR = new ExitCode(1, "generic error");
		public static SHELL_MISUSE = new ExitCode(2, "invalid command or arguments");
		public static CANNOT_EXECUTE_COMMAND = new ExitCode(126, "cannot execute command");
		public static COMMAND_NOT_FOUND = new ExitCode(127, "command not found");
		public static TERMINATED_BY_CTRL_C = new ExitCode(130, "terminated by CTRL + C");
		public static ILLEGAL_INSTRUCTION = new ExitCode(132, "illegal instruction");
		public static SEGMENTATION_FAULT = new ExitCode(139, "segmentation fault");
	}
}