FROM node:22-alpine

LABEL org.opencontainers.image.source=https://github.com/webis-de/GenIRSim
EXPOSE 8000

RUN mkdir /app
WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install
COPY bin/ /app/bin/
COPY src/ /app/src/
COPY static/ /app/static/

ENTRYPOINT [ "npm", "exec", "genirsim-server" ]
