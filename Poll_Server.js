const http = require('http');
const qs = require('querystring')
const { Basic } = require('./testing/Basic') ;
const { MiddleWare } = require('./testing/middleWare')

let basic  = new Basic() ;
let middleware = new MiddleWare() ;

const server = http.createServer( (req,res) => {

    let method = req.method;
    let urlInfo = basic.segmentURL( req.url );

    let pathname = urlInfo['pathname'] , param = urlInfo['param'];
    
    if( pathname == '/favicon.ico' ){ return ; }

    middleware.session( req , res );
    console.log(  req.headers.cookie ,  req.session );

    if( method =='GET'){

        if( pathname == '/home'){
          
            basic.render( res , './templates/HTML/home.html' );
            return

        }

        else if( pathname == '/home/register'){

            if(  req.session.AuthUser == 0 ){
                basic.render( res , './templates/HTML/register.html' );
                return
            }

            basic.redirect( res , basic.my )
            return ;

        }

        else if( pathname == '/home/login'){
           
            if(  req.session.AuthUser == 0 ){
                basic.render( res , './templates/HTML/login.html' );
                return ;
            }
        
            basic.redirect( res , basic.my )
            return ;

        }

        else if( pathname == '/reset'){

            basic.render( res , './templates/HTML/reset.html' )
            return

        }

        else if( pathname == '/my'){

            if( req.session.AuthUser == 1){

               //basic.arrageMyPage( req , res );
               basic.render( res , './templates/HTML/my.html')
                return ;
            }

            basic.redirect( res , basic.home )
            return ;
        }

        else if( pathname == '/my/logout' ){

            if( req.session.AuthUser == 1){

                basic.EndSession( req , res );
                return ;
            }

            basic.redirect( res , basic.home );
            return 
        }

        else if( pathname == '/my/create-poll'){
            if( req.session.AuthUser == 1){
                // able to create poll
                basic.create_poll( req , res );
                return ;
            }

            basic.redirect( res , basic.home );
            return ;
        }
         
    }

    else if( method == 'POST' ){

        if( pathname == '/home/register' ){

            basic.Register( req , res  );
            return 
           
        }

        else if( pathname == '/my'){
    
            basic.login_Auth( req , res );
            return 

        }
    }
    
    else{

        res.end('not found - 404')
        return

    }
})

server.listen( 8000 , ()=> console.log('Listening....') )



