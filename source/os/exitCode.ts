module TSOS {
	export class ExitCode {
		public code: number;
		public description: string | undefined;

		constructor(code: number, desc: string) {
			this.code = code;
			this.description = desc;
		}

		public isSuccess(): boolean {return this.code === 0;}

		public shellPrintDesc(): void {
			if (this.description) {
				_StdOut.putText(this.description);
				_StdOut.advanceLine();
			}
		}

		public processPrintDesc(): void {
			switch (this.code) {
				case 0:
					_StdOut.putText("Process exited successfully.");
					break;
				case 1:
				case 2:
				case 126:
				case 127:
					_StdOut.putText(`Error: ${this.description} - exit code ${this.code}`);
					break;
				case 132:
				case 139:
				case 130:
					_StdOut.putText(`Fatal error - process exited abnormally: ${this.description} - exit code ${this.code}`);
					break;
			}
		}
	}

	export const SUCCESS = new ExitCode(0, "");
	export const GENERIC_ERROR = new ExitCode(1, "generic error");
	export const SHELL_MISUSE = new ExitCode(2, "invalid command or arguments");
	export const CANNOT_EXECUTE_COMMAND = new ExitCode(126, "cannot execute command");
	export const COMMAND_NOT_FOUND = new ExitCode(127, "command not found");
	export const TERMINATED_BY_CTRL_C = new ExitCode(130, "terminated by CTRL + C");
	export const ILLEGAL_INSTRUCTION = new ExitCode(132, "illegal instruction");
	export const SEGMENTATION_FAULT = new ExitCode(139, "segmentation fault");
}