FROM ubuntu:20.04



RUN apt update
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "/root/.nvm/nvm.sh" && nvm install 16.16.0
RUN . "/root/.nvm/nvm.sh" && nvm use v16.16.0
RUN . "/root/.nvm/nvm.sh" && nvm alias default v16.16.0
ENV PATH="/root/.nvm/versions/node/v16.16.0/bin/:${PATH}"
RUN npm i -g node-gyp

ENV TZ=America/Los_Angeles
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone




