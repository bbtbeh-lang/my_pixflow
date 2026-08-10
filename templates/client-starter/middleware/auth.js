export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// role hierarchy: admin can do everything an editor can
const CAN = {
  admin:  ['view', 'edit', 'delete', 'manage_users', 'del_msgs'],
  editor: ['view', 'edit']
};

export function requireRole(permission) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role || !CAN[role]?.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
