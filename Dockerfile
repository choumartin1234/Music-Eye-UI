FROM node:lts-alpine

WORKDIR /app

COPY package.json .
RUN yarn config set registry https://registry.npm.taobao.org
RUN yarn install
COPY . .
RUN yarn build && yarn --production

ENV NODE_ENV production
CMD ["node", "server.js"]
