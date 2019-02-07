import { Component, OnInit } from '@angular/core';
import { FileSystemService } from 'src/app/_services/file-system.service';

@Component({
    selector: 'app-usage-display',
    templateUrl: './usage-display.component.html',
    styleUrls: ['./usage-display.component.css']
})
export class UsageDisplayComponent implements OnInit {

    private free: number = 0;
    private used: number = 0;
    private capacity: number = 0;

    constructor(public fss: FileSystemService) {
        console.log(fss);

        fss.isOpen$.subscribe((data) => {
            console.log(`Value: ${data}`);
        });
    }

    ngOnInit() {
    }

}
