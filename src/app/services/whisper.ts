import { Injectable, signal } from '@angular/core';
import { pipeline } from '@huggingface/transformers';

@Injectable({
  providedIn: 'root'
})
export class WhisperService {
  private transcriber: any = null;
  
  // Signals reactivas de Angular para controlar los estados en la interfaz
  public isModelLoaded = signal<boolean>(false);
  public statusMessage = signal<string>('Modelo no inicializado');

  /**
   * Carga el modelo matemático en la memoria de la máquina.
   * Se utiliza 'whisper-base' para asegurar una redacción ortográfica profesional en español.
   */
  async loadModel(): Promise<void> {
    this.statusMessage.set('Cargando motor de IA (Whisper Base) en tu máquina...');
    try {
      // Intenta usar la Tarjeta Gráfica (WebGPU) para máxima velocidad
      this.transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        device: 'webgpu', 
      });
      this.isModelLoaded.set(true);
      this.statusMessage.set('¡Whisper local listo con WebGPU!');
    } catch (error) {
      console.warn('WebGPU no disponible en esta máquina, cambiando a procesamiento por CPU (Wasm)...');
      // Alternativa si la PC no tiene una GPU compatible
      this.transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
        device: 'wasm',
      });
      this.isModelLoaded.set(true);
      this.statusMessage.set('¡Whisper listo (ejecutándose en CPU)!');
    }
  }

  /**
   * Procesa el fragmento binario de audio, lo remuestrea a 16kHz y genera el texto.
   * Contiene filtros de penalización para evitar bucles repetitivos y alucinaciones por silencio.
   */
  async transcribeChunk(audioBlob: Blob): Promise<string> {
    if (!this.isModelLoaded()) {
      throw new Error('El modelo de IA aún no ha sido cargado en el sistema.');
    }

    // 1. Configurar el contexto de audio a la frecuencia exacta que exige Whisper (16000Hz)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioData = audioBuffer.getChannelData(0);

    // 2. Ejecutar inferencia con parámetros avanzados anti-ruido
   const response = await this.transcriber(audioData, {
  chunk_length_s: 30,
  stride_length_s: 5,
  language: 'spanish',
  task: 'transcribe',
  return_timestamps: false,
  
  // Parámetros críticos para flujo continuo acumulado
  temperature: 0.0,            // Elimina la "creatividad" (evita que invente palabras médicas raras)
  repetition_penalty: 1.4,     // Castiga severamente el tartamudeo (como el "y y y")
  no_speech_threshold: 0.5     // Si hay una pausa en el habla, no genera texto basura
});


    // Limpiar espacios en blanco innecesarios en la respuesta
    return response.text ? response.text.trim() : '';
  }
}
