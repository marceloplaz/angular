import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionPersonalServicio } from './gestion-personal-servicio';

describe('GestionPersonalServicio', () => {
  let component: GestionPersonalServicio;
  let fixture: ComponentFixture<GestionPersonalServicio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionPersonalServicio],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionPersonalServicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
