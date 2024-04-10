docker run --privileged --network host \
-it --rm --name webrtc \
-v $PWD:/~ \
-w /~ webrtc:1.0 