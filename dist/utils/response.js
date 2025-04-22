"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, statusCode, message, data) => {
    return res.status(statusCode).json({
        status: 'success',
        message,
        data: data || null,
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, statusCode, message, error) => {
    return res.status(statusCode).json({
        status: 'error',
        message,
        error: error || null,
    });
};
exports.sendError = sendError;
