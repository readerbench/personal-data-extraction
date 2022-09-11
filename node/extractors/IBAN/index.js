'use strict';

// installed modules
const IBAN = require('iban');

// local modules
const Extractor = require('../../shared/extractor');

class _Extractor_IBAN extends Extractor {
    constructor() {
        super({
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+`, 'gim'),
            candidatRegex: new RegExp('RO\\d{2}[A-Z]{4}\\d{16}', 'gmi'),
            isCandidatValid: candidate => IBAN.isValid(candidate),
            extractAdditionalData: text => {
                const [BIC, ACCOUNT_NUMBER] = IBAN.toBBAN(text, ' ').split(' ');
                return {BIC, ACCOUNT_NUMBER};
            }
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            datum.possibleData = [
                IBAN.printFormat(datum.text, ""),
                IBAN.printFormat(datum.text, " "),
                IBAN.printFormat(datum.text, "-")
            ];
            return datum;
        });
    }
}

module.exports = class Extractor_IBAN {
    #extractor;
    constructor() {
        this.#extractor = new _Extractor_IBAN();
    }

    extract(text) {
        return this.#extractor.extract(text);
    }
}
