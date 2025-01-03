/* ----------------------------------
   DeviceDriverKeyboard.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */

module TSOS {
	export class DeviceDriverKeyboard extends DeviceDriver {
		capsLock: boolean;

		constructor() {
			super();
			this.driverEntry = this.krnKbdDriverEntry;
			this.isr = this.krnKbdDispatchKeyPress;
			this.capsLock = false;
		}

		public krnKbdDriverEntry() {
			// Initialization routine for this, the kernel-mode Keyboard Device Driver.
			this.status = "loaded";
			// More?
		}

		public krnKbdDispatchKeyPress(params: any[]) {
			// Parse the params.  TODO: Check that the params are valid and osTrapError if not.
			const keyCode = params[0];
			const isShifted: boolean = params[1];
			const isCtrl: boolean = params[2];
			_Kernel.krnTrace("Key code:" + keyCode + " shifted:" + isShifted + " ctrl:" + isCtrl);
			// Check to see if we even want to deal with the key that was pressed.
			switch (keyCode) {
				case 20:    //caps lock
					this.capsLock = !this.capsLock;
					return;
			}
			const charCode: number = this.getCharCode(keyCode, isShifted, isCtrl);
			if (charCode !== 0) {
				_KernelInputQueue.enqueue(String.fromCharCode(charCode));
			}
		}

		// Gets the char code from the key code.
		// Considers if shift or caps lock is active.
		// Returns 0 if an invalid keyCode was given.
		// Negative numbers represent custom char codes that aren't represented with ASCII.
		getCharCode(keyCode: number, isShifted: boolean, isCtrl: boolean): number {
			switch (keyCode) {
				//Reference: cases generated by Chat-GPT - fixed by Ethan
				case 8:  return 8;     // 'Backspace'
				case 9:  return 9;     // 'Tab'
				case 13: return 13;    // 'Enter'

				case 32: return 32;    // ' ' (space) remains the same
				case 33: return isShifted ? -8 : 0; // page up
				case 34: return isShifted ? -9 : 0; // page down
				case 35: return isShifted ? -10 : -6; // end - shifted = scroll to bottom - unshifted = move cursor to end of line
				case 36: return isShifted ? -11 : -7; // home - shifted = scroll to top - unshifted = move cursor to beginning of line

				// I had to make up my own char codes since these aren't ascii characters,
				//but the number still needs to make it to the kernel input queue.
				case 37: return -1; // left arrow
				case 38: return isShifted && isCtrl ? -12 : -2; // up arrow - shifted = up one line - unshifted = previous command in history
				case 39: return -3; // right arrow
				case 40: return isShifted && isCtrl ? -13 : -4; // down arrow - shifted = down one line - unshifted = next command in history

				case 45: return -5;//insert
				case 46: return 127;//delete

				case 48: return isShifted ? 41 : 48;  // ')' or '0'
				case 49: return isShifted ? 33 : 49;  // '!' or '1'
				case 50: return isShifted ? 64 : 50;  // '@' or '2'
				case 51: return isShifted ? 35 : 51;  // '#' or '3'
				case 52: return isShifted ? 36 : 52;  // '$' or '4'
				case 53: return isShifted ? 37 : 53;  // '%' or '5'
				case 54: return isShifted ? 94 : 54;  // '^' or '6'
				case 55: return isShifted ? 38 : 55;  // '&' or '7'
				case 56: return isShifted ? 42 : 56;  // '*' or '8'
				case 57: return isShifted ? 40 : 57;  // '(' or '9'
				case 65: return isShifted || this.capsLock ? 65 : 97;  // 'A' or 'a'

				case 66: return isShifted || this.capsLock ? 66 : 98;  // 'B' or 'b'
				case 67:
					if (isShifted || this.capsLock) {
						return 67;  // 'C'
					} else if (isCtrl) {
						return 3;   // 'ctrl + C'
					} else {
						return 99;  // 'c'
					}
				case 68: return isShifted || this.capsLock ? 68 : 100; // 'D' or 'd'
				case 69: return isShifted || this.capsLock ? 69 : 101; // 'E' or 'e'
				case 70: return isShifted || this.capsLock ? 70 : 102; // 'F' or 'f'
				case 71: return isShifted || this.capsLock ? 71 : 103; // 'G' or 'g'
				case 72: return isShifted || this.capsLock ? 72 : 104; // 'H' or 'h'
				case 73: return isShifted || this.capsLock ? 73 : 105; // 'I' or 'i'
				case 74: return isShifted || this.capsLock ? 74 : 106; // 'J' or 'j'
				case 75: return isShifted || this.capsLock ? 75 : 107; // 'K' or 'k'
				case 76: return isShifted || this.capsLock ? 76 : 108; // 'L' or 'l'
				case 77: return isShifted || this.capsLock ? 77 : 109; // 'M' or 'm'
				case 78: return isShifted || this.capsLock ? 78 : 110; // 'N' or 'n'
				case 79: return isShifted || this.capsLock ? 79 : 111; // 'O' or 'o'
				case 80: return isShifted || this.capsLock ? 80 : 112; // 'P' or 'p'
				case 81: return isShifted || this.capsLock ? 81 : 113; // 'Q' or 'q'
				case 82: return isShifted || this.capsLock ? 82 : 114; // 'R' or 'r'
				case 83: return isShifted || this.capsLock ? 83 : 115; // 'S' or 's'
				case 84: return isShifted || this.capsLock ? 84 : 116; // 'T' or 't'
				case 85: return isShifted || this.capsLock ? 85 : 117; // 'U' or 'u'
				case 86: return isShifted || this.capsLock ? 86 : 118; // 'V' or 'v'
				case 87: return isShifted || this.capsLock ? 87 : 119; // 'W' or 'w'
				case 88: return isShifted || this.capsLock ? 88 : 120; // 'X' or 'x'
				case 89: return isShifted || this.capsLock ? 89 : 121; // 'Y' or 'y'
				case 90: return isShifted || this.capsLock ? 90 : 122; // 'Z' or 'z'

				case 186: return isShifted ? 58 : 59;  // ':' or ';'
				case 187: return isShifted ? 43 : 61;  // '+' or '='
				case 188: return isShifted ? 60 : 44;  // '<' or ','
				case 189: return isShifted ? 95 : 45;  // '_' or '-'
				case 190: return isShifted ? 62 : 46;  // '>' or '.'
				case 191: return isShifted ? 63 : 47;  // '?' or '/'
				case 192: return isShifted ? 126 : 96; // '~' or '`'
				case 219: return isShifted ? 123 : 91; // '{' or '['
				case 220: return isShifted ? 124 : 92; // '|' or '\'
				case 221: return isShifted ? 125 : 93; // '}' or ']'
				case 222: return isShifted ? 34 : 39;  // '"' or '\''

				default: return 0;  // Return 0 if no mapping is found
			}
		}
	}
}