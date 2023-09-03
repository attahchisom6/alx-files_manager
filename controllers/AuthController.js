const AuthController = {
  async getConnect(req, res) {
    const authHeader = req.header('Authorization');
