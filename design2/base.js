
"use strict";

// node modules
const { parse } = require('querystring');
const Urls = require('url') ;

// npm dependencies
const ejs = require('ejs');


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
    let id1 = datePart.slice(5).padEnd( 5 , datePart[0] ) ;
    let id2 = ( Math.random() * 1e5 ).toString().slice(0,4);
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
        timeMul = 10 ;
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
        return ;
    })
}

function link2Id( lnk ){
    if(lnk.length > 0){

        try {

            let parts = lnk.split('Z');
            let p1 =  Number.parseInt( parts[0] , 16 ) - 1e5 ;
            let p2 = Number.parseInt( parts[1] , 8 ) - 1e5 ;

            if( p1 != p2 ){
                return '' ;
            }

            return p1.toString() ;
            
        } catch (error) {
            return '' ;
        }
    }

    return ''
}

function Id2link( idNum ){
    let refNum = Number.parseInt( idNum ) ;
    return (refNum + 1e5).toString(16) + "Z" + (refNum + 1e5).toString(8);
}

function voteSeperation( request , response ){

    let _pathname = request.url ;
    let Ind = _pathname.search(/^\/vote/);
    request.headers.cookie = request.headers.cookie  || '' ; 

    if( Ind == 0 ){
    
        let UrlObj = new URL( "http://" + request.headers.host + _pathname ) ;
        let _id    =   link2Id( UrlObj.searchParams.get('id') || '' ) ;
   
        let SInd =  request.headers.cookie.search(/SessionId=/);
        request.url = UrlObj.pathname ;
        request.query = { id: _id } ;
  
        if( SInd == -1){
            request.voteId = request.headers.cookie.trim() ; ;
            request.headers.cookie = '';
        }
        else{

            request.voteId = request.headers.cookie.slice(0,SInd-2).trim() ;
            request.headers.cookie = request.headers.cookie.slice(SInd,SInd+30) ;
        }

    }

    return ;
}

// ================== template rendering associate function ====================== //

// page rendering 
function render(  response  , path   , _data='' , statusCode = 200 ){
    
    ejs.renderFile( path , _data , (err , page)=> {

        response.writeHead( statusCode , {'Content-Type':'text/html'} );
        response.end( page );

    }) ;
 
    return ;
}   

/// page redirect
function redirect( response , to , _data={}  , statusCode = 302 ){
    
    response.writeHead( statusCode , {'Location' : to } );
    response.end();
    return ;
}



// ================= registering | login | logout =============================  //

function register(  rHandler , db , request , response ){

    request.on( 'end' , ()=> {
        db.checkEmail( request.body.Uemail , rHandler , request , response );
        return ;
    })
    return ;

}


function login( lHandler , db , request , response ){

    request.on('end' , ()=> {
        db.checkCredentials( request.body , lHandler , request , response );
        return ;
    })

    return ;
    
}


function logout(lHandler , db , request , response ){

    db.removeLoggedUser( request.session.SessionId , lHandler , request , response );
    response.removeHeader('Set-Cookie');
    response.setHeader( 'Set-Cookie', [ _createCookie(  request.session , 0 ) ] ) ;
    return ;
}

function retrieveMY(prHandler , db , request , response ){

    db.retrievePoll( request.session.SessionId , prHandler , request , response ) ;
    return ;

}

// retrieve singal poll info

function pollView( prHandler , db , request , response ){

    let _id = Number.parseInt( request.query.id ) ;
    db.singlePollRetrieve( _id , prHandler , request , response );
    return ;
}


// =================== poll creation ======================= //

function fieldSep( exp ){
    if( exp.length == 1){
        return Number.parseInt( exp )
    }
    else{
        let time = new Date(exp) , refTime = new Date('2021-10-01T00:00:00');
        return Math.floor( time.getTime() - refTime.getTime() )/60000 ;  // to minuites

    }
}



function setdataCreation( data ){
    let result = {}  , ansArray = [];
    for( let key in data){

        if( key.search(/Ques/) == 0 ){

            result.QuestionNo = Number.parseInt( key.slice(5).trim() );
            result.Question   = data[ key ].trim() ;
        }

        else if( key.search(/ans/) == 0 ){

            let _ansNo = Number.parseInt( key.slice(4).trim() );
            let _ans   = data[ key ].trim();

            ansArray.push( { AnswerNo: _ansNo , Answer: _ans } );
        }

        else{
            result[ key ] = fieldSep( data[ key ]  );
        }
    }

    result.Answers = ansArray ;
    return result;
}


function create_poll( pHandler , db , request , response ){

    request.on( 'end' , ()=> {

        request.body =  setdataCreation( request.body);
        db.createPoll( request.body , pHandler , request , response );
       /// response.end('create the poll..');
    })

    return ;
}

function expiredPoll( qno , _pHandler){

    _pHandler.emit( 'done-expiredpoll' , qno );
    return ;

}

function _handOver( qno , stime, etime , LiveBg , SchBg , pHandler ){

    let tm1 = (etime-stime)*60000 ;
    delete SchBg[qno] ;
    LiveBg[qno] = setTimeout( expiredPoll ,tm1 , qno , pHandler);
    console.log(`poll handover ${ qno }`);
    return ;

}


function assignBag( sTime , eTime , nw , qno ,Lbag , Sbag, pHandler ){
    
    if(sTime <= nw ){
        // poll start now
        let timeout1 = (eTime - sTime)*60000 ;
        console.log(`poll start .... ${ qno }`);

        Lbag[ qno ] = setTimeout( expiredPoll , timeout1 , qno , pHandler );

    }

    else{
        //poll schdule for future 
        let timeout2 = (sTime - nw)*60000 ;
        console.log(`poll schdule for future ${ qno }`);

        Sbag[ qno ] = setTimeout( _handOver , timeout2 , qno , sTime , eTime , Lbag , Sbag , pHandler );
    }

    return ;
}

// ======================= vote =========================== //

function isEligible(request,response){
    let qnoId = request.query;
    let cookieId = link2Id( request.voteId );
    let hr = 60; // 1 hr life time
    if( qnoId.id.length == 0 ){
        return false ;
    }

    else if( qnoId.id == cookieId){
        return false ;
    }
    else{
        let now = new Date( Date.now()  +  60000* hr);
        let time = '; Expires=' + now.toUTCString() ;
        let sendCke = Id2link( qnoId.id );
        let cookie =  sendCke.concat( time , '; Path=/vote' )
        response.setHeader( 'Set-Cookie', [ cookie ] ) ;
        return true ;
    }
    
}


// ================== poll setting changes ========================//

function beforeExtendTime( pHandler  , request , response ){
    let dt = ''
    request.on('data' , (chunk)=> {
        dt += chunk.toString() ;
    })

    request.on('end',()=> {
        let data = JSON.parse( dt )
        pHandler.emit('done-dataExtendTime' , data ,  request , response ) ;
        return ;
    })
}



function changeTime( Incdata , now  , pHandler , Lbag    , db , cb , request , response ){

    let timer = Lbag[ Incdata.Qno ] ;
    clearTimeout( timer );
    delete Lbag[ Incdata.Qno ];

    console.log('event removed..')
    if( Incdata.exdTime <= now ){
        // stop poll now 
        pHandler.emit('done-expiredpoll' , Incdata.Qno );
    }

    else{
        // time extension
        let newTime = ( Incdata.exdTime - now )*60000 ;
        console.log('set time : ' + newTime );
        Lbag[ Incdata.Qno ] = setTimeout( cb , newTime , Incdata.Qno , pHandler );
        console.log('updated handler add again')
        db.updateEndTime( Incdata , pHandler  , request , response );
 
    }

    return ;
}


// ===================== additional =============================== // 

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

function arrangeData( arr ){

    let qno = 0 , turn = 0 , sm = 0;
    let temp = {}
    let tempAns = []
    let whole = []

    for(let tup of arr){
    
        if( tup.QuestionNo != qno){

            if( turn != 0 ) {
            
                temp.Answers = tempAns ;
                temp.Votes = sm ;
                whole.push( temp );

                temp = {} ; tempAns = [] ; sm = 0;

            } 
            qno =  tup.QuestionNo ;
            temp.QuestionNo = tup.QuestionNo ;
            temp.Question   = tup.Question ;
            temp.Email      = tup.Email ; 
            temp.startTime  = tup.startTime;
            temp.endTime    = tup.endTime ;
            temp.multipleChoices = tup.multipleChoices ;
            temp.State      = tup.State ;
            turn++
        } 

        tempAns.push( { AnswerNo: tup.AnswerNo , Answer: tup.Answer  , Ans_Count: tup.Ans_Count } )
        sm += tup.Ans_Count ;
    }

    temp.Answers = tempAns ;
    temp.Votes = sm ;
    whole.push( temp );

    return JSON.stringify( whole )

}

function createQueryUrl(pathnme , id){
    return pathnme + '?id=' + id ;
}


module.exports = { session , attachBody  , register , login , render , redirect , timeNow ,isEligible,pollView ,
                   changeCookie , create_poll , assignBag , logout, retrieveMY , arrangeData , voteSeperation ,
                   createQueryUrl , changeTime , expiredPoll , Id2link , beforeExtendTime}

