'use strict';

// installed modules
const express = require('express');

module.exports = (Extractor, port) => {
    const app = express();

    app.use(express.urlencoded({extended: true}));
    app.use(express.json());

    const extractor = new Extractor();

    app.post('/',  async function (req, res) {
        extractor.extract(req.body.text).then(result => {
            res.json(result);
        });
    });

    if (extractor.init) {
        extractor.init().then(() => {
            app.listen( port, () => {
                console.log(`Listening on port ${port}`)
            });
        });
    } else {
        app.listen(port, () => {
            console.log(`Listening on port ${port}`)
        });
    }
};
