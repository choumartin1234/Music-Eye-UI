require('dotenv/config');

const { getObjectUrl, uploadBuffer } = require('../utils/cos');
const fs = require('fs');
const { getFirstWaitingTask, getTaskById } = require('../utils/task');
const { loadPlaylist, savePlaylist } = require('../utils/api');

const AI_TOKEN = process.env.AI_TOKEN;

if (!AI_TOKEN) {
  throw new Error('AI_TOKEN must be defined');
}

function getAIStatus(io) {
  const ai = io.of('/ai');
  return Object.keys(ai.sockets).map((id) => {
    const socket = ai.sockets[id];

    return {
      id,
      name: socket.name,
      runningTask: socket.runningTask,
      connectedAt: new Date(socket.handshake.time),
    };
  });
}

function getAvailableAIs(io, taskId) {
  const ai = io.of('/ai');
  const exact = Object.keys(ai.sockets).filter((id) => {
    const socket = ai.sockets[id];
    return socket.runningTask && socket.runningTask.id === taskId;
  });

  if (exact.length) return exact;

  return Object.keys(ai.sockets).filter((id) => {
    const socket = ai.sockets[id];
    return (
      !socket.runningTask ||
      Date.now() - socket.runningTask.startedAt > 5 * 60 * 1000
    );
  });
}

async function dispatchTask(io, task) {
  const ai = io.of('/ai');
  const sockets = getAvailableAIs(io, task.id).map((id) => ai.sockets[id]);
  const data = { id: task.id };
  data.audio_url = (await getObjectUrl(task.objectName)).Url;
  if (!task.multipart) {
    data.has_next = false;
  } else {
    data.has_next = task.hasNext;
  }
  for (const socket of sockets) {
    const { id } = task;
    socket.runningTask = { id };
    const ok = await new Promise((resolve, reject) => {
      let timeoutId;
      socket.emit('task', data, (accepted) => {
        if (accepted) {
          socket.runningTask.startedAt = new Date();
        } else {
          delete socket.runningTask;
        }
        clearTimeout(timeoutId);
        resolve(accepted);
      });
      timeoutId = setTimeout(() => {
        delete socket.runningTask;
        console.log('Unexpected case');
        resolve(false);
      }, 3000);
    });
    if (ok) return socket;
  }
  return null;
}

function createSocketIOServer(httpServer) {
  const io = require('socket.io')(httpServer);

  const user = io.of('/user');
  user.on('connection', (client) => {
    console.log(`New Connection: ${client.id}`);
    console.log(Object.keys(user.sockets));

    const req = client.request;
    require('cookie-session')({
      secret: process.env.SESSION_SECRET,
      httpOnly: true,
    })(req, {}, () => {});

    const sessionId = req.session.id;
    console.log(sessionId);

    const worker = getAvailableAIs(io)[0];
    if (!sessionId || !worker || worker.runningTask) {
      client.emit('next');
      setTimeout(() => client.disconnect(), 100);
      return;
    }
    const token = require('uuid').v4();

    worker.runningTask = {
      id: token,
      owner: sessionId,
      multipart: true,
    };

    client.taskId = token;
    client.emit('next', token);
  });

  const ai = io.of('/ai');
  ai.on('connection', (client) => {
    const req = client.request;
    if (req.headers['authorization'] !== AI_TOKEN) {
      client.disconnect();
    }
    const name = req.headers['x-ai-name'];
    if (name) client.name = name;
    console.log(`New AI: ${client.id}`);

    client.on('result', (data) => {
      if (!data || !data.id) return;
      const { id, error, notes, has_next } = data;
      try {
        const task = getTaskById(id);
        const update = (fn) => {
          const playlist = loadPlaylist(task.owner);
          const item = playlist.find((item) => item.id === task.id);
          if (item) fn(item);
          savePlaylist(task.owner, playlist);
        };
        if (error) {
          delete client.runningTask;
          update((item) => {
            delete item.waiting;
            item.error = error;
          });
        } else {
          if (!notes) return;
          uploadBuffer(
            `result/${task.id}.json`,
            Buffer.from(JSON.stringify(notes)),
          ).then(() => {
            if (!has_next) {
              delete client.runningTask;
              update((item) => {
                delete item.error;
                delete item.waiting;
              });
            }
            const userSockets = user.sockets;
            const userSocketId = Object.keys(userSockets).find(
              (key) => userSockets[key].taskId === data.id,
            );
            const userSocket = userSocketId ? userSockets[userSocketId] : null;
            if (userSocket) {
              getObjectUrl(`result/${data.id}.json`).then(({ Url }) => {
                userSocket.emit('update', Url);
                if (!has_next) setTimeout(() => userSocket.disconnect(), 100);
              });
            }
          });
        }
      } catch (err) {
        console.error(err);
      }
    });
  });

  const loop = (asyncFn, delay) => {
    let id;
    const next = () => {
      id = setTimeout(() => {
        asyncFn().then(() => next());
      }, delay);
    };

    next();
  };

  loop(async () => {
    /* eslint-disable no-constant-condition */
    try {
      while (true) {
        const task = await getFirstWaitingTask();
        if (!task) break;
        const socket = await dispatchTask(io, task);
        if (!socket) break;
        console.log(`Process queued task ${task.id}`);
        fs.renameSync(
          `data/waiting_task/${task.id}.json`,
          `data/task/${task.id}.json`,
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, 2000);
  return io;
}

module.exports = {
  createSocketIOServer,
  getAIStatus,
  getAvailableAIs,
  dispatchTask,
};
