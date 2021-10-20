// dependencies 
const  mysql = require('mysql2');

// custom modules
const { timeNow }  = require('./base');

class Connection_DB{

    constructor(){
        this.connection = mysql.createPool( {

            host:'localhost',
            user:'root',
            port:3306,
            password:'NSsql159##',
            database:'pollappusers',
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
        
        let query = `select Email from registeredusers where Email = ?` ;
        this.connection.query( query , [ mail ] , (err,result,fields) => {
            
            if(err){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-checkEmail')
                return ;
            }

            else if(result.length ){

                let msg = 'Email already exist' ;
                rHandler.emit('done-reg' , msg , request , response );
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
        let query = `UPDATE pendingusers 
        SET username=? , passwd=? , registeredTime=? WHERE  email = ?` ;
        let now = timeNow() ;
        this.connection.query( query , [ data[ this.reg.name ] , data[ this.reg.password ] , now , data[ this.reg.email] ] , (err,result,fields)=> {

            if(err){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-__updateFields')
                return ;
            }

            else{
                console.log('update pending tb');
                handler.emit('done-reg' , null , request , response ) ;
                return ;
            }
        });
    }

    _addPendingUser( data , handler , request , response ){
        let query = `insert into pendingusers values( ?,?,?,? )` ;
        let now = timeNow() ;

        this.connection.query( query , [data[ this.reg.name ] , data[ this.reg.email ] , data[ this.reg.password ] , now ] , (err,result,fields) => {

            if( err ){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-_addPendingUser')
                return ;
            }

            else{
                handler.emit('done-reg' , null , request , response );
                console.log('insert into pending tb');
                return ;
            }

        }) ;
}

    addPendingUser( data , rHandler , request , response  ){
        let query1 = `select Email from pendingusers where Email = ?` ;

        this.connection.query( query1 , [ data[ this.reg.email ] ] , (err,result,fields)=> {

            if( err ){
                // here system has some error --> need to fix
                // redirect to a safe place
                console.log('!! server error-addPendingUser')
                return ;

            }

            else if(result.length >= 2){

                let msg = 'duplicate fields are appeared' ;
                rHandler.emit('done-reg' , msg , request , response );
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
        
        let query = `insert into currentsessions values ( ? , ? , ? )` ;
        let now = timeNow();

        this.connection.query( query , [ request.session.SessionId  , data[ this.log.email ]  , now  ] , (err,result,fields) => {
                if(err){
                    // redirect to server error page
                    console.log('!! server error-__addCurrentUser, ' , request.session.SessionId );
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
        let query = `delete from currentsessions where Email=?` ;

        this.connection.query( query , data[ this.log.email ] , (err,result,fields)=> {

            if( err ){
                console.log('!! server error-_removeExistingUsers');
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
        let query = `select Email from registeredusers where Email=? and Passwd=?`;

        this.connection.query( query , [ data[ this.log.email ] , data[ this.log.password ] ],  (err,result,fields)=> {
           
            if(err || result.length >= 2){
                //server error - need to handle
                console.log('!! server error-checkCredentials');
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
        let query = `insert into answers
                     values(?,?,?)` ;
        let len = data.length ;
        let cnt = 0;
        for( let ans of data){
            
            this.connection.query( query , [ans, Qno, 0] , (err,result,fields)=> {
                if(err){
                    //server error
                    console.log('server error-_addAnswers')
                }
                else{
                    console.log(`${ ans } : ${Qno}`)
                    cnt++ ;
                }
  
                if( len == cnt){
                    console.log(`poll added completed : ${ Qno }`)
                    pHandler.emit('done-addpoll' , null , request , response );
                    return ;
                }

            });
        }

        return ;
    }


    addPoll( data , pHandler , request , response ){
        let query = `insert into questions 
                    values(?,?,?,?,?,?,?)` ;

        this.connection.query(query,[ data[this.pollc.Qno] , data[this.pollc.Ques] , data[this.pollc.email]  , data[this.pollc.stTime] ,
                                      data[this.pollc.eTime] , data[this.pollc.multi], data[this.pollc.st ] ] , (err,result,fields)=> {

                if( err ){
                    // server error
                    console.log('!! server error-addPoll');
                    return ;
                }

                else{
                    this._addAnswers(data.Answers , data[this.pollc.Qno]  , pHandler , request , response);
                    return ;
                }

         });
         return ;
    }


    removeLoggedUser( Id , lHandler , request , response ){
        let query = `delete from currentsessions where sessionId = ? ` ;

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

}

module.exports = { Connection_DB }