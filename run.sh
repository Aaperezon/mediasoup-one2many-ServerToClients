xhost +
docker run --privileged --network host \
-e DISPLAY=$DISPLAY \
-it --rm --name webrtc \
-v $PWD:/~ \
-w /~ webrtc:1.0 