/// node modules
const http = require('http');


/// custom modules
const { Manager } = require('./Manage') ;
const { Connection_DB }  = require('./model');

const { register , login , render, redirect , logout ,
        create_poll , assignBag , changeCookie, timeNow } = require('./base');

const { GetTestData } = require('./designtest1')

/// server call
let Admin = new Manager() ;
let DBadmin = new Connection_DB();
let RegHandler = Admin.RegHandler() ;
let LgHandler = Admin.LgHandler();
let PollHandler = Admin.PollHandler() ;
let path = Admin.path() ;


const server = http.createServer( main ).listen(8000 ,()=>console.log('listen...') );


// =======================  route - callback ================================= //

/* GET request */
Admin.get( path.home , ( req , res )=> {

    console.log( req.session );
    render( res ,  '../templates/HTML/home.html'  );
    return ;

})

Admin.get( path.register , ( req , res )=> {
    
    if( req.session.AuthUser == 0){
        render( res , '../templates/HTML/register.html' );
    }

    else{
        redirect( res , path.my );
    }
    return ;

})

Admin.get( path.login , (req,res)=> {

    if( req.session.AuthUser == 0){
        render( res , '../templates/HTML/login.html' );    
    }

    else{
         redirect( res , path.my );
    }
    return ;
})

Admin.get( path.my , (req,res)=> {

    if( req.session.AuthUser == 1){
        render( res , '../templates/HTML/my.html' );
    }

    else{
        redirect( res , path.home );
    }
    return ;
})

Admin.get( path.logout , (req,res)=> {

    if( req.session.AuthUser == 1){
       logout( LgHandler , DBadmin , req , res );
    }
   else{
       redirect( res , path.home );
   }
    
    return ;

})


Admin.get( path.createpoll , (req , res )=> {

    if( req.session.AuthUser == 1){
        render( res , '../templates/HTML/createpoll.html' );
    }
    else{
        redirect( res , path.home )
    }
    return ;
})



/* POST request */
Admin.post( path.register , ( req , res )=> {

    if( req.session.AuthUser == 0){
        register( RegHandler , DBadmin , req , res );
        return ;
    }

    else{
        redirect( res , path.my )
    }

    return ;

})

Admin.post( path.login , ( req , res )=> {

    if( req.session.AuthUser == 0){ 
        login( LgHandler , DBadmin , req , res ) ;
        return ;
    }

    else{
        redirect( res , path.my ) ;
    }

    return ;
})

Admin.post( path.createpoll , (req , res )=> {

    if( req.session.AuthUser == 1){
        req.body = GetTestData();  // testing line
        create_poll( PollHandler , DBadmin, req , res );
    }

    else{
        redirect( res , path.home )
    }

    return ;
})



/// =====================  registering event handlers ======================= //

/// for server.js
RegHandler.on( 'done-reg' , (err , request , response )=> {

    if( err ){
        redirect( response , path.register );
    }
    else{
        redirect( response , path.home );
    }
    return ;

}) ;


// for base.js

RegHandler.on( 'allow-reg1' , (err , request , response )=> {

    if(err){
        redirect(response, path.home );
    }
    else{
        /// send email and add to pending uset table
        DBadmin.addPendingUser( request.body , RegHandler , request , response);
    }
    return ;
})


LgHandler.on('done-login' , (err , request , response ) => {

    if(err){
        redirect( response, path.login);
    }
    else{
        changeCookie( response , 1 );
        redirect( response, path.my );
    }
    return ;
})

LgHandler.on('done-logout' , (err, request , response)=> {

    redirect( response , path.home );
    return ;
})


PollHandler.on( 'done-addpoll', (err,request,response)=> {

    if(err){
        redirect( response , path.my);
    }
    else{
        let stTime = request.body[ DBadmin.pollc.stTime ] ;
        let eTime  = request.body[ DBadmin.pollc.eTime ] ;
        let now = timeNow() ;
        let Qno = request.body[ DBadmin.pollc.Qno ] ;
        assignBag(stTime,eTime,now,Qno, Admin.liveBag , Admin.schduleBag , PollHandler ) ;
        response.end('Wait');
    }
    return ;
})


PollHandler.on( 'done-expiredpoll' , ( Qno )=> {

    console.log(`poll fired Over...${ Qno }`);
    return ;

})



// ====================  main function ====================== //

function main( req , res ){
    let url = req.url ; 

    if( url == '/favicon.ico' ){ return ; }

    Admin.Execute_MiddleWare( req , res );
    Admin.router( req , res );

    return ;

}

