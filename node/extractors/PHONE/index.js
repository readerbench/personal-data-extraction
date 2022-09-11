'use strict';

// installed modules
const phone = require('awesome-phonenumber').parsePhoneNumber;

// local modules
const Extractor = require('../../shared/extractor');

class _Extractor_PHONE extends Extractor {
    constructor() {
        super({
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+`, 'gim'),
            candidatRegex: new RegExp('(\\+4|)?(07[0-8]{1}[0-9]{1}|02[0-9]{2}|03[0-9]{2}){1}?(\\s|\\.|\\-)?([0-9]{3}(\\s|\\.|\\-|)){2}', 'gmi'),
            isCandidatValid: candidate => phone(candidate.trim(), 'RO').isValid(),
            extractAdditionalData: () => {}
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            const pn = phone(datum.text.trim(), 'RO');
            const normalWithCountryCode = pn.getNumber('e164');
            const normal = '0' + pn.getNumber('significant');
            const international = pn.getNumber('international');
            const national = pn.getNumber('national');
            const nationalWithDot = national.split(' ').join('.');
            const nationalWithDash = national.split(' ').join('-');
            datum.possibleData = [
                normalWithCountryCode,
                normal,
                international,
                national,
                nationalWithDot,
                nationalWithDash
            ];
            return datum;
        });
    }
}

module.exports = class Extractor_PHONE {
    #extractor;
    constructor() {
        this.#extractor = new _Extractor_PHONE();
    }

    extract(text) {
        return this.#extractor.extract(text);
    }
}
