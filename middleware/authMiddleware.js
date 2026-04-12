const { verifyToken } = require('../utils/jwt');
const prisma = require('../prisma');

/**
 * Authentication middleware — validates JWT and attaches user to request.
 * Does NOT fall back to dev users; if DB is down, auth fails cleanly.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, malformed token' });
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, college: true, year: true, role: true, emailVerified: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Covers: invalid token, expired token, wrong issuer/audience
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
