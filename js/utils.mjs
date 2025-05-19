// js/utils.mjs

export const KB = 1024;
export const MB = KB * KB;
export const GB = KB * KB * KB;

export class AdvancedInt64 {
    constructor(low, high) {
        let buffer = new Uint32Array(2);
        let bytes = new Uint8Array(buffer.buffer);

        if (arguments.length > 2) { throw TypeError('AdvancedInt64 takes at most 2 args'); }
        if (arguments.length === 0) { throw TypeError('AdvancedInt64 takes at min 1 args'); }
        let is_one = false;
        if (arguments.length === 1) { is_one = true; }

        if (!is_one) {
            if (typeof (low) !== 'number' && typeof (high) !== 'number') {
                throw TypeError('low/high must be numbers');
            }
        }
        const check_range = (x) => (-0x80000000 <= x) && (x <= 0xffffffff);

        if (typeof low === 'number') {
            if (!check_range(low)) { throw TypeError('low not a valid value: ' + low); }
            if (is_one) {
                high = 0;
                if (low < 0) { high = -1; }
            } else {
                if (!check_range(high)) { throw TypeError('high not a valid value: ' + high); }
            }
            buffer[0] = low;
            buffer[1] = high;
        } else if (typeof low === 'string') { // Hex string
            let hexstr = low;
            if (hexstr.substring(0, 2) === "0x") { hexstr = hexstr.substring(2); }
            if (hexstr.length % 2 === 1) { hexstr = '0' + hexstr; }
            if (hexstr.length > 16) { hexstr = hexstr.substring(hexstr.length - 16); }
            else { hexstr = hexstr.padStart(16, '0');}

            for (let i = 0; i < 8; i++) { 
                bytes[i] = parseInt(hexstr.slice(14 - i*2, 16 - i*2), 16);
            }
        } else if (typeof low === 'object') {
            if (low instanceof AdvancedInt64) {
                bytes.set(low.bytes);
            } else if (low.length === 8) { // Assuming byte array
                bytes.set(low);
            } else { throw TypeError("Array must have exactly 8 elements."); }
        } else {
            throw TypeError('AdvancedInt64 does not support your object for conversion');
        }

        this.buffer = buffer;
        this.bytes = bytes;
    }

    low() { return this.buffer[0]; }
    high() { return this.buffer[1]; }

    toString(is_pretty) {
        let lowStr = this.low().toString(16).padStart(8, '0');
        let highStr = this.high().toString(16).padStart(8, '0');
        if (is_pretty) {
            highStr = highStr.substring(0, 4) + '_' + highStr.substring(4);
            lowStr = lowStr.substring(0, 4) + '_' + lowStr.substring(4);
            return '0x' + highStr + '_' + lowStr;
        }
        return '0x' + highStr + lowStr;
    }

    add(other) {
        if (!(other instanceof AdvancedInt64)) { other = new AdvancedInt64(other); }
        let newLow = (this.low() + other.low()) >>> 0;
        let carry = (this.low() & 0xFFFFFFFF) + (other.low() & 0xFFFFFFFF) > 0xFFFFFFFF ? 1 : 0;
        let newHigh = (this.high() + other.high() + carry) >>> 0;
        return new AdvancedInt64(newLow, newHigh);
    }

    sub(other) {
        if (!(other instanceof AdvancedInt64)) { other = new AdvancedInt64(other); }
        const negOther = other.neg();
        return this.add(negOther);
    }

    neg() {
        const low = ~this.low();
        const high = ~this.high();
        const one = new AdvancedInt64(1,0);
        const res = new AdvancedInt64(low, high);
        return res.add(one);
    }

    eq(other) {
        if (!(other instanceof AdvancedInt64)) { other = new AdvancedInt64(other); }
        return this.low() === other.low() && this.high() === other.high();
    }

    static Zero = new AdvancedInt64(0,0);
    static One = new AdvancedInt64(1,0);
}

export const readWriteUtils = {
    readBytes: (u8_view, offset, size) => {
        let res = 0;
        for (let i = 0; i < size; i++) {
            res += u8_view[offset + i] << (i * 8);
        }
        return res >>> 0;
    },
    read16: (u8_view, offset) => readWriteUtils.readBytes(u8_view, offset, 2),
    read32: (u8_view, offset) => readWriteUtils.readBytes(u8_view, offset, 4),
    read64: (u8_view, offset) => {
        let resBytes = [];
        for (let i = 0; i < 8; i++) {
            resBytes.push(u8_view[offset + i]);
        }
        return new AdvancedInt64(resBytes);
    },
    writeBytes: (u8_view, offset, value, size) => {
        for (let i = 0; i < size; i++) {
            u8_view[offset + i] = (value >>> (i * 8)) & 0xff;
        }
    },
    write16: (u8_view, offset, value) => readWriteUtils.writeBytes(u8_view, offset, value, 2),
    write32: (u8_view, offset, value) => readWriteUtils.writeBytes(u8_view, offset, value, 4),
    write64: (u8_view, offset, value) => {
        if (!(value instanceof AdvancedInt64)) { throw TypeError('write64 value must be an AdvancedInt64'); }
        let low = value.low();
        let high = value.high();
        for (let i = 0; i < 4; i++) { u8_view[offset + i] = (low >>> (i * 8)) & 0xff; }
        for (let i = 0; i < 4; i++) { u8_view[offset + 4 + i] = (high >>> (i * 8)) & 0xff; }
    }
};

export const generalUtils = {
    align: (addrOrInt, alignment) => {
        let a = (addrOrInt instanceof AdvancedInt64) ? addrOrInt : new AdvancedInt64(addrOrInt);
        let low = a.low();
        let high = a.high(); 
        low = (low + alignment -1) & (~(alignment-1)); 
        return new AdvancedInt64(low, high);
    },
    str2array: (str, length, offset = 0) => {
        let a = new Array(length);
        for (let i = 0; i < length; i++) {
            a[i] = str.charCodeAt(i + offset);
        }
        return a;
    }
};

// For example, from your original HTML:
export const jscOffsets = {
    js_butterfly: 0x8,
    view_m_vector: 0x10,
    view_m_length: 0x18,
    view_m_mode: 0x1c,
    size_view: 0x20,
};

export const PAUSE = (ms = 50) => new Promise(r => setTimeout(r, ms));
export const toHex = (val, bits = 32) => { 
    if (typeof val !== 'number' || !isFinite(val)) return 'NaN/Invalid'; 
    let num = Number(val); 
    if (bits <= 32) { num = num >>> 0; } 
    const pad = Math.ceil(bits / 4); 
    return '0x' + num.toString(16).toUpperCase().padStart(pad, '0'); 
};
