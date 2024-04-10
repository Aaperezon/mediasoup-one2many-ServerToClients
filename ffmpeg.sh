#!/usr/bin/env bash

function show_usage()
{
	echo
	echo "USAGE"
	echo "-----"
	echo
	echo "  SERVER_URL=https://my.mediasoup-demo.org:4443 MEDIA_FILE=./test.mp4 ./ffmpeg.sh"
	echo
	echo "  where:"
	echo "  - SERVER_URL is the URL of the mediasoup-demo API server"
	echo "  - MEDIA_FILE is the path to a audio+video file (such as a .mp4 file)"
	echo
	echo "REQUIREMENTS"
	echo "------------"
	echo
	echo "  - ffmpeg: stream audio and video (https://www.ffmpeg.org)"
	echo "  - httpie: command line HTTP client (https://httpie.org)"
	echo "  - jq: command-line JSON processor (https://stedolan.github.io/jq)"
	echo
}

echo

if [ -z "${SERVER_URL}" ] ; then
	>&2 echo "ERROR: missing SERVER_URL environment variable"
	show_usage
	exit 1
fi

if [ -z "${MEDIA_FILE}" ] ; then
	>&2 echo "ERROR: missing MEDIA_FILE environment variable"
	show_usage
	exit 1
fi

if [ "$(command -v ffmpeg)" == "" ] ; then
	>&2 echo "ERROR: ffmpeg command not found, must install FFmpeg"
	show_usage
	exit 1
fi

if [ "$(command -v http)" == "" ] ; then
	>&2 echo "ERROR: http command not found, must install httpie"
	show_usage
	exit 1
fi

if [ "$(command -v jq)" == "" ] ; then
	>&2 echo "ERROR: jq command not found, must install jq"
	show_usage
	exit 1
fi

set -e

BROADCASTER_ID=$(LC_CTYPE=C tr -dc A-Za-z0-9 < /dev/urandom | fold -w ${1:-32} | head -n 1)
HTTPIE_COMMAND="http --check-status"
AUDIO_SSRC=1111
AUDIO_PT=100
VIDEO_SSRC=2222
VIDEO_PT=101


#
# Create a PlainTransport in the mediasoup to send our video using plain RTP
# over UDP. Do it via HTTP post specifying type:"plain" and comedia:true and
# rtcpMux:false.
#
echo ">>> creating mediasoup PlainTransport for producing video..."

res=$(${HTTPIE_COMMAND} \
	POST ${SERVER_URL}/broadcasters/transports \
	comedia:=true \
	rtcpMux:=false \
	2> /dev/null)

#
# Parse JSON response into Shell variables and extract the PlainTransport id,
# IP, port and RTCP port.
#
eval "$(echo ${res} | jq -r '@sh "videoTransportId=\(.id) videoTransportIp=\(.ip) videoTransportPort=\(.port) videoTransportRtcpPort=\(.rtcpPort)"')"


#
# Create a mediasoup Producer to send video by sending our RTP parameters via a
# HTTP POST.
#
echo ">>> creating mediasoup video Producer..."

${HTTPIE_COMMAND} -v \
	POST ${SERVER_URL}/broadcasters/transports/produce \
	kind="video" \
	rtpParameters:="{ \"codecs\": [{ \"mimeType\":\"video/vp8\", \"payloadType\":${VIDEO_PT}, \"clockRate\":90000 }], \"encodings\": [{ \"ssrc\":${VIDEO_SSRC} }] }" \
	> /dev/null

#
# Run ffmpeg command and make it send audio and video RTP with codec payload and
# SSRC values matching those that we have previously signaled in the Producers
# creation above. Also, tell ffmpeg to send the RTP to the mediasoup
# PlainTransports' ip and port.
#
echo ">>> running ffmpeg..."

#
# NOTES:
# - We can add ?pkt_size=1200 to each rtp:// URI to limit the max packet size
#   to 1200 bytes.
#
ffmpeg \
	-re \
	-v info \
	-stream_loop -1 \
	-i ${MEDIA_FILE} \
	-map 0:v:0 \
	-pix_fmt yuv420p -c:v libvpx -b:v 1000k -deadline realtime -cpu-used 4 \
	-f tee \
	"[select=v:f=rtp:ssrc=${VIDEO_SSRC}:payload_type=${VIDEO_PT}]rtp://${videoTransportIp}:${videoTransportPort}?rtcpport=${videoTransportRtcpPort}"