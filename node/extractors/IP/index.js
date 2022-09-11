'use strict';

// installed modules
const ipInfo = require("ip-info-finder");

// local modules
const Extractor = require('../../shared/extractor');

// globals (regexes from ip-regex package)
const ipRegex = new RegExp('(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3})|(?:(?:(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?)(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3})|(?:(?:(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?)', 'gmi');
const ipRegexV4 = new RegExp('(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}', 'gmi');
const ipRegexV6 = new RegExp('(?:(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?', 'gmi');

class _Extractor_IP extends Extractor {
    constructor(version) {
        super({
            tokenizeRegex: new RegExp(`[a-zA-Z0-9]+|\\.`, 'gim'),
            candidatRegex: version ? (version === 'v4' ? ipRegexV4 : (version === 'v6' ? ipRegexV6 : ipRegex)) : ipRegex,
            isCandidatValid: () => true,
            extractAdditionalData: async text => {
                const info = await ipInfo.getIPInfo(text);
                const data = {};

                if (info.provider) {
                    data.INTERNET_SERVICE_PROVIDER = info.provider;
                }

                if (info.Continent) {
                    data.POSTAL_ADDRESS_CONTINENT = info.Continent;
                }

                if (info.Country) {
                    data.POSTAL_ADDRESS_COUNTRY = info.Country;
                }

                if (info.City) {
                    data.POSTAL_ADDRESS_CITY = info.City;
                }

                if (info.postalCode) {
                    data.POSTAL_ADDRESS_POSTAL_CODE = info.postalCode;
                }

                if (info.lat) {
                    data.LATITUDE = info.lat;
                }

                if (info.lon) {
                    data.LONGITUDE = info.lon;
                }

                return data;
            }
        });
    }

    generatePossibleData(data) {
        return data.map(datum => {
            datum.possibleData = [datum.text];
            return datum;
        });
    }
}

module.exports = class Extractor_IP {
    #extractor;
    #extractorV4;
    #extractorV6;
    constructor() {
        this.#extractor = new _Extractor_IP();
        this.#extractorV4 = new _Extractor_IP('v4');
        this.#extractorV6 = new _Extractor_IP('v6');
    }

    extract(text, version) {
        if (version === 'v4') {
            return this.#extractorV4.extract(text);
        } else if (version === 'v6') {
            return this.#extractorV6.extract(text);
        } else {
            return this.#extractor.extract(text);
        }
    }
}


