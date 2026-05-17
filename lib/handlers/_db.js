// Minimal DB helper used by other handlers.
// Many handlers expect `require("./_db").getDb()`.
const { getDb } = require("../db");

module.exports = { getDb };

