/* --------
   Utils.ts

   Utility functions.
   -------- */

module TSOS {
	export class Utils {
		public static rot13(str: string): string {
			/*
			   This is an easy-to understand implementation of the famous and common Rot13 obfuscator.
			   You can do this in three lines with a complex regular expression, but I'd have
			   trouble explaining it in the future.  There's a lot to be said for obvious code.
			*/
			let retVal: string = "";
			for (const i in <any>str) {    // We need to cast the string to any for use in the for...in construct.
				const ch: string = str[i];
				let code: number = 0;
				if ("abcedfghijklmABCDEFGHIJKLM".indexOf(ch) >= 0) {
					code = str.charCodeAt(Number(i)) + 13;  // It's okay to use 13.  It's not a magic number, it's called rot13.
					retVal = retVal + String.fromCharCode(code);
				} else if ("nopqrstuvwxyzNOPQRSTUVWXYZ".indexOf(ch) >= 0) {
					code = str.charCodeAt(Number(i)) - 13;  // It's okay to use 13.  See above.
					retVal = retVal + String.fromCharCode(code);
				} else {
					retVal = retVal + ch;
				}
			}
			return retVal;
		}
	}
}