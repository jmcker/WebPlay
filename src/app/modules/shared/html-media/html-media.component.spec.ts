import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HTMLMediaComponent } from './html-media.component';

describe('HTMLMediaComponent', () => {
  let component: HTMLMediaComponent;
  let fixture: ComponentFixture<HTMLMediaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HTMLMediaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HTMLMediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
