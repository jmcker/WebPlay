import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UsageDisplayComponent } from './usage-display.component';

describe('UsageDisplayComponent', () => {
  let component: UsageDisplayComponent;
  let fixture: ComponentFixture<UsageDisplayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UsageDisplayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsageDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
