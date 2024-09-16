module TSOS {
	export interface OutStream<T> {
		output(buffer: T): void;
	}
	export interface InStream<T> {
		input(): T;
	}
	export interface ErrStream<T> {
		error(buffer: T): void;
	}
}