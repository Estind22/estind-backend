// src/utils/applyLeadScopeFilter.js

export const applyLeadScopeFilter = (scope, filter = {}) => {
    switch (scope.level) {

        case "PLATFORM":
            // No restriction
            return filter;

        case "COMPANY":
            filter.company = scope.company;
            return filter;

        case "GROUP":
            filter.company = scope.company;
            if (scope.group) {
                filter.$or = [
                    { group: scope.group },
                    { subAssignees: scope.userId }
                ];
            } else {
                filter.$or = [
                    { assignedTo: scope.userId },
                    { subAssignees: scope.userId }
                ];
            }
            return filter;

        case "TEAM":
            filter.company = scope.company;
            if (scope.team) {
                filter.$or = [
                    { team: scope.team },
                    { subAssignees: scope.userId }
                ];
            } else {
                filter.$or = [
                    { assignedTo: scope.userId },
                    { subAssignees: scope.userId }
                ];
            }
            return filter;

        case "SELF":
            filter.company = scope.company;
            filter.$or = [
                { assignedTo: scope.userId },
                { subAssignees: scope.userId }
            ];
            return filter;

        default:
            filter._id = null;
            return filter;
    }
};


export const applyLeadScopeFilterV2 = (scope, filter = {}) => {
    switch (scope.level) {

        case "PLATFORM":
            // No restriction
            return filter;

        case "COMPANY":
            filter.company = scope.company;
            return filter;

        case "GROUP":
            filter.company = scope.company;
            if (scope.group) {
                const groupMatch = { group: scope.group };
                if (scope.excludedUserIds && scope.excludedUserIds.length > 0) {
                    groupMatch.assignedTo = { $nin: scope.excludedUserIds };
                }
                filter.$or = [
                    groupMatch,
                    { assignedTo: scope.userId },
                    { subAssignees: scope.userId }
                ];
            } else {
                filter.$or = [
                    { assignedTo: scope.userId },
                    { subAssignees: scope.userId }
                ];
            }
            return filter;

        case "TEAM":
            filter.company = scope.company;
            if (scope.team) {
                const teamMatch = { team: scope.team };
                if (scope.excludedUserIds && scope.excludedUserIds.length > 0) {
                    teamMatch.assignedTo = { $nin: scope.excludedUserIds };
                }
                filter.$or = [
                    teamMatch,
                    { assignedTo: scope.userId },
                    { subAssignees: scope.userId }
                ];
            } else {
                filter.$or = [
                    { assignedTo: scope.userId },
                    { subAssignees: scope.userId }
                ];
            }
            return filter;

        case "SELF":
            filter.company = scope.company;
            filter.$or = [
                { assignedTo: scope.userId },
                { subAssignees: scope.userId }
            ];
            return filter;

        default:
            filter._id = null;
            return filter;
    }
};