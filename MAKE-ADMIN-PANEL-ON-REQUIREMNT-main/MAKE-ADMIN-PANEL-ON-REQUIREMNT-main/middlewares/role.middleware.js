// role-based access control middleware (Admin, Guest, Child)
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user session found' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // check if current user role is allowed
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied: Role '${req.user.role}' is not authorized for this action`
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
