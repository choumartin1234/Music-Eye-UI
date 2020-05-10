import { api, loadPlaylist } from '../../utils/api';

export default api('GET', (req, res) => {
  res.json(
    loadPlaylist('public')
      .map((item) => {
        item.public = true;
        return item;
      })
      .concat(loadPlaylist(req.session.id).reverse()),
  );
});
