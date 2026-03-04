import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // Sin esta etiqueta, el router.navigate no tiene donde mostrar el contenido
  template: '<router-outlet></router-outlet>' 
})
export class AppComponent {}