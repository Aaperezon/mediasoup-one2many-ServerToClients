









let express = require('express')
var cors = require('cors')
let bodyParser = require('body-parser')
let app = express()
app.use(bodyParser.json())
app.use(express.json({limit: '50mb'}))
app.use(cors())
app.use(cors({
    origin: '*'
}));
// var Turn = require('node-turn');
// var server = new Turn({
//   // set options
//   authMech: 'none',
//   listeningIps: ['0.0.0.0'],
//   minPort: 2000,
//   maxPort: 2020,
// });
// server.start();


const SERVERIP = require('./addresses.js').SERVERIP();
const STREAMPORT = require('./addresses.js').STREAMPORT();


const https = require('httpolyglot');
const path = require('path')
const Server = require('socket.io').Server
const mediasoup = require('mediasoup');

app.use('/sfu', express.static(path.join(__dirname, 'public')))

// SSL cert for HTTPS access
const options = {
//   key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
//   cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8')
}

const httpsServer = https.createServer(options, app)
httpsServer.listen(STREAMPORT, () => {
  console.log('listening on port: ' + STREAMPORT)
})

const io = new Server(httpsServer, {
    cors: {
      origin: "*"
    }
});


// socket.io namespace (could represent a room?)
const peers = io.of('/mediasoup')

let worker
let router
let producerTransport
let consumerTransport
let producer
let consumer

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2020,
  })
  console.log(`worker pid ${worker.pid}`)

  worker.on('died', error => {
    // This implies something serious happened, so kill the application
    console.error('mediasoup worker has died')
    setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
  })
  const webRtcServer = await worker.createWebRtcServer(
    {
      listenInfos:[
        {
          protocol    : 'udp',
          ip          : '0.0.0.0',
          // announcedAddress : '0.0.0.0',
          port        : '44444'
        },
        {
          protocol    : 'tcp',
          ip          : '0.0.0.0',
          // announcedAddress : '0.0.0.0',
          port        : '44444'
        },
      ]
    }
  )
  console.log("webRtcServer")
  console.log(webRtcServer)
  worker.appData.webRtcServer = webRtcServer;

  return worker
}


const mediaCodecs = [
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
]







const createRoom = async (callback) => {
  if (router === undefined) {
    router = await worker.createRouter({ mediaCodecs, })
    console.log(`Router ID: ${router.id}`)
    console.log("Room created")
  }

  getRtpCapabilities(callback)
}
const getRtpCapabilities = (callback) => {
  const rtpCapabilities = router.rtpCapabilities
  callback({ rtpCapabilities })
}

const transportConnect = async ({ dtlsParameters }) => {
  await producerTransport.connect({ dtlsParameters })
}

const transportProduce = async ({ kind, rtpParameters }, callback) => {
  // call produce based on the prameters from the client
 
  producer = await producerTransport.produce({
    kind,
    rtpParameters,
  })
  // console.log("producer")
  // console.log(JSON.stringify(producer))

  console.log('Producer ID: ', producer.id, producer.kind)

  producer.on('transportclose', () => {
    console.log('transport for this producer closed ')
    producer.close()
  })

  // Send back to the client the Producer's id
  callback({
    id: producer.id
  })
}

const refreshImage = (callback) => {
  callback("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==");
}

const createWebRtcTransport = async ({ sender }, callback) => {
  console.log(`Is this a sender request? ${sender}`)
  if (sender){
    producerTransport = await createWebRtcTransportFunction(callback);
    return producerTransport; 
  }
  else{
    consumerTransport = await createWebRtcTransportFunction(callback);
  }
}
peers.on('connection', async socket => {
  for(let i=0; i<15; i++){
    console.log(socket.id)
  }
    
  socket.emit('connection-success', {
    socketId: socket.id,
    existsProducer: producer ? true : false,
  })

  socket.on('disconnect', () => {
    // do some cleanup
    console.log('peer disconnected')
  })


  socket.on('refreshImage', refreshImage)

  socket.on('generate_artificial', (callback)=>{
    createProducer();
    callback("Producer created");
  })


  socket.on('createRoom', createRoom)
  // Client emits a request to create server side Transport
  // We need to differentiate between the producer and consumer transports
  socket.on('createWebRtcTransport', createWebRtcTransport)
  // see client's socket.emit('transport-connect', ...)
  socket.on('transport-connect', transportConnect)
  // see client's socket.emit('transport-produce', ...)
  socket.on('transport-produce', transportProduce)



  // see client's socket.emit('transport-recv-connect', ...)
  socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
    await consumerTransport.connect({ dtlsParameters })
  })
  socket.on('consume', async ({ rtpCapabilities }, callback) => {
    // console.log(router.canConsume({producerId: producer.id, rtpCapabilities}));
    try {
      if (router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        // transport can now consume and return a consumer
        consumer = await consumerTransport.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: true,
        })
        consumer.on('transportclose', () => {
          console.log('transport close from consumer')
        })
        consumer.on('producerclose', () => {
          console.log('producer of consumer closed')
        })
        const params = {
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        }
        console.log("THIS IS WHAT THE CLIENT RECEIVES:")
        console.log(params)
        // send the parameters to the client
        callback({ params })
      }else{
        console.log("CANNOT CONSUMEEE!!!")
      }
    } catch (error) {
      console.log(error.message)
      callback({
        params: {
          error: error
        }
      })
    }
  })
  socket.on('consumer-resume', async () => {
    console.log('consumer resume')
    await consumer.resume()
  })
})



const createWebRtcTransportFunction = async (callback) => {
  try {
    // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
    const webRtcTransport_options = {
      listenIps: [
        {
          ip: SERVERIP, // replace with relevant IP address
          // announcedIp: '127.0.0.1',
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      enableSctp: true,
    }
    // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
    let transport = await router.createWebRtcTransport(webRtcTransport_options)
    console.log(`transport id: ${transport.id}`)
    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        transport.close()
      }
    })
    transport.on('close', () => {
      console.log('transport closed')
    })
    // send back to the client the following prameters
    callback({
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      }
    })
    return transport
  } catch (error) {
    console.log(error)
    callback({
      params: {
        error: error
      }
    })
  }
}
const create_worker = new Promise((resolve)=>{
  // We create a Worker as soon as our application starts
  resolve(createWorker());
})
create_worker.then(async(the_worker)=>{
  worker = the_worker;
  await createProducer();
})





































const config = require('./config');
let ffmpeg_transport;

app.post('/broadcasters/transports', async(req, res, next) => {

  await createRoom(({rtpCapabilities})=>{
    console.log("rtpCapabilities")
    console.log(rtpCapabilities)
    producerRtpCapabilities = rtpCapabilities
  });

  const {
    comedia,
    rtcpMux,
  } = req.body;

  const plainTransportOptions =
  {
    ...config.plainTransportOptions,
    rtcpMux : rtcpMux,
    comedia : comedia
  };

  ffmpeg_transport = await router.createPlainTransport(plainTransportOptions);
  console.log("FFMPEG transport created");
  data = {
    id       : ffmpeg_transport.id,
    ip       : ffmpeg_transport.tuple.localIp,
    port     : ffmpeg_transport.tuple.localPort,
    rtcpPort : ffmpeg_transport.rtcpTuple ? ffmpeg_transport.rtcpTuple.localPort : undefined
  }
  console.log(JSON.stringify(data))
  res.status(200).json(data);
})

app.post('/broadcasters/transports/produce', async(req, res, next) => {
  const {
    kind,
    rtpParameters
  } = req.body;

  producer = await ffmpeg_transport.produce({ kind, rtpParameters })
  data = { id: producer.id };
  console.log(JSON.stringify(data))
  res.status(200).json(data);
})































const {  RTCVideoSource, rgbaToI420 } = require('wrtc').nonstandard;
const { createCanvas } = require('canvas');


const source = new RTCVideoSource();
const track = source.createTrack();

const width = 640;
const height = 480;

const randomInteger = function (pow) {	return Math.floor(Math.random() * pow);};


const artificialImage = async () => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = 'white';
  context.fillRect(0, 0, width, height);

  setInterval(()=>{
    // console.log(track)
    context.fillStyle = 'rgba(255, 255, 255, 0.025)';
    context.fillRect(0, 0, width, height);

    context.font = '120px Sans-serif';
    context.strokeStyle = 'black';
    context.lineWidth = 4;
    context.fillStyle = `rgba(${randomInteger(255)}, ${randomInteger(255)}, ${randomInteger(255)}, 1)`;
    context.textAlign = 'center';
    context.save();
    context.translate(width / 2, height / 2);
    context.strokeText('node-webrtc', 0, 0);
    context.fillText('node-webrtc', 0, 0);
    context.restore();

    const rgbaFrame = context.getImageData(0, 0, width, height);
    const i420Frame = {
      width,
      height,
      data: new Uint8ClampedArray(1.5 * width * height)
    };

    rgbaToI420(rgbaFrame, i420Frame);
  
    source.onFrame(i420Frame);
  });
}

let producerRtpCapabilities;
let params = {};
async function  createProducer(){

  await artificialImage();
  await new Promise(r => setTimeout(r, 500));


  // let producerTransport;
  await createRoom(({rtpCapabilities})=>{
    console.log("rtpCapabilities")
    console.log(rtpCapabilities)
    producerRtpCapabilities = rtpCapabilities
  });
  // ===========================================================================================================
  const plainTransportOptions =
  {
    ...config.plainTransportOptions,
    rtcpMux : false,
    comedia : true
  };
  let artificial_transport = await router.createPlainTransport(plainTransportOptions);
  console.log("Artificial transport created");
	let kind = "video";
	let rtpParameters = { 
    codecs: [ 
      { mimeType:"video/vp8", payloadType:101, clockRate:90000 },
    ], 
    encodings: [
      { ssrc:2222 },
    ] 
  } 
  // ===========================================================================================================
  producer = await artificial_transport.produce(
    { 
      kind, 
      rtpParameters, 
      track, 
    }
  )
  console.log(`Producer id: ${producer.id}`)

}











