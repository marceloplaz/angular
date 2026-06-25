import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatSelectModule, 
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './mapa.html',
  styleUrls: ['./mapa.scss']
})
export class MapaComponent implements AfterViewInit {
  private map!: L.Map;
  private marker!: L.Marker;

  zonas = [
    { nombre: 'Hospital Central', lat: -21.5355, lng: -64.7296 },
    { nombre: 'Clínica Norte', lat: -21.5200, lng: -64.7350 },
    { nombre: 'Centro de Salud Sur', lat: -21.5500, lng: -64.7200 }
  ];

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([-21.5355, -64.7296], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Ajuste para el icono del marcador de Leaflet
    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.marker = L.marker([-21.5355, -64.7296]).addTo(this.map)
      .bindPopup('Ubicación: Hospital Central');
  }

  seleccionarZona(zona: any) {
    this.map.setView([zona.lat, zona.lng], 14);
    this.marker.setLatLng([zona.lat, zona.lng]);
    this.marker.setPopupContent(`Ubicación: ${zona.nombre}`);
    this.marker.openPopup();
  }
}