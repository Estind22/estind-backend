import mongoose from 'mongoose';
import { ROLES, SYSTEM_ROLES } from './constants.js';

export const resolveScope = (user) => {
    // CRM admin
    if (user.role === ROLES.ADMIN) {
        return {
            level: 'PLATFORM'
        };
    }

    // Company admin
    if (
        user.role === ROLES.COMPANY ||
        user.systemRole === SYSTEM_ROLES.COMPANY_ADMIN
    ) {
        return {
            level: 'COMPANY',
            company: user.company
        };
    }

    // Sales Manager
    if (user.systemRole === SYSTEM_ROLES.SALES_MANAGER) {
        return {
            level: 'GROUP',
            company: user.company,
            group: user.group || null,
            userId: user._id
        };
    }

    // Team Leader
    if (user.systemRole === SYSTEM_ROLES.TEAM_LEADER) {
        return {
            level: 'TEAM',
            company: user.company,
            team: user.team || null,
            userId: user._id
        };
    }

    // Sales Executive default
    return {
        level: 'SELF',
        company: user.company,
        userId: user._id
    };
};
export const resolvePeerIds = async (scope) => {
    if (scope.level === 'GROUP' && scope.group) {
        const peers = await mongoose.model("User").find({
            group: scope.group,
            systemRole: SYSTEM_ROLES.SALES_MANAGER,
            _id: { $ne: scope.userId }
        }).select("_id").lean();
        return peers.map(p => p._id);
    }

    if (scope.level === 'TEAM' && scope.team) {
        const peers = await mongoose.model("User").find({
            team: scope.team,
            systemRole: SYSTEM_ROLES.TEAM_LEADER,
            _id: { $ne: scope.userId }
        }).select("_id").lean();
        return peers.map(p => p._id);
    }

    return [];
};
