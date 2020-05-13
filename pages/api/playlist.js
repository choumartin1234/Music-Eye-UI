import { api, loadPlaylist } from '../../utils/api';
import { isWaitingTask } from '../../utils/task';
import { getObjectUrl } from '../../utils/cos';

export default api('GET', async (req, res) => {
  res.json(
    await Promise.all(
      loadPlaylist('public')
        .map((item) => {
          item.public = true;
          return item;
        })
        .concat(
          loadPlaylist(req.session.id)
            .reverse()
            .map((item) => {
              if (item.waiting && !isWaitingTask(item.id)) {
                delete item.waiting;
                item.running = true;
              }
              if (item.waiting && !isWaitingTask(item.id)) {
                delete item.waiting;
                item.running = true;
              }
              return item;
            }),
        )
        .map(async (item) => {
          if (!item.waiting && !item.running && !item.error) {
            const objectName =
              (item.public ? 'public' : 'result') + `/${item.id}.json`;
            item.url = (await getObjectUrl(objectName)).Url;
          }
          return item;
        }),
    ),
  );
});
