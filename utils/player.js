import { useContext, createContext } from 'react';
import Soundfont from 'soundfont-player';

export class Player {
  constructor() {
    this.ac = new AudioContext();
    this.startTime = null;
    this.maxTime = 0;
    this.now = 0;
    this.notes = [];
    this.instrument = null;
    this.initPromise = Soundfont.instrument(this.ac, '/clavinet-mp3.js').then(
      (clavinet) => {
        this.instrument = clavinet;
      },
    );
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

  get instrumentEvents() {
    return this.notes
      .filter((item) => this.now <= item[0])
      .map((item) => ({
        time: item[0] - this.now,
        note: item[1],
        duration: item[2],
      }));
  }

  async start() {
    if (this.started) return;
    if (this.ended) {
      await this.reset();
    }
    await this.initPromise;
    this.startTime = this.ac.currentTime;
    this.instrument.schedule(this.startTime, this.instrumentEvents);
    this.instrument.start();
  }

  async waitCurrentNoteDone() {
    const currentTime = this.currentTime;
    const targetTime = this.notes.reduce((t, item) => {
      const s = item[0];
      const e = item[0] + item[2];
      if (currentTime > s && currentTime <= e) {
        t = Math.max(t, e);
      }
      return t;
    }, currentTime);
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(targetTime), (targetTime - currentTime) * 1000);
    });
  }

  async pause() {
    if (!this.started) return;
    this.now = await this.waitCurrentNoteDone();
    this.startTime = null;
    this.instrument.stop();
  }

  async updateNotes(notes) {
    const started = this.started;
    if (started) await this.pause();
    this.notes = notes;
    this.maxTime = notes.reduce((t, item) => {
      t = Math.max(t, item[0] + item[2]);
      return t;
    }, 0);
    this.maxTime = Math.floor(this.maxTime * 10) / 10;
    if (started) await this.start();
  }

  async reset() {
    await this.pause();
    this.now = 0;
  }

  async moveTo(p) {
    await this.pause();
    this.now = p;
  }
}

export const PlayerContext = createContext();

export const usePlayer = () => {
  const player = useContext(PlayerContext);
  return player;
};
