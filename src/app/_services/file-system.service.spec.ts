import { TestBed } from '@angular/core/testing';

import { FileSystemService } from './file-system.service';

describe('FileSystemService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: FileSystemService = TestBed.get(FileSystemService);
        expect(service).toBeTruthy();
    });

    it('should process dirname correctly', () => {
        const service: FileSystemService = TestBed.get(FileSystemService);

        service.init()
        .then(() => {
            expect(service.dirname('./testdir')).toEqual('/');
            expect(service.dirname('../testdir')).toEqual('/');
            expect(service.dirname('filesystem:http://localhost:4200/persistent/test2')).toEqual('filesystem:http://localhost:4200/persistent');
        });
    });
});
