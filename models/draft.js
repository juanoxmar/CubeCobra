const mongoose = require('mongoose');
const cardSchema = require('./cardSchema');

// data for each seat, human or bot
const Seat = {
  bot: [String], // null bot value means human player
  name: String,
  userid: String,
  drafted: [[cardSchema]], // organized draft picks
  sideboard: [[cardSchema]], // organized draft picks
  pickorder: [cardSchema],
  packbacklog: [[cardSchema]],
};

// Cube schema
const draftSchema = mongoose.Schema({
  cube: String,
  initial_state: [[[cardSchema]]],
  seats: [Seat],
  unopenedPacks: [[[cardSchema]]],
  basics: {
    Plains: cardSchema,
    Island: cardSchema,
    Swamp: cardSchema,
    Mountain: cardSchema,
    Forest: cardSchema,
  },
});

module.exports = mongoose.model('Draft', draftSchema);
