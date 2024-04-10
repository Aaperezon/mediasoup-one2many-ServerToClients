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


RUN apt-get install -y ffmpeg
RUN apt-get install -y httpie
RUN apt-get install -y jq
RUN apt-get install libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav gstreamer1.0-tools gstreamer1.0-x gstreamer1.0-alsa gstreamer1.0-gl gstreamer1.0-gtk3 gstreamer1.0-qt5 gstreamer1.0-pulseaudio

