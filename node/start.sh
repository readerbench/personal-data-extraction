#!/bin/bash

node extractors/ADDRESS/api.js & \
node extractors/CAEN/api.js & \
node extractors/CARD/api.js & \
node extractors/CNP/api.js & \
node extractors/EMAIL/api.js & \
node extractors/IBAN/api.js & \
node extractors/IP/api.js & \
node extractors/MAC/api.js & \
node extractors/PHONE/api.js & \
node extractors/VEHICLE/api.js & \
node outgoing/personal_information_extraction/api.js
