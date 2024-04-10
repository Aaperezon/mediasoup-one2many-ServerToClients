
import { useState, useRef, useEffect} from 'react';
import CameraCSS from './Camera.module.css';
let ip_address = new URL(window.location.origin);
export const IP_SERVER_STRING = ip_address.toString().replace(/^https?:\/\//, '').replace(ip_address.port.toString(), '').replace(':/','').replace('/','');
const io = require('socket.io-client');
const mediasoupClient = require('mediasoup-client')


export function CameraWebRTC(){
    const [stream, setStream] = useState(<></>);
    const remote_video = useRef(null);
    const [variables, setVariables] = useState({
      socket : io(`http://${IP_SERVER_STRING}:5010/mediasoup`),
      device: null,
      rtpCapabilities : null,
      consumerTransport : null,
      consumer : null,
    }) 
    
    const delete_interval = useRef(null);
  
    variables.socket.on("connect", ()=>{
      console.log("Web socket connected");
    })
  
  
    const goConnect = () => {
      variables.device === null ? getRtpCapabilities() : createRecvTransport()
    }
    const createDevice = async () => {
      try {
        variables.device = new mediasoupClient.Device()
        await variables.device.load({
          routerRtpCapabilities: variables.rtpCapabilities
        })
        console.log('Device RTP Capabilities', variables.device.rtpCapabilities)
        createRecvTransport()
  
      } catch (error) {
        console.log(error)
        if (error.name === 'UnsupportedError')
          console.warn('browser not supported')
      }
    }
  
    const getRtpCapabilities = () => {
      variables.socket.emit('createRoom', (data) => {
        console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`)
        variables.rtpCapabilities = data.rtpCapabilities
        createDevice()
      })
    }
    const createRecvTransport = async () => {
      await variables.socket.emit('createWebRtcTransport', { sender: false }, ({ params }) => {
        if (params.error) {
          console.log(params.error)
          return
        }
  
        console.log(`CALLBACK FROM CLIENT ${params}`)
        console.log(params)
  
        variables.consumerTransport = variables.device.createRecvTransport(params)
        variables.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            await variables.socket.emit('transport-recv-connect', {
              dtlsParameters,
            })
            callback()
          } catch (error) {
            errback(error)
          }
        })
  
        connectRecvTransport()
      })
    }
  
    const connectRecvTransport = async () => {
      console.log("WILL EMIT CONSUME to the server")
      await variables.socket.emit('consume', {
        rtpCapabilities: variables.device.rtpCapabilities,
      }, async ({ params }) => {
        if (params.error) {
          console.log(`Cannot Consume:`);
          console.log(params.error)
          return
        }
  
        console.log(params)
        variables.consumer = await variables.consumerTransport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters
        })
       
  
        console.log("consumer data:")
        console.log(variables.consumer)
        const { track } = variables.consumer
        console.log(track)
        remote_video.current.srcObject = new MediaStream([track])
  
        variables.socket.emit('consumer-resume')
      })
    }
  
  
  
   
  
  
    const putStream = () =>{
      goConnect();
      setStream(
        <video ref={remote_video} autoPlay className={CameraCSS.image} width={"100%"}></video>
      ); 
    }
    
    // useEffect(()=>{
    //   if(remote_video == undefined) return;
    //   delete_interval.current = setInterval(()=>{
    //     console.log(remote_video.width, remote_video.height);
  
    //   },1000/2)
    // })
  
    useEffect(()=>{
      if(variables.device != null) return;
      console.log(`USING IP: ${IP_SERVER_STRING}`)
      console.log('Put stream')
      putStream();
    }, [])
    
    return(
        <div className={CameraCSS.container} >
            <div style={{width:"100%", height:"100%"}}>
              {stream}
            </div>
        </div>
    )
  }
  