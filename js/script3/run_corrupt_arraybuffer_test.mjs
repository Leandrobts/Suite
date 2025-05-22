// js/script3/run_corrupt_arraybuffer_test.mjs
import { logS3, PAUSE_S3 } from './s3_utils.mjs';
import { getRunBtnAdvancedS3, getOutputAdvancedS3 } from '../dom_elements.mjs';
import { exploitCorruptArrayBuffer } from './exploit_corrupt_arraybuffer.mjs';

export async function runCorruptArrayBufferTest() {
    const FNAME = 'runCorruptArrayBufferTest';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3("==== Iniciando Teste de Corrupção de ArrayBuffer ====", "test", FNAME);
    await exploitCorruptArrayBuffer();
    logS3("==== Teste Concluído ====", "test", FNAME);

    if (runBtn) runBtn.disabled = false;
}
