// src/utils/defaultPermissions.js
export const DEFAULT_PERMISSIONS = {
    admin: [
        "users.create",
        "users.update",
        "users.delete",
        "companies.create",
        "companies.update",
        "companies.delete",
        "leads.*"
    ],
    company: [
        "users.create.salesManager",
        "users.update.team",
        "users.create.executive",
        "users.update.own",   // update own users and employees in same company (enforced in controller)
        "users.delete.manager",
        "users.delete.team",
        "users.delete.executive",
        "companies.read",
        "companies.update"
    ],
    employee: [
        "leads.read.own",
        "leads.create",
        "leads.update.own"
    ],
    // designation-level fine tuning (optional)
    "Sales Manager": [
        "users.create.executive",
        "users.update.team",
        "leads.assign",
        "leads.read.team",
        "users.update.salesManager"
    ],
    "Sales Executive": [
        "leads.create",
        "leads.read.own",
        "leads.update.own"
    ]
};
