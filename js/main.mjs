// js/main.mjs
import { getRunBtnS1, getRunBtnCanvasS2, getRunBtnAdvancedS3, getBuildRopChainBtn, getViewMemoryBtn, cacheCommonElements } from './dom_elements.mjs';
import { runAllTestsS1 } from './script1/runAllTestsS1.mjs';
import { runCanvasTestSequenceS2 } from './script2/runCanvasTestSequence.mjs';
import { runAllAdvancedTestsS3 } from './script3/runAllAdvancedTestsS3.mjs';
import { buildRopChainFromUI } from './script3/rop_builder.mjs';
// import { viewMemoryFromUI } from './script3/memory_viewer.mjs'; // Assuming this would exist

function initialize() {
    console.log("Initializing Vulnerability Suite (Modular)...");
    cacheCommonElements(); // Optional: Pre-cache known DOM elements

    const runBtnS1 = getRunBtnS1();
    if (runBtnS1) {
        runBtnS1.addEventListener('click', async () => {
            try {
                await runAllTestsS1();
            } catch (e) {
                console.error("Error running Script 1 tests:", e);
                // Log to UI as well if a global logger is available here
            }
        });
    } else {
        console.warn("Button for Script 1 not found.");
    }

    const runBtnS2 = getRunBtnCanvasS2();
    if (runBtnS2) {
        runBtnS2.addEventListener('click', async () => {
            try {
                await runCanvasTestSequenceS2();
            } catch (e) {
                console.error("Error running Script 2 tests:", e);
            }
        });
    } else {
        console.warn("Button for Script 2 not found.");
    }

    const runBtnS3 = getRunBtnAdvancedS3();
    if (runBtnS3) {
        runBtnS3.addEventListener('click', async () => {
            try {
                await runAllAdvancedTestsS3();
            } catch (e) {
                console.error("Error running Script 3 automated tests:", e);
            }
        });
    } else {
        console.warn("Button for Script 3 not found.");
    }
    
    const buildRopBtn = getBuildRopChainBtn();
    if (buildRopBtn) {
        buildRopBtn.addEventListener('click', () => {
             try {
                buildRopChainFromUI();
            } catch (e) {
                console.error("Error building ROP chain from UI:", e);
            }
        });
    } else {
         console.warn("Button for ROP Builder not found.");
    }

    const viewMemoryBtn = getViewMemoryBtn();
    if (viewMemoryBtn) {
        viewMemoryBtn.addEventListener('click', () => {
            // viewMemoryFromUI(); // Call the respective function
            console.log("Memory Viewer UI button clicked - function not fully implemented in this demo.");
             alert("Memory Viewer logic would be called here.");
        });
    } else {
        console.warn("Button for Memory Viewer not found.");
    }

    console.log("Vulnerability Suite Initialized.");
}

// Run initialization when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
