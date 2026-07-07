export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  APP: 'app',
}

export const ATTENDANCE_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BREAK: 'break'
}

export const ROLES = {
  ADMIN: 'admin',
  COMPANY: 'company',
  EMPLOYEE: 'employee'
}

export const SYSTEM_ROLES = {
  COMPANY_ADMIN: 'company_admin',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
  TEAM_LEADER: 'team_leader',
}

export const GOOGLE_BASE_SCOPES = [
  "openid",
  "email",
  "profile"
];

export const GOOGLE_SERVICE_SCOPES = {
  calendar: [
    ...GOOGLE_BASE_SCOPES,
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
  ],

  meet: [
    ...GOOGLE_BASE_SCOPES,
    "https://www.googleapis.com/auth/calendar.events"
  ],
  gmail: [
    ...GOOGLE_BASE_SCOPES,
    "https://www.googleapis.com/auth/gmail.send"
  ]
};
