import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionMenuComponent } from './production-menu.component';

describe('ProductionMenuComponent', () => {
    let component: ProductionMenuComponent;
    let fixture: ComponentFixture<ProductionMenuComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ProductionMenuComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ProductionMenuComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
