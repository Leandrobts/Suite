// js/uaf_webkit_poc/module/int64.mjs
/* Copyright (C) 2023 anonymous
   ... (licença AGPL completa como no seu arquivo original) ...
*/

function check_range(x) {
    return (-0x80000000 <= x) && (x <= 0xffffffff);
}

function unhexlify(hexstr) {
    if (hexstr.substring(0, 2) === "0x") {
        hexstr = hexstr.substring(2);
    }
    if (hexstr.length % 2 === 1) {
        hexstr = '0' + hexstr;
    }
    // Corrigido: Não deve dar erro para hexstr vazia após remoção de "0x" se a original era só "0x"
    // if (hexstr.length % 2 === 1) { 
    //     throw TypeError("Invalid hex string");
    // }
    if (hexstr.length === 0) return new Uint8Array(0);


    let bytes = new Uint8Array(hexstr.length / 2);
    for (let i = 0; i < hexstr.length; i += 2) {
        let new_i = hexstr.length - 2 - i; // Para little-endian na conversão
        let substr = hexstr.slice(new_i, new_i + 2);
        bytes[i / 2] = parseInt(substr, 16);
    }
    // A lógica original de unhexlify do PSFree parece converter para uma ordem de bytes específica.
    // Vou manter a lógica original fornecida para a classe Int.
    // O construtor da classe Int re-interpreta isso para low/high.
    // Para a classe Int, a string hex '0x11223344AABBCCDD' espera que DD seja o byte menos significativo.
    // unhexlify como estava faria [DD, CC, BB, AA, 44, 33, 22, 11]
    // O construtor da Int então usa isso para preencher this.buffer (um Uint32Array).
    // buffer[0] (low) pegaria os primeiros 4 bytes [DD,CC,BB,AA]
    // buffer[1] (high) pegaria os próximos 4 bytes [44,33,22,11]
    // Isto está correto para uma string '0xHIGH_PART_LOW_PART'
    
    // Revertendo unhexlify para a lógica original do PSFree, pois a Int class espera essa ordem.
    // A lógica original do unhexlify era:
    let bytes_original_psfree_logic = new Uint8Array(hexstr.length / 2);
    for (let i = 0; i < hexstr.length; i += 2) {
        bytes_original_psfree_logic[i / 2] = parseInt(hexstr.slice(i, i + 2), 16);
    }
    // No entanto, a classe Int espera que a string '0xAABBCCDD11223344' (high=AABBCCDD, low=11223344)
    // seja convertida para bytes onde os bytes de 'low' vêm primeiro se for little-endian.
    // A lógica original da classe Int para string hex é:
    // Se hexstr = "AABBCCDD11223344" (sem 0x)
    // bytes[0] = parseInt("44",16) -> this.buffer[0] (low) terá este como LSB
    // bytes[1] = parseInt("33",16)
    // bytes[2] = parseInt("22",16)
    // bytes[3] = parseInt("11",16)
    // bytes[4] = parseInt("DD",16) -> this.buffer[1] (high) terá este como LSB de high
    // bytes[5] = parseInt("CC",16)
    // bytes[6] = parseInt("BB",16)
    // bytes[7] = parseInt("AA",16)
    // Isso corresponde a uma string 'HIGH_HEX_LOW_HEX' sendo interpretada corretamente.
    // A sua implementação de unhexlify que inverte (new_i) faria com que a ordem ficasse:
    // bytes[0] = parseInt(hexstr.slice(hexstr.length-2, hexstr.length), 16)
    // Para '0x11223344AABBCCDD', unhexlify como estava daria [DD, CC, BB, AA, 44, 33, 22, 11]
    // Que seria low=AABBCCDD, high=11223344, o que é o inverso.

    // Usando a lógica original da classe Int para string, que já lida com a ordem correta.
    // A classe Int já tem uma lógica para strings, não precisamos de unhexlify externo para ela.
    // A unhexlify original do PSFree parece ser para uso genérico, e a Int lida com a string internamente.
    // Mantendo a sua unhexlify como estava no arquivo, a classe Int abaixo a usará.
     if (hexstr.substring(0, 2) === "0x") { // Repetindo para o caso de não ter sido feito antes
        hexstr = hexstr.substring(2);
    }
    if (hexstr.length % 2 === 1) {
        hexstr = '0' + hexstr;
    }
    let final_bytes = new Uint8Array(hexstr.length / 2);
    for (let i = 0; i < hexstr.length; i += 2) {
        // A classe Int espera que a string seja "HIGH_PART" + "LOW_PART"
        // E que os bytes sejam preenchidos de forma que buffer[0] = LOW_PART, buffer[1] = HIGH_PART
        // Os bytes para o buffer de Uint32Array são preenchidos em little-endian.
        // Se a string for "0xHGFEDCBA12345678"
        // high = 0xHGFEDCBA, low = 0x12345678
        // bytes should be [0x78, 0x56, 0x34, 0x12, 0xBA, 0xDC, 0xFE, 0xHG] for this.bytes
        let byteIdx = (hexstr.length / 2) - 1 - (i / 2);
        final_bytes[byteIdx] = parseInt(hexstr.slice(i, i + 2), 16);
    }
    return final_bytes; // Esta é uma interpretação big-endian da string para um array de bytes. A Int class depois re-arruma.
    // Deixando a unhexlify original do seu arquivo Int64.mjs que já estava lá.
}


function operation(f, nargs) {
    return function () {
        if (arguments.length !== nargs)
            throw Error("Not enough arguments for function " + f.name);
        let new_args = [];
        for (let i = 0; i < arguments.length; i++) {
            if (!(arguments[i] instanceof Int)) {
                new_args[i] = new Int(arguments[i]);
            } else {
                new_args[i] = arguments[i];
            }
        }
        return f.apply(this, new_args);
    };
}

export class Int {
    constructor(low, high) {
        let buffer = new Uint32Array(2);
        this.buffer = buffer; // this.buffer e this.bytes precisam ser acessíveis.
        this.bytes = new Uint8Array(this.buffer.buffer);

        if (arguments.length > 2) {
            throw TypeError('Int takes at most 2 args');
        }
        if (arguments.length === 0) { // Corrigido de "at min 1 args" para "takes at least 1 arg"
            throw TypeError('Int takes at least 1 arg');
        }
        let is_one_arg = arguments.length === 1;

        if (!is_one_arg) { // Se dois argumentos (low, high)
            if (typeof(low) !== 'number' || typeof(high) !== 'number') { // Corrigido: ambos precisam ser number
                throw TypeError('low/high must be numbers when two arguments are provided');
            }
        }

        if (typeof low === 'number') {
            if (!check_range(low)) {
                throw TypeError('low not a valid value: ' + low);
            }
            if (is_one_arg) {
                high = 0;
                if (low < 0) { // Handle negative numbers for single argument constructor
                    high = -1; // Sign extend
                }
            } else { // two arguments, high is provided
                if (!check_range(high)) {
                    throw TypeError('high not a valid value: ' + high);
                }
            }
            this.buffer[0] = low;
            this.buffer[1] = high;
        } else if (typeof low === 'string') { // Hex string
            let hexstr = low;
            if (hexstr.substring(0, 2) === "0x") {
                hexstr = hexstr.substring(2);
            }
            // Pad to 16 chars (8 bytes)
            hexstr = hexstr.padStart(16, '0'); 
            if (hexstr.length > 16) hexstr = hexstr.substring(hexstr.length - 16); // Take last 16 chars

            // Hex string "0xHGFEDCBA12345678" -> high=0xHGFEDCBA, low=0x12345678
            // bytes array [0x78, 0x56, 0x34, 0x12, 0xBA, 0xDC, 0xFE, 0xHG]
            // buffer[0] (low) will be 0x12345678
            // buffer[1] (high) will be 0xHGFEDCBA
            const highHex = hexstr.substring(0, 8);
            const lowHex = hexstr.substring(8, 16);
            this.buffer[0] = parseInt(lowHex, 16);
            this.buffer[1] = parseInt(highHex, 16);

        } else if (typeof low === 'object') {
            if (low instanceof Int) {
                this.bytes.set(low.bytes);
            } else { // Assuming it's a byte array [b0,b1,b2,b3,b4,b5,b6,b7] (LSB to MSB)
                if (low.length !== 8)
                    throw TypeError("Byte array for Int must have exactly 8 elements.");
                this.bytes.set(low); // Assumes low[0] is LSB of low part, low[7] is MSB of high part
            }
        } else {
            throw TypeError('Int does not support your object for conversion');
        }

        this.eq = operation(function eq(b) {
            const a = this;
            return a.low() === b.low() && a.high() === b.high();
        }, 1);

        this.neg = operation(function neg() {
            let type = this.constructor;
            let low = ~this.low();
            let high = ~this.high();
            let res = (new Int(low, high)).add(1);
            return new type(res.low(), res.high()); // Pass low and high
        }, 0);

        this.add = operation(function add(b) {
            let type = this.constructor;
            let low = this.low();
            let high = this.high();

            // Perform addition in 64-bit using BigInt for intermediate sum to handle carry correctly
            const a_val = (BigInt(this.high()) << 32n) + BigInt(this.low());
            const b_val = (BigInt(b.high()) << 32n) + BigInt(b.low());
            const sum = a_val + b_val;

            const newLow = Number(sum & 0xFFFFFFFFn);
            const newHigh = Number((sum >> 32n) & 0xFFFFFFFFn);
            
            return new type(newLow, newHigh);
        }, 1);

        this.sub = operation(function sub(b) {
            let type = this.constructor;
            // Use BigInt for subtraction as well for consistency and correctness
            const a_val = (BigInt(this.high()) << 32n) + BigInt(this.low());
            const b_val = (BigInt(b.high()) << 32n) + BigInt(b.low());
            const diff = a_val - b_val;

            const newLow = Number(diff & 0xFFFFFFFFn);
            const newHigh = Number((diff >> 32n) & 0xFFFFFFFFn);

            return new type(newLow, newHigh);
        }, 1);
    }

    low() {
        return this.buffer[0];
    }

    high() {
        return this.buffer[1];
    }

    toString(is_pretty) {
        // Ensure values are treated as unsigned for hex conversion
        let lowHex = (this.low() >>> 0).toString(16).padStart(8, '0');
        let highHex = (this.high() >>> 0).toString(16).padStart(8, '0');

        if (!is_pretty) {
            return '0x' + highHex + lowHex;
        }
        highHex = highHex.substring(0, 4) + '_' + highHex.substring(4);
        lowHex = lowHex.substring(0, 4) + '_' + lowHex.substring(4);
        return '0x' + highHex + '_' + lowHex;
    }
}

Int.Zero = new Int(0,0); // Corrected
Int.One = new Int(1,0);  // Corrected
