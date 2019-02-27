/**
 * Encapsulate the multiple data formats that can be written to the filesystem
 */
export interface FileSystemData {

    /**
     * Indicate if the data field is a File object
     */
    isFile?: boolean;

    /**
     * Indicate if the data should be appended
     */
    append?: boolean;

    /**
     * Payload to be written to the filesystem
     */
    data: any;

    /**
     * MIME type of the data to be written
     */
    type?: string;

    /**
     * Size in bytes if available
     */
    size?: number;
}
