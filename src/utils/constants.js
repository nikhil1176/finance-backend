const ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
};

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.ANALYST]: 2,
  [ROLES.VIEWER]: 1,
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const RECORD_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

const CATEGORIES = [
  'salary', 'freelance', 'investment', 'rent', 'utilities',
  'groceries', 'transport', 'entertainment', 'healthcare',
  'education', 'shopping', 'travel', 'food', 'insurance', 'taxes', 'other',
];

const PERMISSIONS = {
  [ROLES.VIEWER]: [
    'record:read',
    'dashboard:read',
    'profile:read',
    'profile:update',
  ],
  [ROLES.ANALYST]: [
    'record:read',
    'dashboard:read',
    'dashboard:analytics',
    'profile:read',
    'profile:update',
  ],
  [ROLES.ADMIN]: [
    'record:create', 'record:read', 'record:update', 'record:delete',
    'dashboard:read', 'dashboard:analytics',
    'user:create', 'user:read', 'user:update', 'user:delete', 'user:manage-roles',
    'profile:read', 'profile:update',
  ],
};

module.exports = { ROLES, ROLE_HIERARCHY, USER_STATUS, RECORD_TYPES, CATEGORIES, PERMISSIONS };