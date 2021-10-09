const http = require('http');
const { readFileSync }  = require('fs');
const { MiddleWare } = require('./middleWare')

let middleware =  new MiddleWare() ;
let home = readFileSync( '../templates/HTML/home.html' );

const server = http.createServer( ( req , res )=> {
    let url = req.url ;
    console.log( url ) ;

    if( url == '/favicon.ico' ){ return ; }

    middleware.session( req , res );
    console.log( req.headers.cookie ,  req.session );

    res.writeHead( 200 , { 'Content-Type'  : 'text/html'  } )

    res.end( home );
 
}).listen( 8000 , ()=> console.log('listening 8000....') )