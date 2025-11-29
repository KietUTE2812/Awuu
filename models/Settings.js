const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  adminMasterPinHash: { type: String, default: '' },
  updated_at: { type: Date, default: Date.now },
});

const Settings = mongoose.model('Settings', SettingsSchema);
module.exports = Settings;
