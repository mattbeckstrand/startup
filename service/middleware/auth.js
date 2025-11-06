const { supabase } = require('../supabaseClient');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: 'No authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    return res.status(401).send({ msg: 'Invalid token' });
  }
  
  req.user = data.user;
  next();
}

module.exports = { requireAuth };