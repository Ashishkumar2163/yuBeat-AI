/*
const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    language: {
      type: String,
      default: 'English',
    },
    wordsText: {
      type: String,
      default: '',
    },
    layout: {
      type: String,
      enum: ['four', 'repeat', 'single'],
      default: 'four',
    },
    repeatCount: {
      type: Number,
      min: 1,
      max: 4,
      default: 4,
    },
    template: {
      type: String,
      default: 'neon',
    },
    bpm: {
      type: Number,
      min: 40,
      max: 240,
      default: 120,
    },
    timing: {
      type: String,
      default: '1 beat',
    },
    showMeaning: {
      type: Boolean,
      default: true,
    },
    showPinyin: {
      type: Boolean,
      default: true,
    },
    audioName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Project', projectSchema)
 */

const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    language: { type: String, default: 'English' },
    targetLanguage: { type: String, default: 'Chinese' },
    wordsText: { type: String, default: '' },
    layout: { type: String, default: 'four' },
    repeatCount: { type: Number, default: 4, min: 1, max: 4 },
    template: { type: String, default: 'neon' },
    bpm: { type: Number, default: 120, min: 40, max: 240 },
    timing: { type: String, default: '1 beat' },
    showMeaning: { type: Boolean, default: true },
    showPinyin: { type: Boolean, default: true },
    audioName: { type: String, default: '' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Project', projectSchema)
