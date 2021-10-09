const  mysql = require('mysql2');

class connectionDB{

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

        this.regTags = { name: 'Uname' , email:'Uemail' , password:'Upassword' }
        this.logInTags = { email:'MYmail' , password:'MYpasswd'}

    }

    isAuthUser( mail , passwd , EventEmitter){

        let query1 = `delete from currentsessions where Email=?` ;

        let query2 = `select * from registeredusers where Email=? and Passwd=?`;

        this.connection.query( query1 , [ mail ] , ( err , result,fields ) => {
            
                
            this.connection.query( query2 , [ mail , passwd ] , (err,result,fields) => {
                 

                    if(err){
                        EventEmitter.emit('deny');
                        return ;
                    }

                    if( result.length ){

                            EventEmitter.emit('allow');
                            return ;
                    }

                    EventEmitter.emit('deny');
                    return ;

            })

        })
    }

    
    checkEmail( mail , EventEmitter ){
        
        let query = `select Email from registeredusers where Email = ?`
        this.connection.query( query , [ mail ] , (err,result,fields) => {
            
            if(err){
                
                EventEmitter.emit('deny');
                return ;
            }

            if( result.length ){
                EventEmitter.emit('deny');
                return ;
            }
            
            EventEmitter.emit( 'allow' );
            return ;
        
        })
    }

    addCurrentUser( Id , mail , EventEmitter ){

        let query = `insert into currentsessions values ( ? , ? , ? )` ;

        let ref = new Date('2021-10-01T00:00:00')  ;
        let start = Math.floor( ( Date.now() - ref )/( 60000 ) );

        this.connection.query( query , [ Id , mail , start  ] , (err,result,fields) => {
                console.log('Added to current session');
                EventEmitter.emit('added');
        });
    } 

    removeCurrentUser(Id){
        let query  = `delete from currentsessions where sessionId = ? ` ;

        this.connection.query( query , [ Id ] , (err,result,fields) => { 

                console.log('session end...');
        })
    }

    addPoll( Id , quesNo , data , emitter ){

        let ques = data.ques ;
        let answerArray = data.ans ;
        let settings  = data.settings ;
        let cnt  = 0 , state = 0;    // not started
        let query1 = `select email from currentsessions where sessionId = ?` ;
        let query2 = `insert into questions values( ?,?,?,?,?,?,? )` ;
        let query3 = `insert into answers values( ?,?,? )` ;

    
        // time to nearest minutes
        let ref = new Date('2021-10-01T00:00:00')  // take as reference
        let nowTime = Math.floor( ( Date.now() - ref.getTime() ) / 60000 ) ;
    
        if( settings.startTime <= nowTime ) {
            state = 1; // ongoing
        }
        

        this.connection.query( query1 , [ Id ] , (err,result,fields) => {
          
                if( err ){
                    emitter.emit('error');
                    return ;
                }

                let mail = result[0].email ;
             
                this.connection.query( query2 , [ quesNo , ques , mail , settings.startTime , settings.endTime , settings.multipleChoicesAllow , state ] , (err,result,fields)=> {

                    if( err ){
                         emitter.emit('error');
                         return ;
                    }

                    for(let eachAns of answerArray) {

                        this.connection.query( query3 , [ eachAns , quesNo , 0 ] , (err,result,fields)=> {

                            if( err ){
                                 emitter.emit('error');
                            }
                            cnt++ ;
                            console.log( `DONE:: ${eachAns} ${cnt}`);

                            if(cnt == answerArray.length ){
                                console.log('poll add to db')
                                emitter.emit('done');
                            }
                            
                        })
                        
                    }

                })

        });
    }


    _prepareResult( MYresult ){

        let preQuestionNo = 0 , temp   , container =[] , final = [];
       for( let ech of MYresult ){
           if( preQuestionNo == ech.QuestionNo ){
               container.push( {  "Answer:":ech.Answer , "Ans_Count": ech.Ans_Count } );
           }
    
           else{
               if( preQuestionNo != 0 ){
                   temp['answer'] = container ;
                   final.push( temp ) ;
                   container = [] ; temp = {}  ;
                   console.log('push done..') ;
               }
               temp = { 
                   "QuestionNo" :ech.QuestionNo , 
                   "Question" : ech.Question , 
                   "startTime" : ech.startTime , 
                   "endTime": ech.endTime 
               };
    
               container.push( {  "Answer:":ech.Answer , "Ans_Count": ech.Ans_Count } );
               preQuestionNo = ech.QuestionNo ;
               console.log( preQuestionNo );
           }
    
       }
    
       if(preQuestionNo !=0 ){
           temp['answer'] = container ;
           final.push( temp );
           
           console.log('another push done');
       }
    
       return final ;
    
    }

    bringDataToShow( Id , EventEmitter ){
      
        let query1 = `select email from currentsessions where sessionId = ?` ;

        let query2 =    `select * from questions q 
                        inner join answers a
                        on q.QuestionNo = a.QuestionNo
                        where q.State != 2 and q.Email = ?
                        order by q.QuestionNo`;

        
        this.connection.query( query1 , [ Id ] , (err,result,field) => {
          
            if( err || result.length == 0 ){
                console.log('no such a mail exist..');
                EventEmitter.emit('pageNOTfound');
                return ;
            }

            if( result.length >= 2 ){
                EventEmitter.emit('pageNOTfound', 'Unexpected error Occuried');
                return 
            }
            
            let mail = result[0].email ;

          
            this.connection.query( query2 , [ mail ] , (err , result , field )=> {
                if( err ){
                    EventEmitter.emit('pageNOTfound');
                }
            
                let output = this._prepareResult( result ); 
                EventEmitter.emit('pgReady' , output );
                return ;
    
            });

        })
                        
    }


}


module.exports = { connectionDB }