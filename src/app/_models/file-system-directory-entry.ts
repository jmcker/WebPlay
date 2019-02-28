import { FileSystemEntry } from './file-system-entry';

/**
 * Entry representing a file or directory.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry
 */
export interface FileSystemDirectoryEntry extends FileSystemEntry {
    /**
     * Create a FileSystemDirectoryReader object which can be used to read the entries in this directory.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/createReader
     */
    createReader();

    /**
     * Fetch a FileSystemDirectoryEntry object representing a directory located
     * at a given path, relative to the directory on which the method is called.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/getDirectory
     *
     * @param path
     * @param options
     * @param successCallback
     * @param errorCallback
     */
    getDirectory(path?, options?, successCallback?, errorCallback?);

    /**
     * Fetch a FileSystemFileEntry object representing a file located within the directory's
     * hierarchy, given a path relative to the directory on which the method is called.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/getFile
     *
     * @param path
     * @param options
     * @param successCallback
     * @param errorCallback
     */
    getFile(path?, options?, successCallback?, errorCallback?);
}
