'use strict';

// local modules
const Extractor = require('../../shared/extractor');

// globals
const counties = {
    "AB": "Alba",
    "AG": "Argeș",
    "AR": "Arad",
    "B": "București",
    "BC": "Bacău",
    "BH": "Bihor",
    "BN": "Bistrița-Năsăud",
    "BR": "Brăila",
    "BT": "Botoșani",
    "BV": "Brașov",
    "BZ": "Buzău",
    "CJ": "Cluj",
    "CL": "Călărași",
    "CS": "Caraș-Severin",
    "CT": "Constanța",
    "CV": "Covasna",
    "DB": "Dâmbovița",
    "DJ": "Dolj",
    "GJ": "Gorj",
    "GL": "Galați",
    "GR": "Giurgiu",
    "HD": "Hunedoara",
    "HR": "Harghita",
    "IF": "Ilfov",
    "IL": "Ialomița",
    "IS": "Iași",
    "MH": "Mehedinți",
    "MM": "Maramureș",
    "MS": "Mureș",
    "NT": "Neamț",
    "OT": "Olt",
    "PH": "Prahova",
    "SB": "Sibiu",
    "SJ": "Sălaj",
    "SM": "Satu Mare",
    "SV": "Suceava",
    "TL": "Tulcea",
    "TM": "Timiș",
    "TR": "Teleorman",
    "VL": "Vâlcea",
    "VN": "Vrancea",
    "VS": "Vaslui"
}

class _Extractor_VEHICLE extends Extractor {
    constructor() {
        super({
            uppercase: false,
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+|\\s+`, 'gim'),
            candidatRegex: new RegExp('([A-Za-z]{1,2}(\\s*|\\s*-*\\s*)\\d\\s*\\d\\s*\\d?(\\s*|\\s*-*\\s*)([A-Za-z]\\s*){2}[A-Za-z](?![A-Za-z0-9])|[A-Za-z]{1,2}(\\s*|\\s*-*\\s*)0\\s*[1-9](\\s*[0-9]){1,4}(?![A-Za-z0-9]))', 'gmi'),
            isCandidatValid: candidate => {
                candidate = [...candidate.matchAll(new RegExp(`[a-zA-Z0-9]+`, 'gim'))].map(match => match[0])[0];

                let countyCode = null;
                let county = null;

                // if the second char is a digit
                if (!isNaN(candidate.slice(1, 2))) {

                    // assume the first char represents the county code
                    countyCode = candidate.slice(0, 1);

                // if the second char is not a digit
                } else {

                    // assume the first two chars represents the county code
                    countyCode = candidate.slice(0, 2);
                }

                // get the county name by county code (`null` if it does not exist)
                county = counties[countyCode.toUpperCase()] || null;

                // if not county found encoded in the vehicle id => invalid
                if (!county) {
                    return false;
                }

                // if not Bucharest the digits group has three digits => invalid
                if (new RegExp('[A-Za-z]{1,2}(\\s*|\\s*-*\\s*)\\d\\s*\\d\\s*\\d?(\\s*|\\s*-*\\s*)([A-Za-z]\\s*){2}[A-Za-z](?![A-Za-z0-9])', 'gmi').test(candidate) &&
                    countyCode.toUpperCase() !== 'B' &&
                    !isNaN(candidate.slice(4, 5))) {
                    return false;
                }

                return true;
            },
            extractAdditionalData: text => {
                text = [...text.matchAll(new RegExp(`[a-zA-Z0-9]+`, 'gim'))].map(match => match[0])[0];

                let countyCode;
                let county;
                let digits;
                let trigam = null;

                // if the second char is a digit
                if (!isNaN(text.slice(1, 2))) {

                    // assume the first char represents the county code
                    countyCode = text.slice(0, 1);

                    // if the second char is not a digit
                } else {

                    // assume the first two chars represents the county code
                    countyCode = text.slice(0, 2);
                }

                // get the county name by county code
                county = counties[countyCode.toUpperCase()];

                // check if the plate number is not new
                if (new RegExp('[A-Za-z]{1,2}(\\s*|\\s*-*\\s*)\\d\\s*\\d\\s*\\d?(\\s*|\\s*-*\\s*)([A-Za-z]\\s*){2}[A-Za-z](?![A-Za-z0-9])', 'gmi').test(text)) {
                    if (countyCode.toUpperCase() !== 'B') {
                        digits = text.slice(2, 4);
                    } else {
                        if (!isNaN(text.slice(3, 4))) {
                            digits = text.slice(1, 4);
                        } else {
                            digits = text.slice(1, 3);
                        }
                    }
                    trigam = text.slice(-3);
                }

                // if the plate number is new
                else {
                    if (countyCode.toUpperCase() !== 'B') {
                        digits = text.slice(2);
                    } else {
                        digits = text.slice(1);
                    }
                }

                return {
                    VEHICLE_REGISTRATION_COUNTY_CODE: countyCode,
                    VEHICLE_REGISTRATION_COUNTY: county,
                    VEHICLE_REGISTRATION_DIGITS: digits,
                    VEHICLE_REGISTRATION_TRIGRAM: trigam
                };
            }
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            if (datum.additionalData.trigam) {
                datum.possibleData = [
                    `${datum.additionalData.countyCode.toUpperCase()}${datum.additionalData.digits}${datum.additionalData.trigam}`,
                    `${datum.additionalData.countyCode.toUpperCase()} ${datum.additionalData.digits} ${datum.additionalData.trigam}`,
                    `${datum.additionalData.countyCode.toUpperCase()}-${datum.additionalData.digits}-${datum.additionalData.trigam}`,
                    `${datum.additionalData.countyCode.toUpperCase()} - ${datum.additionalData.digits} - ${datum.additionalData.trigam}`
                ];
            } else {
                datum.possibleData = [
                    `${datum.additionalData.countyCode.toUpperCase()}${datum.additionalData.digits}`,
                    `${datum.additionalData.countyCode.toUpperCase()} ${datum.additionalData.digits}`,
                    `${datum.additionalData.countyCode.toUpperCase()}-${datum.additionalData.digits}`,
                    `${datum.additionalData.countyCode.toUpperCase()} - ${datum.additionalData.digits}`
                ];
            }
            delete datum.additionalData.countyCode;
            return datum;
        });
    }
}

module.exports = class Extractor_VEHICLE {
    #extractor;
    constructor() {
        this.#extractor = new _Extractor_VEHICLE();
    }

    extract(text) {
        return this.#extractor.extract(text);
    }
}
