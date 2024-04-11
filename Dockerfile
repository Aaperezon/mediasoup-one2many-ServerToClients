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

ENV SERVER_URL=192.168.50.101:5010
ENV MEDIA_FILE=/~/video.mp4

RUN apt-get install -y ffmpeg
RUN apt-get install -y httpie
RUN apt-get install -y jq

RUN apt-get -y install python3-dev python3-pip
RUN pip3 install numpy
RUN pip3 install opencv-python
RUN apt -y install python3-testresources
RUN apt-get -y install qt5-default

COPY 3InstallOpenCV.sh /root/
RUN /root/3InstallOpenCV.sh
