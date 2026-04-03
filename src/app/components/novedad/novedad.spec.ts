import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Novedad } from './novedad';

describe('Novedad', () => {
  let component: Novedad;
  let fixture: ComponentFixture<Novedad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Novedad],
    }).compileComponents();

    fixture = TestBed.createComponent(Novedad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
