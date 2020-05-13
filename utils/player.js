import { useContext, createContext } from 'react';
import Soundfont from 'soundfont-player';
import AsyncLock from 'async-lock';

export class Player {
  constructor() {
    this.lock = new AsyncLock();
    this.ac = new (window.AudioContext || window.webkitAudioContext)();
    this.startTime = null;
    this.muted = false;
    this.maxTime = 0;
    this.now = 0;
    this.notes = [];
    this.activeNotes = [];
    this.activeRecords = [];
    this.instrument = null;
    this.initPromise = Soundfont.instrument(this.ac, '/instrument.js').then(
      (instrument) => {
        this.instrument = instrument;
      },
    );

    if (this.ac.state === 'suspended') {
      const unlock = () => {
        if (this.ac) {
          this.ac.resume();
        }
      };
      document.body.addEventListener('mousedown', unlock, false);
      document.body.addEventListener('touchstart', unlock, false);
    }
  }

  get started() {
    return this.startTime !== null;
  }

  get currentTime() {
    if (this.started) {
      return this.now + this.ac.currentTime - this.startTime;
    } else {
      return this.now;
    }
  }

  get ended() {
    return this.currentTime >= this.maxTime;
  }

  instrumentEvents(since) {
    return this.notes.filter((item) => {
      return item[0] >= since && item[0] <= since + 6;
    });
  }

  refresh() {
    return this.lock.acquire('core_op', () => {
      this.rebuildBatch();
      if (this.started) {
        const currentTime = this.currentTime;
        if (this.muted) {
          this.activeRecords = [];
        } else {
          this.activeRecords = this.activeRecords.filter((record) => {
            return record[0][0] >= currentTime;
          });
        }
        const newNotes = !this.muted ? this.instrumentEvents(currentTime) : [];
        this.activeRecords = this.activeRecords
          .filter((record) => {
            const p = newNotes.indexOf(record[0]);
            if (p < 0) {
              record[1].disconnect();
              return false;
            } else {
              newNotes[p] = null;
              return true;
            }
          })
          .concat(
            newNotes.filter(Boolean).map((item) => {
              const gain = item[3] ? item[3] / 128 : undefined;
              return [
                item,
                this.instrument.start(
                  item[1],
                  this.ac.currentTime + item[0] - currentTime,
                  {
                    duration: item[2],
                    gain,
                  },
                ),
              ];
            }),
          );
      }
    });
  }

  rebuildBatch() {
    this.activeNotes = this.notes.filter((item) => {
      return (
        (item[0] >= this.currentTime && item[0] <= this.currentTime + 12) ||
        (item[0] <= this.currentTime && this.currentTime <= item[0] + item[2])
      );
    });
  }

  async start() {
    return this.lock.acquire('core_op', async () => {
      if (this.started) return;
      if (this.ended) this.reset();
      await this.initPromise;
      this.startIntervalId = setInterval(() => {
        if (this.started) {
          this.refresh();
        }
      }, 3000 + Math.random() * 3000);
      this.startTime = this.ac.currentTime;
      this.activeRecords = [];
      this.refresh();
    });
  }

  async pause() {
    return this.lock.acquire('core_op', async () => {
      if (!this.started) return;
      this.now = this.currentTime;
      this.startTime = null;
      clearInterval(this.startIntervalId);
      /*
      this.activeRecords = this.activeRecords.filter((record) => {
        return record[0][0] >= this.now;
      });
      */
      this.activeRecords.forEach((record) => record[1].disconnect());
    });
  }

  async updateNotes(notes) {
    this.notes = notes;
    this.maxTime = notes.reduce((t, item) => {
      t = Math.max(t, item[0] + item[2]);
      return t;
    }, 0);
    this.maxTime = Math.ceil(this.maxTime * 10) / 10;
    return this.refresh();
  }

  async setMuted(val) {
    this.muted = val;
    return this.refresh();
  }

  async reset() {
    await this.moveTo(0);
  }

  async moveTo(p) {
    await this.pause();
    this.now = p;
    this.rebuildBatch();
  }
}

export const PlayerContext = createContext();

export const usePlayer = () => {
  const player = useContext(PlayerContext);
  return player;
};
