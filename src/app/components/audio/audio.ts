import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { WhisperService } from '../../services/whisper';

@Component({
  selector: 'app-audio',
  standalone: true,
  imports: [],
  templateUrl: './audio.html',
  styles: []
})
export class AudioComponent implements OnInit, OnDestroy {
  private whisperService = inject(WhisperService);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private streamInterval: any = null;
  
  public statusMessage = this.whisperService.statusMessage;
  public isModelLoaded = this.whisperService.isModelLoaded;
  public isRecording = signal<boolean>(false);
  public transcriptionText = signal<string>('');

  ngOnInit() {
    this.whisperService.loadModel();
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Graba de forma continua sin interrupciones físicas
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.audioChunks = [];
      this.isRecording.set(true);
      this.statusMessage.set('Escuchando continuamente...');

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Iniciamos la captura interna pidiendo datos al buffer cada 1 segundo
      this.mediaRecorder.start(3000);

      // El motor de IA revisa el buffer acumulado cada 3 segundos de forma asíncrona
      this.streamInterval = setInterval(async () => {
        if (this.audioChunks.length > 0 && this.isRecording()) {
          // Clonamos los datos actuales para procesarlos sin detener el micrófono
          const currentBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          
          this.statusMessage.set('Procesando flujo de voz...');
          const fullText = await this.whisperService.transcribeChunk(currentBlob);
          this.statusMessage.set('Escuchando continuamente...');

          if (fullText.trim()) {
            // Reemplaza el texto por la transcripción total acumulada y corregida en contexto
            this.transcriptionText.set(fullText.trim());
          }
        }
      }, 3500);

    } catch (error) {
      console.error('Error con el micrófono:', error);
      this.statusMessage.set('Error: No se pudo acceder al micrófono.');
    }
  }

  stopRecording() {
    this.isRecording.set(false);
    this.statusMessage.set('¡Whisper local listo con WebGPU!');
    
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  ngOnDestroy() {
    if (this.streamInterval) clearInterval(this.streamInterval);
  }
}
