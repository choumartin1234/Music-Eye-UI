import RecordRTC from 'recordrtc';

export class Recorder {
  constructor() {
    this.started = false;
  }

  async start(callback) {
    if (this.started) return;
    this.started = true;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!this.stream) {
      this.started = false;
      return false;
    }
    this.recorder = RecordRTC(this.stream, {
      disableLogs: true,
      type: 'audio',
      mimeType: 'audio/webm',
    });
    this.callback = callback;
    this.recorder.startRecording();
    this.intervalId = setInterval(() => {
      this.recorder.stopRecording(() => {
        const blob = this.recorder.getBlob();
        this.recorder.reset();
        this.recorder.startRecording();
        this.callback(blob, false);
      });
    }, 1000);
    return true;
  }

  async stop() {
    if (!this.started) return;
    this.started = false;
    clearInterval(this.intervalId);
    this.recorder.stopRecording(() => {
      const blob = this.recorder.getBlob();
      this.callback(blob, true);
      this.stream.getTracks().forEach((track) => track.stop());
      delete this.stream;
      delete this.recorder;
    });
  }
}
