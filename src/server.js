/// node modules
const http = require('http');
const { readFileSync } = require('fs');


/// custom modules
const { Manager } = require('./Manage') ;
const { Connection_DB }  = require('./model');

const { register , login , render, redirect , logout , retrieveMY ,isEligible, createQueryUrl ,
    create_poll , assignBag , changeCookie, timeNow , arrangeData, pollView ,
    changeTime , expiredPoll , Id2link , beforeExtendTime , arrangeToVote , obtainVote ,
    dataToEdit , saveEditPoll , replacer } = require('./base');



/// server call
let Admin = new Manager() ;
let DBadmin = new Connection_DB();
let RegHandler = Admin.RegHandler() ; 
let LgHandler = Admin.LgHandler();
let PollHandler = Admin.PollHandler() ;
let PollReader = Admin.PollReader() ;
let path = Admin.path() ;
let port = process.env.PORT || 8000 ;

const server = http.createServer( main ).listen( port, ()=>console.log('listen...',port) );


// =======================  route - callback ================================= //


/* GET request */
Admin.get( path.home , ( req , res )=> {

    render( res ,  './templates/HTML/home.ejs'  );
    return ;

})

Admin.get( path.notFnd , (req , res )=> {
    // page not found error rendering 
    render( res , './templates/HTML/notFnd.ejs' , '' , 404 );
    return ;
})

Admin.get( path.register , ( req , res )=> {
    
    if( req.session.AuthUser == 0){
        render( res , './templates/HTML/register.ejs' );
    }

    else{
        redirect( res , path.my );
    }
    return ;

})

Admin.get( path.regConfirm , ( req , res )=> {
   
    DBadmin.addRegisteredUser( req.query.rid , RegHandler , req , res );
    return ;
})

Admin.get( path.login , (req,res)=> {

    if( req.session.AuthUser == 0){
        render( res , './templates/HTML/login.ejs' );    
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

Admin.get( path.myHistory , (req,res)=> {
   
    if( req.session.AuthUser == 1){

        retrieveMY(  2  ,  PollReader , DBadmin , req , res );

    }

    else{
        redirect( res , path.home );
    }
    return ;
})


Admin.get( path.logout , (req,res)=> {

    if( req.session.AuthUser == 1){
       logout( LgHandler , DBadmin , Admin.encrpt  , req , res );
    }
   else{
       redirect( res , path.home );
   }
   
    return ;

})

Admin.get( path.createpoll , (req , res )=> {

    if( req.session.AuthUser == 1){
        
        render( res , './templates/HTML/createpoll.ejs' , { quesNo: Admin.quesNo , ansStart: Admin.ansStart , editDt:null } );
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
        req.session.action = 'edit' ;
        req.session.state  = 0 ;
        DBadmin.editPage( req.query.quesNo , PollReader , req , res );
    }
})

Admin.get( path.poll.delPoll , ( req , res )=> {

    if( req.session.AuthUser == 0){
        redirect( res , path.notFnd );
    }

    else{
        req.session.action = 'del';
        req.session.state  = 0 ;
        DBadmin.removeCurrentPoll( req.query.quesNo , PollReader , req , res );
    }
    return ;
})


Admin.get( path.poll.endPoll , ( req , res )=> {

    if( req.session.AuthUser == 0){
        redirect( res , path.notFnd );
    }

    else{
        req.session.action = 'del';
        req.session.state  = 2 ;
        DBadmin.removeCurrentPoll( req.query.quesNo , PollReader , req , res );
    }
    return ;
})


Admin.get( '/CSS/' , (req , res)=> {
    
    let fileCss = readFileSync('./templates/CSS/' + req.url ) ;
    res.writeHead( 200 , {'Content-Type':'text/css'});
    res.end( fileCss ) ;
   
    return ;

})


/* ==================  POST request ========================= */

Admin.post( path.register , ( req , res )=> {

    if( req.session.AuthUser == 0){
        register( RegHandler , DBadmin , Admin.encrpt , req , res );
        return ;
    }

    else{
        redirect( res , path.my );
    }

    return ;

})

Admin.post( path.login , ( req , res )=> {

    if( req.session.AuthUser == 0){ 
        login( LgHandler , DBadmin , Admin.encrpt , req , res ) ;
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
        req.session.action = 'edit' ;
        req.session.state = 0 ;
        saveEditPoll( PollHandler , PollReader , DBadmin , Admin.schduleBag , req , res ) ; 
    }

    return ;
})


// =====================  registering event handlers ======================= //


RegHandler.on('done-register' , (err,request, response )=> {

        if(err){
            redirect( response , path.notFnd );
        }

        else{
        
            redirect( response , path.logout );
        }

        return ;
})

RegHandler.on( 'done-pendReg' , (err , request , response )=> {

    if( err ){
        redirect( response , path.register );
    }
    else{
        // need to send email
        let token = Id2link( request.body.pendingId );
        Admin.sendEmail( request.body.Uemail , token , RegHandler );
        redirect( response , path.home );
    }
    return ;

}) ;


RegHandler.on( 'allow-reg1' , (err , request , response )=> {

    if(err){
        redirect(response, path.home );
    }
    else{
        /// send email and add to pending uset table
        request.body.pendingId = Admin.pendUser;
        Admin.pendUser++ ;
        DBadmin.addPendingUser( request.body , RegHandler , request , response);
    }

    return ;
})


LgHandler.on('done-login' , (err , request , response ) => {

    if(err){
        redirect( response, path.login);
    }
    else{
        changeCookie(request ,  response , Admin.encrpt , 1 );
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

    if( request.session.action == 'edit'){

        redirect( response , path.mySchedule );
        return ;
    }
    else{
        redirect( response , path.my ) ;
    }

    return ;
})


PollHandler.on( 'done-expiredpoll' , ( Qno )=> {
    let tmer = Admin.liveBag[ Qno ] ;
    clearTimeout( tmer ) ;
    delete Admin.liveBag[ Qno ] ;
    console.log(`poll fired Over...${ Qno }`);
    DBadmin.changeState( Qno, 2 );
    return ;

})

PollHandler.on('done-ansIncreased' , (err , request,response)=> {
    if(err){
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
        render( response , './templates/HTML/my.ejs' , { mydata: sendData , myuser: 1 , state: _st }  );
    }

    return ;
})

PollReader.on( 'done-singlePollData'  , (err , data , request , response )=> {

    if(err){
        redirect( response ,  path.home );
    }
    else{
        let sendData = arrangeData(data) ;
        render( response , './templates/HTML/view.ejs' , { mydata: sendData , myuser:0 , state: 1 }  );
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
        render(  response , './templates/HTML/vote.ejs' , { Vdata: sndData })
    }

    return ;
})

PollHandler.on('done-extended' , (err , request , response ) => {
    let msg;
    if( err ){
        msg = 'some error occuried';
    }
    else{
        msg = 'time extended successfully' ;
    }
    response.end( msg );
    return ;
})

PollHandler.on( 'done-dataExtendTime' , ( dtTime  , request , response )=> {
    let now = timeNow() ;
    
    if( Admin.liveBag.hasOwnProperty( dtTime.Qno )  ){
        
        changeTime( dtTime , now , PollHandler , Admin.liveBag , DBadmin , expiredPoll  ,  request , response );
        return ;
    }

    else{
        let msg = 'could not update' ;
        response.end(msg);
        return ;
    }
})

PollReader.on( 'done-EditDataFetched' , (err , data , request , response )=> {

    if( err ){
        redirect( response , path.notFnd );
        return ;
    }

    let dta  = dataToEdit( data );
    
    render( response , './templates/HTML/createpoll.ejs' , {quesNo: dta.QuestionNo, ansStart: dta.Answers[0].AnswerNo, editDt:JSON.stringify(dta ,replacer)} );
})

PollReader.on('done-editSave' , (err , request , response ) => {
    if(err){
        redirect( response , path.notFnd );
        return ;
    }

    else if( request.session.action == 'edit' ){

        DBadmin.createPoll( request.body , PollHandler , request , response );
    }

    else if( request.session.action == 'del' ){

        let _timer = Admin.schduleBag[ request.query.quesNo ] ;
        clearTimeout( _timer );
        delete Admin.schduleBag[ request.query.quesNo ];
        redirect( response , path.mySchedule  )
    }

    return ;
})


// ====================  main function ====================== //

function main( req , res ){
    let url = req.url ;
    if( url == '/favicon.ico' ){ return ; res.end()}
    
    Admin.Execute_MiddleWare( req , res );
    let success  = Admin.router( req , res );
     
    if( !success ){
        redirect(  res , path.notFnd  )
    }

    return ;

}

