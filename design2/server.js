/// node modules
const http = require('http');
const { readFileSync } = require('fs');


/// custom modules
const { Manager } = require('./Manage') ;
const { Connection_DB }  = require('./model');

const { register , login , render, redirect , logout , retrieveMY ,isEligible, createQueryUrl ,
    create_poll , assignBag , changeCookie, timeNow , arrangeData, pollView ,
    changeTime , expiredPoll , Id2link , beforeExtendTime , arrangeToVote , obtainVote ,
    dataToEdit , saveEditPoll } = require('./base');



/// server call
let Admin = new Manager() ;
let DBadmin = new Connection_DB();
let RegHandler = Admin.RegHandler() ; 
let LgHandler = Admin.LgHandler();
let PollHandler = Admin.PollHandler() ;
let PollReader = Admin.PollReader() ;
let path = Admin.path() ;


const server = http.createServer( main ).listen( 8000 , ()=>console.log('listen...') );


// =======================  route - callback ================================= //


/* GET request */
Admin.get( path.home , ( req , res )=> {

    render( res ,  '../templates/HTML/home.ejs'  );
    return ;

})

Admin.get( path.notFnd , (req , res )=> {
    // page not found error rendering 
    render( res , '../templates/HTML/notFnd.ejs' , '' , 404 );
    return ;
})

Admin.get( path.register , ( req , res )=> {
    
    if( req.session.AuthUser == 0){
        render( res , '../templates/HTML/register.ejs' );
    }

    else{
        redirect( res , path.my );
    }
    return ;

})

Admin.get( path.login , (req,res)=> {

    if( req.session.AuthUser == 0){
        render( res , '../templates/HTML/login.ejs' );    
    }

    else{
         redirect( res , path.my );
    }
    return ;
})

Admin.get( path.my , (req,res)=> {
   
    if( req.session.AuthUser == 1){

        retrieveMY( 1  ,  PollReader , DBadmin , req , res );

    }

    else{
        redirect( res , path.home );
    }
    return ;
})


Admin.get( path.mySchedule , (req,res)=> {
   
    if( req.session.AuthUser == 1){

        retrieveMY(  0  ,  PollReader , DBadmin , req , res );

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
        
        render( res , '../templates/HTML/createpoll.ejs' , { quesNo: Admin.quesNo , ansStart: Admin.ansStart , editDt:null } );
    }
    else{
        redirect( res , path.home );
    }
    return ;
})


Admin.get( path.vote , (req,res)=> {
    
    if( isEligible( req , res ) ){
        DBadmin.beforeAllowVote( req.query.id ,  PollReader ,req , res );
    }

    else{
        if( req.query.id != '' ){
            // render page
            pollView( PollReader , DBadmin , req , res );
        }
        else{
            // page not found
            redirect( res , path.notFnd );
        }
    }
    return ;
})

Admin.get( path.poll.editPoll , ( req , res )=> {

    if( req.session.AuthUser == 0){
        redirect( res , path.notFnd );
    }

    else{
        DBadmin.editPage( req.query.quesNo , PollReader , req , res );
    }
})


Admin.get( '/CSS/' , (req , res)=> {
    
    let fileCss = readFileSync('../templates/CSS/' + req.url ) ;
    res.writeHead( 200 , {'Content-Type':'text/css'});
    res.end( fileCss ) ;
   
    return ;

})


/* ==================  POST request ========================= */

Admin.post( path.register , ( req , res )=> {

    if( req.session.AuthUser == 0){
        register( RegHandler , DBadmin , req , res );
        return ;
    }

    else{
        redirect( res , path.my );
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

    if( req.session.AuthUser == 1 ){
       create_poll( PollHandler , DBadmin, req , res );
      
    }

    else{
        redirect( res , path.home )
    }

    return ;
})

Admin.post( path.vote , (req , res) => {

    obtainVote( PollHandler , DBadmin , req , res)
    
    return ;
})


Admin.post( path.poll.timeExtend , ( req , res )=> {

    if( req.session.AuthUser == 0){
        redirect(res , path.notFnd ) ;
        return ;
    }

    else{
        beforeExtendTime( PollHandler ,  req , res );
        return;
    }
})


Admin.post( path.poll.editPoll , ( req , res ) => {

    if( req.session.AuthUser == 0){
        redirect(res , path.notFnd ) ;
    }

    else{
        saveEditPoll( PollHandler , PollReader , DBadmin , Admin.schduleBag , req , res ) ; 
    }

    return ;
})


// =====================  registering event handlers ======================= //

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
    let msg;
    if(err){
        msg = err ;
    }
    else{
        let stTime = request.body[ DBadmin.pollc.stTime ] ;
        let eTime  = request.body[ DBadmin.pollc.eTime ] ;
        let now = timeNow() ;
        let Qno = request.body[ DBadmin.pollc.Qno ] ;
        assignBag(stTime,eTime,now,Qno, Admin.liveBag , Admin.schduleBag , PollHandler , DBadmin ) ;

        Admin.setForNxtPoll();
        msg = 'sucessfully created...';
    }
   redirect( response , path.my )

    return ;
})


PollHandler.on( 'done-expiredpoll' , ( Qno )=> {
    delete Admin.liveBag[ Qno ] ;
    console.log(`poll fired Over...${ Qno }`);
    return ;

})

PollHandler.on('done-ansIncreased' , (err , request,response)=> {
    if(err){
        //redirect to home with error message
        redirect( response , path.home )
    }

    else{ 
        redirect( response , createQueryUrl( path.vote , Id2link( request.query.id ) ) )
    }

    return ;

})

PollReader.on( 'done-retrievePollData' , (err , data , _st  , request , response )=> {
    if(err){
        redirect( response ,  path.home );
    }
    else{
        let sendData = arrangeData(data) ;
        render( response , '../templates/HTML/my.ejs' , { mydata: sendData , myuser: 1 , state: _st }  );
    }

    return ;
})

PollReader.on( 'done-singlePollData'  , (err , data , request , response )=> {

    if(err){
        redirect( response ,  path.home );
    }
    else{
        let sendData = arrangeData(data) ;
        render( response , '../templates/HTML/view.ejs' , { mydata: sendData , myuser:0 , state: 1 }  );
    }

    return ;
})

PollReader.on('done-validation' , (err , voteData  , request , response )=> {
    let msg;
    if(err){
        redirect( response , path.notFnd );
    }

    else{
        let sndData = arrangeToVote( voteData );
        render(  response , '../templates/HTML/vote.ejs' , { Vdata: sndData })
    }

    return ;
})

PollHandler.on('done-extended' , (err , request , response ) => {
    let msg;
    if( err ){
        msg = 'some error occuried'
    }
    else{
        msg = 'time extended successfully' ;
    }
    response.end( msg );
    return ;
})

PollHandler.on( 'done-dataExtendTime' , ( dtTime  , req , res )=> {
    let now = timeNow() ;
    
    if( Admin.liveBag.hasOwnProperty( dtTime.Qno )  ){
        
        changeTime( dtTime , now , PollHandler , Admin.liveBag , DBadmin , expiredPoll  ,  req , res );
        return ;
    }

    else{
        let msg = 'could not update' ;
        res.end(msg);
        return ;
    }
})

PollReader.on( 'done-EditDataFetched' , (err , data , request , response )=> {

    if( err ){
        redirect( response , path.notFnd );
        return ;
    }

    let dta  = dataToEdit( data );
    
    render( response , '../templates/HTML/createpoll.ejs' , { quesNo: dta.QuestionNo  , ansStart: dta.Answers[0].AnswerNo , editDt: JSON.stringify(dta) } );
})

PollReader.on('done-editSave' , (err , request , response ) => {
    if(err){
        redirect( response , path.notFnd );
        return ;
    }

    DBadmin.createPoll( request.body , PollHandler , request , response );
    console.log('updatedd..');
    return ;
})


// ====================  main function ====================== //

function main( req , res ){
    let url = req.url ;
    if( url == '/favicon.ico' ){ return ; }
    
    Admin.Execute_MiddleWare( req , res );
    let success  = Admin.router( req , res );

    if( !success ){
        redirect(  res , path.notFnd  )
    }

    return ;

}

