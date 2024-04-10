
module.exports ={



    plainTransportOptions :
    {
        listenInfo :
        {
            protocol         : 'udp',
            ip               : process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
            announcedAddress : process.env.MEDIASOUP_ANNOUNCED_IP,
            portRange        :
            {
                min : process.env.MEDIASOUP_MIN_PORT || 40000,
                max : process.env.MEDIASOUP_MAX_PORT || 49999,
            }
        },
        maxSctpMessageSize : 262144
    }

}
