
//index.js
const mediasoupClient = require('mediasoup-client')
const socket = io("/mediasoup")

window.addEventListener("load", (event) => {

  socket.on('connection-success', ({ socketId, existsProducer }) => {
    console.log(socketId, existsProducer)
  })

  let device
  let rtpCapabilities
  let producerTransport
  let consumerTransport
  let producer
  let consumer
  let isProducer = false

  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
  let params = {
    // mediasoup params
    encodings: [
      {
        rid: 'r0',
        maxBitrate: 100000,
        scalabilityMode: 'S1T3',
      },
      {
        rid: 'r1',
        maxBitrate: 300000,
        scalabilityMode: 'S1T3',
      },
      {
        rid: 'r2',
        maxBitrate: 900000,
        scalabilityMode: 'S1T3',
      },
    ],
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
    codecOptions: {
      videoGoogleStartBitrate: 1000
    }
  }
  const video = document.getElementById('video');


  let base_image = new Image();
  const canvasElt = document.getElementById("localCanvas");
  const width_multiplier = 1.6;
  const height_multiplier = 1.6;
  let media_stream = new MediaStream();



  console.log("media_stream")
  console.log(media_stream)
  const streamSuccess = async (stream) => {
    const context = canvasElt.getContext('2d');
    
    base_image.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
    base_image.onload = function(){
      canvasElt.width = base_image.width*width_multiplier;
      canvasElt.height = base_image.height*height_multiplier;
      context.drawImage(base_image, 0, 0,base_image.width*width_multiplier, base_image.height*height_multiplier);
    }
    const stream_canvas = canvasElt.captureStream(); 
    const track = stream_canvas.getTracks()[0]
    params = {
      track,
      ...params
    }

    getRtpCapabilities();

  }
  const refreshImage = async () => {
    socket.emit('refreshImage', (new_image) => {
      const context = canvasElt.getContext('2d');
      base_image.src = new_image;
    
    })
  }




  
  


  const getRtpCapabilities = () => {
    // make a request to the server for Router RTP Capabilities
    // see server's socket.on('getRtpCapabilities', ...)
    // the server sends back data object which contains rtpCapabilities
    socket.emit('createRoom', (data) => {
      console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`)

      // we assign to local variable and will be used when
      // loading the client Device (see createDevice above)
      rtpCapabilities = data.rtpCapabilities
      console.log( rtpCapabilities.headerExtensions );


      // once we have rtpCapabilities from the Router, create Device
      createDevice()
    })
  }
  // A device is an endpoint connecting to a Router on the 
  // server side to send/recive media
  const createDevice = async () => {
    try {
      device = new mediasoupClient.Device()

      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
      // Loads the device with RTP capabilities of the Router (server side)
      await device.load({
        // see  getRtpCapabilities()  below
        routerRtpCapabilities: rtpCapabilities
      });

      console.log('Device RTP Capabilities', device.rtpCapabilities)

      // once the device loads, create transport
      createSendTransport()

    } catch (error) {
      console.log(error)
      if (error.name === 'UnsupportedError')
        console.warn('browser not supported')
    }
  }
 
  const createSendTransport = () => {
    // see server's socket.on('createWebRtcTransport', sender?, ...)
    // this is a call from Producer, so sender = true
    socket.emit('createWebRtcTransport', { sender: true }, ({ params }) => {
      // The server sends back params needed 
      // to create Send Transport on the client side
      if (params.error) {
        console.log(params.error)
        return
      }

      // console.log(params)

      // creates a new WebRTC Transport to send media
      // based on the server's producer transport params
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      producerTransport = device.createSendTransport(params)
      console.log("PARAMETERS TO SEND TRANSPORT")
      console.log(producerTransport);

      // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
      // this event is raised when a first call to transport.produce() is made
      // see connectSendTransport() below
      producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          // Signal local DTLS parameters to the server side transport
          // see server's socket.on('transport-connect', ...)
          await socket.emit('transport-connect', {
            dtlsParameters,
          })

          // Tell the transport that parameters were transmitted.
          callback()

        } catch (error) {
          errback(error)
        }
      })

      producerTransport.on('produce', async (parameters, callback, errback) => {
        console.log("PARAMETERS TO PRODUCE")
        console.log(parameters)

        try {
          // tell the server to create a Producer
          // with the following parameters and produce
          // and expect back a server side producer id
          // see server's socket.on('transport-produce', ...)
          await socket.emit('transport-produce', {
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
          }, ({ id }) => {
            // Tell the transport that parameters were transmitted and provide it with the
            // server side producer's id.
            callback({ id })
          })
        } catch (error) {
          errback(error)
        }
      })

      connectSendTransport()
    })
  }

  const connectSendTransport = async () => {
    // we now call produce() to instruct the producer transport
    // to send media to the Router
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
    // this action will trigger the 'connect' and 'produce' events above
    producer = await producerTransport.produce(params)
    console.log("producer")
    console.log(producer)

    producer.on('trackended', () => {
      console.log('track ended')

      // close video track
    })

    producer.on('transportclose', () => {
      console.log('transport ended')

      // close video track
    })
  }





  const startStream = ()=>{
    streamSuccess();
    
    setInterval( refreshImage, 1000/60 );
  }
  startStream();
  const button = document.getElementById("button");
  button.addEventListener('click', ()=>{
    socket.emit('generate_artificial', (message) => {
      console.log(message)
    })
  })

  // btnLocalVideo.addEventListener('click', startStream)
  // btnRecvSendTransport.addEventListener('click', goConsume)

});


































