import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveProductionComponent } from './live-production.component';

describe('LiveProductionComponent', () => {
  let component: LiveProductionComponent;
  let fixture: ComponentFixture<LiveProductionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LiveProductionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LiveProductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
