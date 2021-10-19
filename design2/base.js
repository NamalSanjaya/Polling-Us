
"use strict";

// node modules
const { readFileSync } = require('fs');
const { parse } = require('querystring');


//   ================= middleware ==================== //

function _extracCookie ( pattern , ind ){

    let [id,Auser]  = pattern.slice( ind , ind + 30 ).split('&');
    let valId  = id.split('=')[1].trim() ;
    let valUsr = Number.parseInt( Auser.split('=')[1].trim() );

    return { SessionId: valId , AuthUser: valUsr } ;
      
} ;

function _createId(){

    // length 9 id
    let ref = new Date('2021-10-01T00:00:00')  ;
    let datePart = ( Date.now() - ref ).toString() ;
    let id1 = datePart.slice(4).padEnd( 6 , datePart[0] ) ;
    let id2 =  Math.floor( Math.random() * 1e3 ).toString()
   
    return id1 + id2 ;

}

function _createCookie( session , mul ){

    let now = new Date( Date.now()  +  60000*mul );
    let time = '; Expires=' + now.toUTCString() ;
    return 'SessionId='.concat( session.SessionId , '&AuthUser=', session.AuthUser.toString() ,time , '; Path=/' );

}


function session( request , response ){

    let cke , ind , timeMul;
    cke = request.headers.cookie  || '';
    ind = cke.search(/SessionId=/) ;

    if( ind >= 0){
        // authenticated user
        request.session = _extracCookie( cke , ind );
        timeMul = 1 ;
    }

    else{
        // guset
        let SessionId = _createId() ;
        request.session = { SessionId , AuthUser: 0 }
        timeMul = 1 ;
    }

    response.setHeader( 'Set-Cookie', [ _createCookie( request.session , timeMul ) ] ) ;
    return ;
}


function attachBody( request , option = null){
    let data = '' ;

    request.on('data' , (chunk) => {
        data += chunk.toString() ;
        request.body = parse( data );
        console.log( request.body )
        return ;
    })
}


// ================== template rendering associate function ====================== //

// page rendering 
function render(  response  , path   , data , statusCode = 200 ){

    let pg = readFileSync( path );
    response.writeHead( statusCode , {'Content-Type':'text/html'} );
    response.end( pg ) ;
    return ;
}   

/// page redirect
function redirect( response , to , data  , statusCode = 302 ){
  
    response.writeHead( statusCode , {'Location' : to } );
    response.end();
    return ;
}



// ================= registering =============================  //

function register(  rHandler , db , request , response ){

    request.on( 'end' , ()=> {
        db.checkEmail( request.body.Uemail , rHandler , request , response );
        return ;
    })
    return ;

}


function login( lHander , db , request , response ){

    request.on('end' , ()=> {
        db.checkCredentials( request.body , lHander , request , response );
        return ;
    })

    return ;
    
}



// ================ addtional =============================== // 

function timeNow(){

    // time to nearest minutes
    let ref = new Date('2021-10-01T00:00:00')  // take as reference
    return Math.floor( ( Date.now() - ref.getTime() ) / 60000 ) ;
}

function changeCookie( response ,to){
    let cookie = response.getHeader('set-cookie')[0];
    response.removeHeader('Set-Cookie');

    response.setHeader( 'Set-Cookie', [ cookie.slice(0,29) + to + cookie.slice(30) ] );
    return 
}


module.exports = { session , attachBody  , register , login , render , redirect , timeNow ,
                   changeCookie }

