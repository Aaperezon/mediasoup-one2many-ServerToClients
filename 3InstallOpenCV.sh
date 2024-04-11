
apt-get update

apt-get -y install curl
apt-get -y install wget
apt-get -y install unzip
DEBIAN_FRONTEND=noninteractive apt-get -y install build-essential cmake pkg-config unzip yasm git checkinstall

# Video/Audio Libs - FFMPEG, GSTREAMER, x264 ans so on
apt -y install libavcodec-dev libavformat-dev libswscale-dev libavresample-dev
apt -y install libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev
apt -y install libxvidcore-dev x264 libx264-dev libfaac-dev libmp3lame-dev libtheora-dev 
apt -y install libfaac-dev libmp3lame-dev libvorbis-dev


apt-get -y install gstreamer1.0*
apt-get -y install ubuntu-restricted-extras
apt-get -y install libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev

# apt-get -y install ffmpeg
# apt-get -y install libatlas-base-dev gfortran
# apt-get -y install libgtk-3-dev

#Downgrade gcc
sudo apt remove gcc
sudo apt-get install gcc-7 g++-7 -y
sudo ln -s /usr/bin/gcc-7 /usr/bin/gcc
sudo ln -s /usr/bin/g++-7 /usr/bin/g++
sudo ln -s /usr/bin/gcc-7 /usr/bin/cc
sudo ln -s /usr/bin/g++-7 /usr/bin/c++

#INSTALL GSTREAMER
apt-get install -y libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav gstreamer1.0-tools gstreamer1.0-x gstreamer1.0-alsa gstreamer1.0-gl gstreamer1.0-gtk3 gstreamer1.0-qt5 gstreamer1.0-pulseaudio

#OPENCV BUILD
cd ~
rm -r opencv.zip opencv_contrib.zip opencv-4.5.2 opencv_contrib-4.5.2 
wget -O opencv.zip https://github.com/opencv/opencv/archive/refs/tags/4.5.2.zip
wget -O opencv_contrib.zip https://github.com/opencv/opencv_contrib/archive/refs/tags/4.5.2.zip
unzip opencv.zip
unzip opencv_contrib.zip
cd opencv-4.5.2
rm -r build
mkdir build
cd build

cmake -D CMAKE_BUILD_TYPE=RELEASE \
-D CMAKE_INSTALL_PREFIX=/usr/local \
-D WITH_TBB=ON \
-D ENABLE_FAST_MATH=1 \
-D WITH_CUBLAS=1 \
-D PYTHON_EXECUTABLE=$(which python3) \
-D BUILD_opencv_python2=OFF \
-D PYTHON3_EXECUTABLE=$(which python3) \
-D PYTHON3_INCLUDE_DIR=$(python3 -c "from distutils.sysconfig import get_python_inc; print(get_python_inc())") \
-D PYTHON3_PACKAGES_PATH=$(python3 -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())") \
-D WITH_CUDNN=ON \
-D WITH_V4L=ON \
-D WITH_QT=OFF \
-D WITH_OPENGL=ON \
-D WITH_GSTREAMER=ON \
-D OPENCV_GENERATE_PKGCONFIG=ON \
-D OPENCV_PC_FILE_NAME=opencv.pc \
-D OPENCV_ENABLE_NONFREE=ON \
-D OPENCV_EXTRA_MODULES_PATH=~/opencv_contrib-4.5.2/modules \
-D INSTALL_C_EXAMPLES=OFF \
-D BUILD_EXAMPLES=OFF .. \
-D ENABLE_CXX11=1

make -j8
make install

/bin/bash -c 'echo "/usr/local/lib" >> /etc/ld.so.conf.d/opencv.conf'
ldconfig
