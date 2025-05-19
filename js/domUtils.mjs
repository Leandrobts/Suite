// js/domUtils.mjs

/**
 * Gets an element by its ID.
 * @param {string} id - The ID of the element.
 * @returns {HTMLElement|null} The element or null if not found.
 */
export function getEl(id) {
    return document.getElementById(id);
}

/**
 * Sets the disabled state of a button.
 * @param {string} buttonId - The ID of the button.
 * @param {boolean} isDisabled - True to disable, false to enable.
 */
export function setButtonDisabled(buttonId, isDisabled) {
    const btn = getEl(buttonId);
    if (btn) {
        btn.disabled = isDisabled;
    }
}

/**
 * Clears the innerHTML of an element.
 * @param {string} elementId - The ID of the element.
 */
export function clearOutput(elementId) {
    const el = getEl(elementId);
    if (el) {
        el.innerHTML = '';
    }
}
