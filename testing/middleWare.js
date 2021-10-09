

class CookieParser{
        
    /**
     * @param {string} pattern
     * @param { Number } ind
     * @returns { Object } 
     */
    _extracCookie( pattern , ind ){

        let [id,Auser]  = pattern.slice( ind , ind + 30 ).split('&');
        let valId  = id.split('=')[1].trim() ;
        let valUsr = Number.parseInt( Auser.split('=')[1].trim() );

        return { SessionId: valId , AuthUser: valUsr } ;
          
    }

    _createId(){

        // length 9 id
        let ref = new Date('2021-10-01T00:00:00')  ;
        let id1 = ( Date.now() - ref ).toString().slice(0,6) ;
        let id2 =  Math.floor( Math.random() * 1e3 ).toString()
       
        return id1 + id2 ;

    }

    _createCookie( session , mul ){
        let now = new Date( Date.now()  +  36e5*mul );
        let time = '; Expires=' + now.toUTCString() ;
        return 'SessionId='.concat( session.SessionId , '&AuthUser=', session.AuthUser.toString() ,time , '; Path=/' )
    }

}



// AuthUser = '0' ( guest ) , '1' ( authenticated )

class MiddleWare extends CookieParser{


    session( request , response ){

        let cke , ind , timeMul;
        cke = request.headers.cookie  || '';
        ind = cke.search(/SessionId=/) ;

        if( ind >= 0){
            // authenticated user
            request.session = this._extracCookie( cke , ind );
            timeMul = 4 ;
        }

        else{
            // guset
            let SessionId = this._createId() ;
            request.session = { SessionId , AuthUser: 0 }
            timeMul = 1 ;
        }

        response.setHeader( 'Set-Cookie', [ this._createCookie( request.session , timeMul ) ] ) ;

    }

}

module.exports = { MiddleWare , CookieParser }
