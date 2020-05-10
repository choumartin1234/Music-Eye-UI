import 'dotenv/config';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import cookieSession from 'cookie-session';

const session = cookieSession({
  secret: process.env.SESSION_SECRET,
  httpOnly: true,
});

export function api(method, handle) {
  return (req, res) => {
    session(req, res, () => {});
    if (!req.session.id) {
      req.session.id = uuid();
    }
    if (req.method !== method) {
      return res.status(405).send('Method Not Allowed');
    }
    handle(req, res);
  };
}

export function loadPlaylist(name) {
  try {
    return JSON.parse(fs.readFileSync(`data/${name}.json`).toString());
  } catch (err) {
    return [];
  }
}

export function savePlaylist(name, data) {
  try {
    fs.writeFileSync(`data/${name}.json`, Buffer.from(JSON.stringify(data)));
  } catch (err) {
    //
  }
}
