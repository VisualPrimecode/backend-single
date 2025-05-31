"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicket = exports.TicketPriority = exports.TicketType = exports.TicketStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Enum for ticket status
var TicketStatus;
(function (TicketStatus) {
    TicketStatus["Open"] = "open";
    TicketStatus["InProgress"] = "in-progress";
    TicketStatus["Closed"] = "closed";
    TicketStatus["OnHold"] = "on-hold";
})(TicketStatus || (exports.TicketStatus = TicketStatus = {}));
var TicketType;
(function (TicketType) {
    TicketType["Billing"] = "billing";
    TicketType["Account"] = "account";
    TicketType["Technical"] = "technical";
    TicketType["General"] = "general";
    TicketType["Feedback"] = "feedback";
})(TicketType || (exports.TicketType = TicketType = {}));
// Enum for ticket priority
var TicketPriority;
(function (TicketPriority) {
    TicketPriority["Low"] = "low";
    TicketPriority["Medium"] = "medium";
    TicketPriority["High"] = "high";
    TicketPriority["Urgent"] = "urgent";
})(TicketPriority || (exports.TicketPriority = TicketPriority = {}));
// Mongoose schema definition
const SupportTicketSchema = new mongoose_1.Schema({
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer ID is required']
    },
    businessId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Business',
        required: [true, 'Business ID is required']
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        minlength: [5, 'Subject must be at least 5 characters long'],
        maxlength: [100, 'Subject cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters long'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
        type: String,
        enum: {
            values: Object.values(TicketStatus),
            message: 'Invalid status value'
        },
        default: TicketStatus.Open
    },
    priority: {
        type: String,
        enum: {
            values: Object.values(TicketPriority),
            message: 'Invalid priority value'
        },
        default: TicketPriority.Medium
    },
    type: {
        type: String,
        enum: {
            values: Object.values(TicketType),
            message: 'Invalid ticket type'
        },
        default: TicketType.General
    },
    assignedAgent: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null
    },
    comments: [{
            role: {
                type: String,
                enum: ['user', 'agent'],
                required: true
            },
            comment: {
                type: String,
                required: true,
                trim: true,
                minlength: [1, 'Comment cannot be empty'],
                maxlength: [1000, 'Comment cannot exceed 1000 characters']
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
    resolution: {
        type: String,
        trim: true,
        maxlength: [2000, 'Resolution cannot exceed 2000 characters'],
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for faster queries
SupportTicketSchema.index({ customerId: 1, status: 1, priority: 1 });
// Mongoose model
exports.SupportTicket = mongoose_1.default.model('SupportTicket', SupportTicketSchema);
