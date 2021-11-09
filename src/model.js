// dependencies 
const  mysql = require('mysql2');

// custom modules
const { timeNow }  = require('./base');

class Connection_DB{

    constructor(){
        this.connection = mysql.createPool( {

            host: process.env.poll_db_host,
            user: process.env.poll_db_user,
            port:3306,
            password: process.env.poll_db_passwd,
            database: process.env.poll_db_name,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0

        }); 

        this.reg = { name: 'Uname' , email:'Uemail' , password:'Upassword' }
        this.log = { email:'MYmail' , password:'MYpasswd'} ;
        this.pollc = { Qno:'QuestionNo' , Ques:'Question' , email:'Email' , stTime:'startTime' , 
                    eTime:'endTime' , multi: 'multipleChoices' , st:'State' }

    }

    checkEmail( mail , rHandler , request , response ){
  
        let query = `select Email from RegisteredUsers where Email=?` ;
        this.connection.query( query , [ mail ] , (err,result,fields) => {
            
            if(err){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-checkEmail| ', err);
                return ;
            }

            else if(result.length ){

                let msg = 'Email already exist' ;
                rHandler.emit('done-pendReg' , msg , request , response );
                return ;

            }
            else{

                // add users to pending table , send email
                rHandler.emit( 'allow-reg1', null , request , response );
                return ;
            }
        
        })
    }

    _updateFields( data , handler , request , response ){
        let query = `UPDATE PendingUsers 
        SET PendingId=? ,Username=? , Passwd=? , RegisteredTime=? WHERE  Email = ?` ;
        let now = timeNow() ;
        this.connection.query( query , [ data.pendingId , data[ this.reg.name ] , data[ this.reg.password ] , now , data[ this.reg.email] ] , (err,result,fields)=> {
            
            if(err){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-__updateFields| ', err.message)
                return ;
            }

            else{
                console.log('update pending tb');
                handler.emit('done-pendReg' , null , request , response ) ;
                return ;
            }
        });
    }

    _addPendingUser( data , handler , request , response ){
        let query = `insert into PendingUsers values(?,?,?,?,? )` ;
        let now = timeNow() ;

        this.connection.query( query ,  [ data.pendingId  , data[ this.reg.name ] , data[ this.reg.email ] , data[ this.reg.password ] , now ] , (err,result,fields) => {

            if( err ){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-_addPendingUser| ', err.message)
                return ;
            }

            else{
                handler.emit('done-pendReg' , null , request , response );
                console.log('insert into pending tb');
                return ;
            }

        }) ;
}

    addPendingUser( data , rHandler , request , response  ){
        let query1 = `select Email from PendingUsers where Email = ?` ;

        this.connection.query( query1 , [ data[ this.reg.email ] ] , (err,result,fields)=> {

            if( err ){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-addPendingUser| ', err.message)
                return ;

            }

            else if(result.length >= 2){

                let msg = 'duplicate fields are appeared' ;
                rHandler.emit('done-pendReg' , msg , request , response );
                return ;
            }

            else if( result.length == 1){
                // already exist something - update the time fields
                this._updateFields( data , rHandler , request , response );
                return ;

            }

            else{
                // add the newly registered user to pending table
                this._addPendingUser( data , rHandler , request , response );
                return ;
            }

        })


    }

    __addCurrentUser(  data , lHandler , request , response ){
        
        let query = `insert into currentSessions values ( ? , ? , ? )` ;
        let now = timeNow();

        this.connection.query( query , [ request.session.SessionId  , data[ this.log.email ]  , now  ] , (err,result,fields) => {
                if(err){
                    // redirect to server error page
                    console.log('!! server error-__addCurrentUser| ' , err.message );
                    return ;
                }

                else{
                    console.log('current user added..')
                    lHandler.emit('done-login' , null , request , response);
                    return ;
                }
        });

        return ;
    }

    _removeExistingUsers(  data , lHandler , request , response ){
        let query = `delete from currentSessions where Email=?` ;

        this.connection.query( query , data[ this.log.email ] , (err,result,fields)=> {

            if( err ){
                console.log('!! server error-_removeExistingUsers| ', err.message);
                // redirect to server error page
                return ;
            }

            else{
                this.__addCurrentUser(  data , lHandler , request , response );
                return ;
            }

        })

        return ;

    }

    checkCredentials( data , lHandler , request , response ){
        let query = `select Email from RegisteredUsers where Email=? and Passwd=?`;

        this.connection.query( query , [ data[ this.log.email ] , data[ this.log.password ] ],  (err,result,fields)=> {

            if(err || result.length >= 2){
                //server error - need to handle
                console.log('!! server error-checkCredentials| ', err );
                return;
            }

            else if( result.length == 0 ){

                let msg = 'wrong Email or Password';
                lHandler.emit('done-login' , msg , request , response );
                return;
            }

            else if( result.length == 1){
                this._removeExistingUsers( data , lHandler , request , response );
                return ;
            }

        });

        return ;
    }

    // data -> array
    _addAnswers( data , Qno , pHandler , request , response ){
        let query = `insert into Answers
                     values(?,?,?,?)` ;
        let len = data.length ;
        let cnt = 0;
        for(let ans of data){
            
            this.connection.query( query ,[ ans.AnswerNo , ans.Answer , Qno, 0] , (err,result,fields)=> {
                if(err){
                    //server error
                    console.log('server error-_addAnswers| ', err.message)
                }
                else{
                    cnt++ ;
                }
  
                if( len == cnt){
                    pHandler.emit('done-addpoll' , null , request , response );
                    return ;
                }

            });
        }

        return ;
    }


    addPoll( data , pHandler , request , response ){
        let query = `insert into Questions 
                    values(?,?,?,?,?,?,?)` ;

        this.connection.query(query,[ data[this.pollc.Qno] , data[this.pollc.Ques] , data[this.pollc.email]  , data[this.pollc.stTime] ,
                                      data[this.pollc.eTime] , data[this.pollc.multi], data[this.pollc.st ] ] , (err,result,fields)=> {

                if( err ){
                    // server error
                    console.log('!! server error-addPoll | ' + err.message );
                    return ;
                }

                else{
                    this._addAnswers( data.Answers , data[this.pollc.Qno]  , pHandler , request , response);
                    return ;
                }

         });
         return ;
    }

    decideState(stTime){
        let nw = timeNow();

        if( stTime <= nw ){
            return 1
        }

        else{
            return 0 ;
        }
    }

    createPoll( data , pHandler , request , response ){
        let qury = `select Email from currentSessions where sessionId=?` ;

        this.connection.query( qury , [ request.session.SessionId ] , (err,result , fields)=> {
            if(err){
                console.log('server error | ' + err.message);
            }
            else if( result.length == 0){
                let msg = 'UnAuthorized access..?? poll creation is falied' ;
                pHandler.emit('done-addpoll' , msg , request , response );
            }
            else{

                data.Email = result[0].Email ;
                data.State = this.decideState( data.startTime );
                this.addPoll( data , pHandler , request , response );
               
            }
            return  ;
        })

    }


    removeLoggedUser( Id , lHandler , request , response ){
        let query = `delete from currentSessions where sessionId = ? ` ;

        this.connection.query( query , [ Id ] , (err,result,fields)=> {
            if(err){
                //server error 
                console.log('server error-removeLoggedUser');
            }
            else{
                console.log(`session End ${ Id }`)
                lHandler.emit('done-logout' , null , request , response);
            }

            return ;
        });

        return ;
    }

    // ongoing polls only
    retrievePoll( Id , state , prHandler , request , response ){

        let query = `select q.* , a.AnswerNo , a.Answer , a.Ans_Count
                    from Questions q
                    inner join (
                            select Email from currentSessions where sessionId = ?
                    ) s on q.Email = s.Email 
                    inner join Answers a on a.QuestionNo = q.QuestionNo
                    where q.State=? order by q.startTime desc` ;

        this.connection.query( query , [ Id , state ] , (err,result , fields)=> {
            if(err){
                //server error 
                console.log('server error- retrievePoll| ', err.message);
            }
            else{
                
                prHandler.emit( 'done-retrievePollData' , null , result , state ,  request , response );
                return ;
            
            }
        })
    }

    singlePollRetrieve( Id , prHandler , request , response ){

        let query = `select tq.* , ta.AnswerNo , ta.Answer , ta.Ans_Count
                    from (
                        select * from Questions where QuestionNo = ?
                    ) tq
                    inner join Answers ta
                    on tq.QuestionNo = ta.QuestionNo
                    where tq.State=1` ;

        this.connection.query( query , [ Id ] , (err , result , fields )=> {
            if(err){
                // server error - need to handle
                console.log('server error-singlePollRetrieve| ', err.message);
                return ;
            }

            else{
               
                prHandler.emit( 'done-singlePollData' , null , result , request , response );
                return ;
            }

            return 
        })
    }

    _makeArray(Ln){
        let y = '(?' ;
        let ln = Ln-1;

        for(let ind=0 ; ind <= ln ; ind++){
            
            if( ind == ln){
                y += ')';
            }
            else{
                y+= ',?'
            }
        }
        return y;

    }

    increase_Ans_Count( ansArray , pHandler , request , response ){
        let qry = `update Answers
        set Ans_Count = Ans_Count + 1 
        where AnswerNo In ` + this._makeArray( ansArray.length );
      
        this.connection.query( qry , ansArray , (err,result,fields)=> {
            if(err){
                // need to handle
                console.log('server error-increase_Ans_Count| ', err.message);
                return ;
            }
            else{
                pHandler.emit('done-ansIncreased' , null , request , response );
                return ;
            }
        })
    }

    updateEndTime( data , pHandler , request , response ){
        let qry = `update Questions
                   set endTime = ?
                   where QuestionNo = ?` ;

        this.connection.query( qry , [ data.exdTime , data.Qno ] , (err,result , fields )=> {

            if(err){
                //server error 
                console.log('server error-updateTime| ', err.message);
            }

            else{
                pHandler.emit('done-extended' , null , request , response );
            }

            return ;
        })
    }


    beforeAllowVote( quesNo , prHandler , request , response ){

        let qry = `select que.Question,que.multipleChoices ,ans.AnswerNo , ans.Answer from Questions que
                    inner join Answers ans on que.QuestionNo = ans.QuestionNo
                    where que.QuestionNo = ? and que.State = 1`;

        this.connection.query( qry , [ quesNo ] , (err , result , fields)=> {
            if( err ){
                console.log('server error-beforeAllowed|' + err.message )
            }

            else{
                let er = null;

                if( result.length == 0){
                    er = 'some error' ;
                }
              
                prHandler.emit('done-validation' , er  , result  , request , response );

            }
            return ;
        })
    }


    editPage(  quesNo , prHandler , request , response  ){

        let qury = `select tqq.QuestionNo , tqq.Question , tqq.startTime , tqq.endTime , tqq.multipleChoices , ta.AnswerNo , ta.Answer  
                    from Answers ta
                    inner join (
                        select tq.* from Questions tq
                        where tq.Email In ( 
                            select tc.Email from currentSessions tc where tc.sessionId = ?
                        ) and tq.QuestionNo = ? and tq.State = 0 
                    ) tqq on tqq.QuestionNo = ta.QuestionNo order by ta.AnswerNo`;

        this.connection.query( qury , [ request.session.SessionId , quesNo ] , (err , result , fields)=>{

            if(err){
                console.log('server error | ' , err.message  )
            }
            else{
                let er = null;

                if( result.length == 0){
                    er = 'some error' ;
                }
              
                prHandler.emit('done-EditDataFetched' , er  , result  , request , response );

            }
            return ;
        })

    }

    updatePoll( quesNo , prHandler , request , response ){
        let qury = `delete from Questions tqo where tqo.QuestionNo = ?`;

        this.connection.query( qury , [ quesNo ] , (err,result , fields)=> {
             if( err ){
                 console.log('server error-updatePoll | ' + err.message )
             }
             else{
                 prHandler.emit( 'done-editSave' , null , request , response );
             }
             return ;
        })
    }


    removeCurrentPoll( Qno  , prHandler , request , response ){
        let query = `select tqI.QuestionNo from Questions tqI
                    where tqI.Email In ( select tc.Email from currentSessions tc 
                                        where tc.sessionId = ? ) 
                    and tqI.QuestionNo = ? and tqI.State = ?` ;

        this.connection.query( query , [ request.session.SessionId , Qno , request.session.state ] , (err, result , fields)=> {

            if(err){
                console.log('server error-removeCurrentPoll : ' + err.message );
            }

            else if( result.length == 0){
                let msg = 'Authorized access';
                response.end('fail again...');
                prHandler.emit('done-editSave', msg , request , response );
            }
            else{
                console.log('done...');
                this.updatePoll( result[0].QuestionNo , prHandler , request , response );
            }
            return ;
        })
    }

    changeState( Qno ,  state   ){
        let query = `update Questions set State = ? where QuestionNo = ? ` ;

        this.connection.query( query , [ state , Qno ] , ( err , result , fields )=> {

                if(err){
                    console.log('server error-changeState|' + err.message );
                }
        
        })
    }

    _addRegistered( data, rHandler , request , response ){
        let quy = `insert into RegisteredUsers values(?,?,?)` ;

        this.connection.query( quy , [ data.Username , data.Email , data.Passwd ] , (err,result, fields)=> {
                if( err ){
                    console.log('server error-_addRegistered| ' + err.message )
                }

                else{
                    rHandler.emit('done-register' , null , request , response )
                }
                return ;
        })
    }

    

    deletePendingUser( rid , data , rHandler , request , response ){
        let query = `delete from PendingUsers where PendingId=?`;

        this.connection.query( query , [ rid ] , (err,result,fields)=> {
            if(err){
                console.log('server error-' + err.message )
            }

            else if( result.affectedRows == 1 ){
                
                this._addRegistered(data, rHandler , request , response );
            }

            else{
                /// authorozied access
                let msg = 'authorozied access' ;
                rHandler.emit('done-register' , msg , request , response );
            }

            return ;
        })
    }

    addRegisteredUser( rid , rHandler , request , response ){
        let quey = `select * from PendingUsers where PendingId=?` ;

        this.connection.query( quey , [ rid ] , (err,result,fields)=> {
            if( err ){
                console.log('server error-addRegisteredUser| ' + err.message );
            }
            else if( result.length == 1){
                this.deletePendingUser( rid , result[0]  , rHandler , request , response );
            }

            else{
                 /// authorozied access
                 let msg = 'authorozied access';
                 rHandler.emit('done-register' , msg , request , response );
            }

            return ;
        });
    }



}

module.exports = { Connection_DB }