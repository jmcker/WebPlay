import { FileSystemDirectoryEntry } from './file-system-directory-entry';

/**
 * File and Directory API interface used to represent a file system.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/FileSystem
 */
export interface FileSystem {
    name: string;
    root: FileSystemDirectoryEntry;
}
