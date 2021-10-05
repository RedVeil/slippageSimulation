require("dotenv").config({ path: "../.env" });
require("dotenv").config({ path: "../.environment" });

if (process.env.ENV) {
  require('dotenv').config({path: `../.env.${process.env.ENV}` });
}