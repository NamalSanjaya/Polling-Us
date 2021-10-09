const event      = require('events');
const { parse }  = require('querystring');
const { readFileSync }    = require('fs');
const { connectionDB }    = require('./db');
const { CookieParser }  = require('./middleWare');


class eventBasic extends event{ }


class Basic extends CookieParser {

    constructor(){
        super() ;
        this.dbPool  = new connectionDB();
        this.emitter = new eventBasic();
        this.regTags =   { name: 'Uname'    , email:'Uemail' , password:'Upassword' }
        this.logInTags = { email:'MYmail' , password:'MYpasswd'}

        this.host     = "http://localhost:8000";
        this.home     = "http://localhost:8000/home" ;
        this.login    = "http://localhost:8000/home/login" ;
        this.register = "http://localhost:8000/home/register" ;
        this.my       = "http://localhost:8000/my" ;

        this.QuesCnt = 0 ;
        this.CurrentHandlers = {};
        this.schduleHandler = {} ;

    }

    _nowTIme(){
        // time to nearest minutes
        let ref = new Date('2021-10-01T00:00:00')  // take as reference
        return Math.floor( ( Date.now() - ref.getTime() ) / 60000 ) ;
    }

    segmentURL(url){

        let urlOBJ = new URL( url , this.host );
        let quey   = urlOBJ.search ;
        let param    =  parse( quey.search()>=0 ? quey.slice(1) : '' ) ;
        let pathname = urlOBJ.pathname ;

        return { pathname , param }
    }

    randomId(){
        return '?id=' + Math.floor( Math.random() * 1e4 ).toString() ;
    }

    render( response , Path  ){

        let tempalte = readFileSync( Path );
        response.writeHead( 200 , {'Content-Type':'text/html'} );
        response.end( tempalte );
        return ;
    
    }

    redirect( response , to ){
        console.log(  'handler : ' , this.CurrentHandlers )
        response.writeHead( 302 , {'Location' : to } );
        response.end();
        return ;
    }
    
    
    notValid( ParsedInfo ){
    
        if( ParsedInfo['Uemail'] ){
           return false ;
        }
    
        return true ;
    }

    changeCookie(  response  ,to){
        let cookie = response.getHeader('set-cookie')[0];
        response.removeHeader('Set-Cookie');

        response.setHeader( 'Set-Cookie', [ cookie.slice(0,29) + to + cookie.slice(30) ] )
    }
    
    
    Register( request , response  ){

        this.emitter.removeAllListeners( 'allow' , 'deny' );
        let text = '' ;
    
        request.on( 'data' , (data)=> {
            text += data.toString() ;
        })
    
        request.on( 'end' , ()=> {
    
            let Info = parse( text );
    
            if( this.notValid(Info) ){
                this.emitter.emit('deny');
                return ;
            }
    
            this.dbPool.checkEmail( Info[ this.regTags.email ] , this.emitter);
        
        })
    
        this.emitter.on('allow' , ()=> {
             // -------->
            ///send mail and store the data in a temperay User table
            // after the email verification put them in MainUser table
            this.redirect( response , this.home );

        
        })
    
        this.emitter.on('deny' , ()=> {
            //ask to enter the email again
            this.redirect( response ,  this.register );
        })
    
    }


    login_Auth( request , response ){

        this.emitter.removeAllListeners( 'allow' ,  'deny'  );  // to clear the emitter event object 
        let text = '' , Info ;

        request.on( 'data' , (chunk)=> {
            text += chunk.toString();
        })
 
        request.on('end',()=> {

            Info = parse( text );

            this.dbPool.isAuthUser( Info[ this.logInTags.email ] , Info[ this.logInTags.password ] , this.emitter );
            
        })

        this.emitter.on( 'allow' , ()=> {
            // ------> display message
            // allow to login - update the currentsession table
            this.changeCookie( response , '1');
            this.dbPool.addCurrentUser( request.session.SessionId , Info[ this.logInTags.email ] , this.emitter )
        

        })

        this.emitter.on( 'deny' , ()=> {
            // --------> display message 
            // ask again login informations -- put the error message
            this.redirect( response , this.login );

        });

        this.emitter.on('added', ()=> {
            this.redirect( response , this.my  );
        })

    }

    _pollTimeOut(  handler , queNo ){
    
        console.log( 'times out fired ....current hander removed : ', queNo  );
        delete handler[queNo];

    }


    _assignHandler( startTime , endTime  , QuesNo  ){  // startTime in minutes

        let now = this._nowTIme();
        let timediff =  Math.floor( endTime - startTime )*60000 ;

        if( startTime <= now ){
            // poll start 
            console.log('poll start')
             this.CurrentHandlers[ QuesNo ] = setTimeout( this._pollTimeOut , timediff , this.CurrentHandlers   , QuesNo )
        }
        else{

            // schdule it for later
            let timeout = ( startTime - now )*60000 ;
            console.log('schdule for future : ' , timeout );

            this.schduleHandler[ QuesNo ] = setTimeout( () => {

                // take over the time handler to the currenthandler
                this.emitter.emit( 'change' , timediff , QuesNo ) ;

            }, timeout );
            
        }
    }

    create_poll( request , response ){

        let quesNo = 118 ;
        this.emitter.removeAllListeners( 'done' , 'change' ); 

        let data = { 
            "ques"        : `your hobbies?` ,
            "ans"         : [ `cricket` , `movies` ] ,
            "settings"    : { startTime: 12547 , endTime: 12549 , multipleChoicesAllow: 1 } 
        }

        this.dbPool.addPoll( request.session.SessionId , quesNo , data , this.emitter );

        this.emitter.on( 'done' , ()=> {

            this._assignHandler( data.settings.startTime , data.settings.endTime , quesNo )
            this.redirect( response , this.my );

        })

        this.emitter.on('error' , ()=> {
            this.render( response ,  './templates/HTML/error.html' );
        })

        this.emitter.on( 'change', ( tmDiff , quesNo)=>{

            delete this.schduleHandler[ quesNo ] ;
            this.CurrentHandlers[ quesNo ]   = setTimeout( this._pollTimeOut , tmDiff , this.CurrentHandlers , quesNo );
            console.log('take over done.... and remove schdule handler');

        })

    }

    arrageMyPage( request , response ){
        
        this.emitter.removeAllListeners( 'pageNOTfound' , 'pgReady'); 

        this.dbPool.bringDataToShow( request.session.SessionId , this.emitter );

        this.emitter.on('pageNOTfound' , ()=> {
            console.log('error Occuried..');
            this.render( response , './templates/HTML/error.html' )
        });

        this.emitter.on( 'pgReady' , ( data )=> {
            console.log( data );
            this.render( response , './templates/HTML/my.html' );
        });

    }


    EndSession( request , response ){

        this.dbPool.removeCurrentUser( Number.parseInt( request.session.SessionId ) );
        response.removeHeader('Set-Cookie');

        response.setHeader( 'Set-Cookie', [ this._createCookie(  request.session , 0 ) ] ) ;
        this.redirect( response , this.home  );

    }

}


module.exports = { Basic  }