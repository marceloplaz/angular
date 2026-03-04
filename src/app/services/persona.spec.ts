import { TestBed } from '@angular/core/testing';

import { Persona } from './persona';

describe('Persona', () => {
  let service: Persona;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Persona);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
