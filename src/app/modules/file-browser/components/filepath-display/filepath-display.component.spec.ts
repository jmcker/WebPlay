import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FilepathDisplayComponent } from './filepath-display.component';

describe('FilepathDisplayComponent', () => {
  let component: FilepathDisplayComponent;
  let fixture: ComponentFixture<FilepathDisplayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FilepathDisplayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilepathDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
