const fs = require('fs');

const { spawn } = require('child_process');

module.exports = {
  getFirstWaitingTask() {
    return new Promise((resolve, reject) => {
      const cmd = spawn('ls', ['-tr', 'data/waiting_task']);
      let data = '';
      cmd.stdout.on('data', (chunk) => (data += chunk));
      cmd.stdout.on('end', () => {
        const name = data.toString().split('\n')[0];
        resolve(
          name
            ? JSON.parse(
                fs.readFileSync(`data/waiting_task/${name}`).toString(),
              )
            : null,
        );
      });
    });
  },
  getTaskById(id) {
    return JSON.parse(fs.readFileSync(`data/task/${id}.json`).toString());
  },
  isWaitingTask(id) {
    return fs.existsSync(`data/waiting_task/${id}.json`);
  },
};
