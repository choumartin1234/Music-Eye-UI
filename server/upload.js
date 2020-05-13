const uuid = require('uuid');
const { upload, getObjectUrl } = require('../utils/cos');
const { loadPlaylist, savePlaylist } = require('../utils/api');

const fs = require('fs');
const { dispatchTask } = require('./io');

async function addTask(io, task) {
  const socket = await dispatchTask(io, task);
  let dir = 'task';
  if (!socket && !task.multipart) {
    console.log('Add task to Queue');
    dir = 'waiting_task';
  }
  fs.writeFileSync(
    `data/${dir}/${task.id}.json`,
    Buffer.from(JSON.stringify(task)),
  );
}

const getExt = (name) => {
  const p = name.lastIndexOf('.');
  return name.substring(p + 1);
};

const getBase = (name) => {
  const p = name.lastIndexOf('.');
  return name.substring(0, p);
};

module.exports = async (req, res) => {
  if (!req.files || !req.files.file) return res.send('Failed');
  const file = req.files.file;
  const { name, size, tempFilePath } = file;
  const { multipart, last } = req.query;
  const ext = getExt(name);
  if (!['mp3', 'wav', 'webm'].includes(ext) || size > 10 * 1024 * 1024) {
    return res.send('Failed');
  }
  const filePath = size < 512 ? 'public/blank-1s.mp3' : tempFilePath;
  if (multipart) {
    const id = multipart;
    const objectName = `input/${id}/${Date.now()}.${ext}`;
    await upload(objectName, filePath);
    const task = {
      id,
      owner: req.session.id,
      objectName,
      multipart: true,
      hasNext: !last,
    };
    console.log(task);
    addTask(req.io, task);
    if (last) {
      const playlist = loadPlaylist(req.session.id);
      playlist.push({
        id,
        name: `录音 ${id.slice(0, 8)}`,
        description: 'AI 根据用户实时录音生成',
        waiting: true,
        createdAt: new Date(),
      });
      savePlaylist(req.session.id, playlist);
    }
    res.send('OK');
  } else {
    const playlist = loadPlaylist(req.session.id);
    const id = uuid.v4();
    const objectName = `input/${id}.${ext}`;
    await upload(objectName, filePath);
    const task = {
      id,
      owner: req.session.id,
      objectName,
    };
    playlist.push({
      id,
      name: getBase(name),
      description: 'AI 根据用户上传音频生成',
      waiting: true,
      createdAt: new Date(),
    });
    console.log(task);
    addTask(req.io, task);
    savePlaylist(req.session.id, playlist);
    res.send('OK');
  }
};
