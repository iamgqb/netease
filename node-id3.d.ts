declare module 'node-id3' {
    export function write(
        tags: any,
        filebuffer: Buffer | string,
    ): Buffer | boolean;
    export function write(
        tags: any,
        filebuffer: Buffer,
        fn: (err: Error, buf: Buffer) => void
    ): undefined
}