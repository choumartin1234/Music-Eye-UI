import { api } from '../../../utils/api';
import { getAIStatus } from '../../../server/io';

export default api('GET', (req, res) => {
  res.json(getAIStatus(req.io));
});
