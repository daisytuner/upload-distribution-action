"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEBUG_CONFIG = exports.DEBUG = void 0;
const fs_1 = __importDefault(require("fs"));
exports.DEBUG = process.env.DAISYTUNER_RUNNER_MODE === 'DEBUG';
exports.DEBUG_CONFIG = {};
if (exports.DEBUG) {
    const debug_config_file = process.env.DAISYTUNER_DEBUG_CONFIG;
    if (debug_config_file && fs_1.default.existsSync(debug_config_file)) {
        exports.DEBUG_CONFIG = JSON.parse(fs_1.default.readFileSync(debug_config_file, 'utf-8'));
    }
}
