import { FileSystem } from './file-system';

/**
 * Entry representing a file or directory.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry
 */
export interface FileSystemEntry {
    filesystem: FileSystem;
    fullPath: string;
    isDirectory: boolean;
    isFile: boolean;
    name: string;

    /**
     * Copy the file specified by the entry to a new location on the file system.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry/copyTo
     *
     * @param newParent
     * @param newName
     * @param sucessCallback
     * @param errorCallback
     */
    copyTo(newParent, newName?, sucessCallback?, errorCallback?);

    /**
     * Obtain a Metadata object with information about the file system entry,
     * such as its modification date and time and its size.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry/getMetadata
     *
     * @param sucessCallback
     * @param errorCallback
     */
    getMetadata(sucessCallback, errorCallback?);

    /**
     * Obtain a FileSystemDirectoryEntry.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry/getParent
     *
     * @param sucessCallback
     * @param errorCallback
     */
    getParent(sucessCallback, errorCallback?);

    /**
     * Move the file specified by the entry to a new location on the file system,
     * or renames the file if the destination directory is the same as the source.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry/moveTo
     *
     * @param newParent
     * @param newName
     * @param sucessCallback
     * @param errorCallback
     */
    moveTo(newParent, newName?, sucessCallback?, errorCallback?);

    /**
     * Remove the specified file or directory. You can only remove directories which are empty.
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry/remove
     *
     * @param sucessCallback
     * @param errorCallback
     */
    remove(sucessCallback, errorCallback?);

    /**
     * Creates and returns a URL which identifies the entry. This URL uses the URL scheme "filesystem:".
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry/toURL
     *
     * @param mimeType An optional string specifying the MIME type to use when interpreting the file.
     */
    toURL(mimeType?);
}
