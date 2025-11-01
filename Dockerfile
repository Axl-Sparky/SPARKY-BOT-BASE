FROM node:lts-buster

COPY package.json yarn.lock ./

RUN yarn install --ignore-engines

COPY . .

CMD ["yarn", "start"]
