const event      = require('events');
const { parse }  = require('querystring');
const { readFileSync }    = require('fs');
const { connectionDB }    = require('./db');
const { CookieParser }  = require('./middleWare');
const { data } = require('./test1')

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

        this.QuesCnt = 201 ;
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
        response.end( tempalte ,() => {
            console.log('render something........');
        } );
        return ;
    
    }

    redirect( response , to ){
        console.log( 'Is response has send : ' ,  response.finished )
        response.writeHead( 302 , {'Location' : to } );
        response.end( ()=> {
            console.log('redirect something....')
        });
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

        response.setHeader( 'Set-Cookie', [ cookie.slice(0,29) + to + cookie.slice(30) ] );
        return 
    }
    
    
    Register( request , response  ){

        //this.emitter.removeAllListeners( );

        this.emitter.on('allowREG' , ()=> {
            // -------->
           ///send mail and store the data in a temperay User table
           // after the email verification put them in MainUser table
           this.redirect( response , this.home );

       
       })
   
       this.emitter.on('denyREG' , ()=> {
           //ask to enter the email again
           this.redirect( response ,  this.register );
       })

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
            return ;
        })
    
}


    login_Auth( request , response ){
        console.log('try to login');

       // this.emitter.removeAllListeners();

        this.emitter.on( 'allowLOG' , ()=> {
            // ------> display message
            // allow to login - update the currentsession table
            this.changeCookie( response , '1');
            this.dbPool.addCurrentUser( request.session.SessionId , Info[ this.logInTags.email ] , this.emitter )
        

        })

        this.emitter.on( 'denyLOG' , ()=> {
            // --------> display message 
            // ask again login informations -- put the error message
            console.log('wrong login Info')
            this.redirect( response , this.login );
            return ;

        });

        this.emitter.on('addedLOG', ()=> {
            console.log('you can login')
            this.redirect( response , this.my  );
            return ;
        })


        let text = '' , Info ;

        request.on( 'data' , (chunk)=> {
            text += chunk.toString();
        })
 
        request.on('end',()=> {

            Info = parse( text );

            this.dbPool.isAuthUser( Info[ this.logInTags.email ] , Info[ this.logInTags.password ] , this.emitter );
            return ;
        })

        return ;

    }

    _pollTimeOut(  handler , queNo ){
    
        console.log( 'times out fired ....current hander removed : ', queNo  );
        delete handler[queNo];
        return ;

    }


    _assignHandler( startTime , endTime  , QuesNo  ){  // startTime in minutes

        let now = this._nowTIme();
        let timediff =  Math.floor( endTime - startTime )*60000 ;

        if( startTime <= now ){
            // poll start 
            console.log('poll start : ', QuesNo )
             this.CurrentHandlers[ QuesNo ] = setTimeout( this._pollTimeOut , timediff , this.CurrentHandlers   , QuesNo );
             return ;
        }
    

        // schdule it for later
        let timeout = ( startTime - now )*60000 ;
        console.log('schdule for future : ' ,  QuesNo);

        this.schduleHandler[ QuesNo ] = setTimeout( () => {

            // take over the time handler to the currenthandler
            this.emitter.emit( 'changeCRE_POLL' , timediff , QuesNo ) ;

        }, timeout );

        return ;    
        
    }

    create_poll( request , response ){

        //this.emitter.removeAllListeners( ); 
        this.emitter.on( 'doneCRE_POLL' , ()=> {

            this._assignHandler( dataEch.settings.startTime , dataEch.settings.endTime , quesNo );
            this.redirect( response , this.my );

        })

        this.emitter.on('errorCRE_POLL' , ()=> {
         
            this.render( response ,  './templates/HTML/error.html' );
        })

        this.emitter.on( 'changeCRE_POLL', ( tmDiff , quesNo)=>{
      
            delete this.schduleHandler[ quesNo ] ;
            this.CurrentHandlers[ quesNo ]   = setTimeout( this._pollTimeOut , tmDiff , this.CurrentHandlers , quesNo );
            console.log('take over done.... and remove schdule handler : ' , quesNo );

        })

        let quesNo = this.QuesCnt ;
        let dataEch = data.pop();
        this.QuesCnt++ ;
        this.dbPool.addPoll( request.session.SessionId , quesNo , dataEch , this.emitter );
        return ;

    }

    arrageMyPage( request , response ){
        
        //this.emitter.removeAllListeners( 'pageNOTfound' , 'pgReady' ); 

        this.emitter.on('pageNOTfound' , ()=> {
            this.render( response , './templates/HTML/error.html' )
        });

        this.emitter.on( 'pgReady' , ( data )=> {
            this.render( response , './templates/HTML/my.html' );

        });

        this.dbPool.bringDataToShow( request.session.SessionId , this.emitter );
        return ;

    }


    EndSession( request , response ){

        this.dbPool.removeCurrentUser( Number.parseInt( request.session.SessionId ) );
        response.removeHeader('Set-Cookie');

        response.setHeader( 'Set-Cookie', [ this._createCookie(  request.session , 0 ) ] ) ;
        this.redirect( response , this.home  );

    }

}



module.exports = { Basic  }