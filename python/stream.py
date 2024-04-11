import numpy as np
import cv2 as cv
import requests








print(cv.getBuildInformation())

data_connection = requests.get('http://192.168.50.101:5010/createStream')
print(data_connection)
data_connection = data_connection.json()
# data_connection["ip"] = "192.168.50.101"
print(data_connection)
mat = np.zeros((500, 400, 3), dtype=np.uint8)

gst_str_rtp = ( "appsrc"+ 
                " ! videoconvert"+ 
                " ! vp8enc target-bitrate=1000000 deadline=1 cpu-used=2"+ 
                " ! rtpvp8pay pt=101 ssrc=2222 picture-id-mode=2"+ 
                " ! udpsink host="+data_connection["ip"]+" port="+str(data_connection["port"])
            )




print(gst_str_rtp)
print(f"width: {mat.shape[0]} height: {mat.shape[1]}")
fourcc = cv.VideoWriter_fourcc(*"vp80")
out = cv.VideoWriter(gst_str_rtp, cv.CAP_GSTREAMER, fourcc, 30, (mat.shape[0], mat.shape[1])  )

if not out.isOpened():
    print("Error: Cannot create VideoWriter")
    exit()

while True:
    out.write(mat)

cv.imshow("Display Window", mat)
k = cv.waitKey(0)
cv.destroyAllWindows()











